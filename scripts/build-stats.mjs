#!/usr/bin/env node
// Measures clean-build wall-clock time and static output size for each of
// the four framework variants (astro/react-router/tanstack/kudzu), then
// rewrites the `<!-- build-stats:start -->` … `<!-- build-stats:end -->`
// section of the root README with a markdown table. Runs in CI
// (see .github/workflows/*) and locally via `pnpm run build:stats`.
//
// Pure Node — no external dependencies.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const readmePath = path.join(repoRoot, "README.md");
const startMarker = "<!-- build-stats:start -->";
const endMarker = "<!-- build-stats:end -->";

const skipBuild = process.argv.includes("--skip-build");

// Package that both react-router and tanstack (and kudzu) build against;
// built once up front and excluded from the measured table.
const contentPackage = "@otw/notion-content";

const variants = [
  { label: "Astro", pkg: "@otw/web", outDir: path.join(repoRoot, "apps/web/dist") },
  {
    label: "React Router",
    pkg: "@otw/web-react-router",
    outDir: path.join(repoRoot, "apps/react-router/build/client"),
  },
  {
    label: "TanStack",
    pkg: "@otw/web-tanstack",
    outDir: path.join(repoRoot, "apps/tanstack-router/dist/client"),
  },
  { label: "Kudzu", pkg: "@otw/web-kudzu", outDir: path.join(repoRoot, "apps/kudzu/dist") },
];

/** Recursively walk a directory, returning { totalBytes, jsBytes, fileCount }. */
function collectDirStats(dir) {
  const stats = { totalBytes: 0, jsBytes: 0, fileCount: 0 };
  if (!existsSync(dir)) return stats;

  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }
      if (!entry.isFile()) continue;
      const size = statSync(entryPath).size;
      stats.totalBytes += size;
      stats.fileCount += 1;
      if (entry.name.endsWith(".js") || entry.name.endsWith(".mjs")) {
        stats.jsBytes += size;
      }
    }
  }
  return stats;
}

/** Auto-format a byte count as B / KB / MB. */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Run `pnpm --filter <pkg> build`, inheriting stdio and env. Returns true on success. */
function runBuild(pkg) {
  const result = spawnSync("pnpm", ["--filter", pkg, "build"], {
    cwd: repoRoot,
    stdio: "inherit",
    env: process.env,
  });
  return result.status === 0;
}

async function main() {
  let anyFailure = false;
  const rows = [];

  if (!skipBuild) {
    console.log(`build-stats: building ${contentPackage} (prerequisite, not measured)`);
    const contentOk = runBuild(contentPackage);
    if (!contentOk) {
      console.error(`build-stats: ${contentPackage} build failed; downstream builds will likely fail too`);
    }
  }

  for (const variant of variants) {
    if (skipBuild) {
      const stats = collectDirStats(variant.outDir);
      rows.push({ variant, ok: true, seconds: null, stats });
      continue;
    }

    // Clean output directory to guarantee a fresh build.
    rmSync(variant.outDir, { recursive: true, force: true });

    console.log(`build-stats: building ${variant.pkg}`);
    const start = process.hrtime.bigint();
    const ok = runBuild(variant.pkg);
    const seconds = Number(process.hrtime.bigint() - start) / 1e9;

    if (!ok) {
      anyFailure = true;
      rows.push({ variant, ok: false, seconds, stats: null });
      continue;
    }
    const stats = collectDirStats(variant.outDir);
    rows.push({ variant, ok: true, seconds, stats });
  }

  const header = "| 변형 | 빌드 시간(s) | 총 출력 크기 | JS 크기 | 파일 수 |";
  const divider = "| --- | --- | --- | --- | --- |";
  const tableRows = rows.map(({ variant, ok, seconds, stats }) => {
    if (!ok) {
      const time = seconds === null ? "-" : seconds.toFixed(1);
      return `| ${variant.label} | ${time} | ❌ | ❌ | ❌ |`;
    }
    const time = seconds === null ? "-" : seconds.toFixed(1);
    return `| ${variant.label} | ${time} | ${formatBytes(stats.totalBytes)} | ${formatBytes(stats.jsBytes)} | ${stats.fileCount} |`;
  });

  const measuredAt = new Date().toISOString();
  const footnote = `_GitHub Actions ubuntu-latest에서 측정, 콘텐츠 양에 따라 변동. 측정 시각: ${measuredAt}_`;

  const table = [header, divider, ...tableRows, "", footnote].join("\n");

  const readme = await readFile(readmePath, "utf8");
  const startIndex = readme.indexOf(startMarker);
  const endIndex = readme.indexOf(endMarker);
  if (startIndex === -1 || endIndex === -1) {
    console.error(
      `build-stats: could not find "${startMarker}" / "${endMarker}" markers in README.md. Add them before running this script.`,
    );
    process.exit(1);
  }

  const before = readme.slice(0, startIndex + startMarker.length);
  const after = readme.slice(endIndex);
  const nextReadme = `${before}\n${table}\n${after}`;
  await writeFile(readmePath, nextReadme);

  console.log(`build-stats: README.md updated (${measuredAt})`);
  if (anyFailure) {
    console.error("build-stats: one or more builds failed");
    process.exit(1);
  }
}

await main();
