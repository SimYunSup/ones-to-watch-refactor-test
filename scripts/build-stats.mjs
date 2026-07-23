#!/usr/bin/env node
// Measures clean-build wall-clock time and static output size for each of
// the ten framework variants, labelling every row with the framework's
// installed version, then rewrites the `<!-- build-stats:start -->` …
// `<!-- build-stats:end -->` section of the root README with a markdown
// table. Run locally via `pnpm run build:stats`.
//
// Pure Node — no external dependencies.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
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

// `kind` classifies each variant for the README table: "SSG 특화" = the tool
// exists to emit static sites; "SSG 지원" = a general app framework that can
// also export statically. Korean/English kept together so the bilingual
// README columns stay in sync from one source.
const SSG_FOCUSED = { ko: "SSG 특화", en: "SSG-focused" };
const SSG_CAPABLE = { ko: "SSG 지원", en: "SSG-capable" };

// Reads the installed version of `dep` as resolved for the app at `appDir`
// (its own node_modules first, then the workspace root), so the table pins
// the exact framework version each variant actually built with — not the
// package.json range. Returns null if it can't be resolved.
function versionOf(appDir, dep) {
  const candidates = [
    path.join(repoRoot, appDir, "node_modules", dep, "package.json"),
    path.join(repoRoot, "node_modules", dep, "package.json"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, "utf8")).version;
      } catch {
        // fall through to next candidate
      }
    }
  }
  return null;
}

// `versionDep` is the framework npm package whose installed version labels the
// row (e.g. "Astro 7.0.2"); `appDir` locates its install.
const variants = [
  { label: "Astro", pkg: "@otw/web", appDir: "apps/web", versionDep: "astro", outDir: path.join(repoRoot, "apps/web/dist"), kind: SSG_FOCUSED },
  {
    label: "React Router",
    pkg: "@otw/web-react-router",
    appDir: "apps/react-router",
    versionDep: "react-router",
    outDir: path.join(repoRoot, "apps/react-router/build/client"),
    kind: SSG_CAPABLE,
  },
  {
    label: "TanStack",
    pkg: "@otw/web-tanstack",
    appDir: "apps/tanstack-router",
    versionDep: "@tanstack/react-start",
    outDir: path.join(repoRoot, "apps/tanstack-router/dist/client"),
    kind: SSG_CAPABLE,
  },
  { label: "Kudzu", pkg: "@otw/web-kudzu", appDir: "apps/kudzu", versionDep: "@kudzujs/core", outDir: path.join(repoRoot, "apps/kudzu/dist"), kind: SSG_FOCUSED },
  { label: "Hugo", pkg: "@otw/web-hugo", appDir: "apps/hugo", versionDep: "hugo-bin", outDir: path.join(repoRoot, "apps/hugo/public"), kind: SSG_FOCUSED },
  {
    label: "VitePress",
    pkg: "@otw/web-vitepress",
    appDir: "apps/vitepress",
    versionDep: "vitepress",
    outDir: path.join(repoRoot, "apps/vitepress/.vitepress/dist"),
    kind: SSG_FOCUSED,
  },
  {
    label: "Docusaurus",
    pkg: "@otw/web-docusaurus",
    appDir: "apps/docusaurus",
    versionDep: "@docusaurus/core",
    outDir: path.join(repoRoot, "apps/docusaurus/build"),
    kind: SSG_FOCUSED,
  },
  {
    label: "Eleventy",
    pkg: "@otw/web-eleventy",
    appDir: "apps/eleventy",
    versionDep: "@11ty/eleventy",
    outDir: path.join(repoRoot, "apps/eleventy/_site"),
    kind: SSG_FOCUSED,
  },
  {
    label: "Next.js App Router",
    pkg: "@otw/web-next-app",
    appDir: "apps/next-app",
    versionDep: "next",
    outDir: path.join(repoRoot, "apps/next-app/out"),
    kind: SSG_CAPABLE,
  },
  {
    label: "Next.js Pages Router",
    pkg: "@otw/web-next-pages",
    appDir: "apps/next-pages",
    versionDep: "next",
    outDir: path.join(repoRoot, "apps/next-pages/out"),
    kind: SSG_CAPABLE,
  },
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

  const header =
    "| 변형 (Variant) | 특징 (Type) | 빌드 시간(s) (Build) | 총 출력 크기 (Total) | JS 크기 (JS) | 파일 수 (Files) |";
  const divider = "| --- | --- | --- | --- | --- | --- |";
  const tableRows = rows.map(({ variant, ok, seconds, stats }) => {
    const version = versionOf(variant.appDir, variant.versionDep);
    const name = version ? `${variant.label} ${version}` : variant.label;
    const kind = `${variant.kind.ko} / ${variant.kind.en}`;
    const time = seconds === null ? "-" : seconds.toFixed(1);
    if (!ok) {
      return `| ${name} | ${kind} | ${time} | ❌ | ❌ | ❌ |`;
    }
    return `| ${name} | ${kind} | ${time} | ${formatBytes(stats.totalBytes)} | ${formatBytes(stats.jsBytes)} | ${stats.fileCount} |`;
  });

  const measuredAt = new Date().toISOString();
  const footnote = `_로컬에서 \`pnpm run build:stats\`로 측정(수동 갱신), 콘텐츠 양·머신에 따라 변동. (Measured locally via \`pnpm run build:stats\`; varies with content volume and machine.) 측정 시각(Measured at): ${measuredAt}_`;

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
