#!/usr/bin/env node
// Renders the home + archive pages of all four framework variants
// (astro/react-router/tanstack/kudzu) with Playwright, then pixel-diffs
// react-router/tanstack/kudzu against astro (the baseline) to catch visual
// parity regressions — the four variants render the exact same Notion
// content through different frameworks, so a large diff usually means a
// framework port introduced a real visual bug rather than a content change.
//
// Usage:
//   node ./scripts/visual-diff.mjs             # assembles site/ from the
//                                               # four build outputs first
//   node ./scripts/visual-diff.mjs --site dir  # reuse an already-assembled
//                                               # Pages artifact directory
//
// Assumes `pnpm run build:all` has already produced apps/*/dist (or
// build/client) — this script does not build the apps itself.
//
// Deps: playwright, pixelmatch, pngjs (see package.json devDependencies).
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";
import {
  createReadStream,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { appendFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const visualDiffDir = path.join(repoRoot, "visual-diff");

// Must match the `base`/`basename`/`BASE` baked into each variant's build
// config (apps/web/astro.config.mjs, apps/react-router/{react-router,vite}.config.ts,
// apps/tanstack-router/vite.config.ts, apps/kudzu/kudzu.config.mjs) — this is
// the GitHub Pages repo-name prefix every variant's routes are generated under.
const BASE_PATH = "/ones-to-watch-refactor-test";

const PAGES = [
  { key: "home", label: "Home" },
  { key: "archive", label: "Archive (news/list/1)" },
];

// astro is intentionally listed first: it is BASELINE_VARIANT below, and the
// remaining three are compared against it in this same order.
const VARIANTS = [
  {
    key: "astro",
    label: "Astro",
    // Astro's `/` redirects to `/home` (see astro.config.mjs `redirects`);
    // screenshot the redirect target directly instead of following it.
    paths: { home: "/astro/home", archive: "/astro/news/list/1" },
  },
  {
    key: "react-router",
    label: "React Router",
    paths: { home: "/react-router/", archive: "/react-router/news/list/1" },
  },
  {
    key: "tanstack",
    label: "TanStack",
    paths: { home: "/tanstack/", archive: "/tanstack/news/list/1" },
  },
  {
    key: "kudzu",
    label: "Kudzu",
    paths: { home: "/kudzu/", archive: "/kudzu/news/list/1" },
  },
];

const BASELINE_VARIANT = "astro";
const PIXELMATCH_THRESHOLD = 0.2;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".wasm": "application/wasm",
  ".webmanifest": "application/manifest+json",
};

function parseArgs(argv) {
  const args = { site: null, port: 0 };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--site") {
      args.site = argv[++i];
    } else if (argv[i] === "--port") {
      args.port = Number(argv[++i]);
    }
  }
  return args;
}

/**
 * Rebuild site/ from the four variant build outputs, replicating the
 * "Assemble Pages artifact" step in .github/workflows/deploy.yml exactly
 * (including the react-router two-step merge + cleanup) via node:fs instead
 * of shell `cp -R`.
 */
function assembleSite(siteDir) {
  const distSources = {
    astro: path.join(repoRoot, "apps/web/dist"),
    reactRouterClient: path.join(repoRoot, "apps/react-router/build/client"),
    tanstack: path.join(repoRoot, "apps/tanstack-router/dist/client"),
    kudzu: path.join(repoRoot, "apps/kudzu/dist"),
  };
  const landingDir = path.join(repoRoot, "landing");

  for (const [name, dir] of Object.entries({ ...distSources, landing: landingDir })) {
    if (!existsSync(dir)) {
      console.error(
        `visual-diff: missing build output for ${name} at ${dir}. Run \`pnpm run build:all\` first, or pass --site <already-assembled-dir>.`,
      );
      process.exit(1);
    }
  }

  rmSync(siteDir, { recursive: true, force: true });
  mkdirSync(siteDir, { recursive: true });

  // Root: static landing hub linking to the four framework variants.
  cpSync(landingDir, siteDir, { recursive: true });

  mkdirSync(path.join(siteDir, "astro"), { recursive: true });
  cpSync(distSources.astro, path.join(siteDir, "astro"), { recursive: true });

  // react-router emits HTML under its basename inside build/client; merge
  // assets (root) + pages (base-prefixed dir) into site/react-router, then
  // drop the now-redundant nested basename tree — same two-step copy +
  // cleanup as deploy.yml.
  const reactRouterDir = path.join(siteDir, "react-router");
  mkdirSync(reactRouterDir, { recursive: true });
  cpSync(distSources.reactRouterClient, reactRouterDir, { recursive: true });
  cpSync(
    path.join(distSources.reactRouterClient, "ones-to-watch-refactor-test", "react-router"),
    reactRouterDir,
    { recursive: true },
  );
  rmSync(path.join(reactRouterDir, "ones-to-watch-refactor-test"), { recursive: true, force: true });

  mkdirSync(path.join(siteDir, "tanstack"), { recursive: true });
  cpSync(distSources.tanstack, path.join(siteDir, "tanstack"), { recursive: true });

  mkdirSync(path.join(siteDir, "kudzu"), { recursive: true });
  cpSync(distSources.kudzu, path.join(siteDir, "kudzu"), { recursive: true });

  console.log(`visual-diff: assembled site at ${siteDir}`);
  return siteDir;
}

/** Resolve a filesystem path to a servable file: itself, its index.html (if a
 * directory), or a `${path}.html` sibling (covers flat non-directory output). */
function resolveStaticFile(absPath) {
  if (existsSync(absPath)) {
    const st = statSync(absPath);
    if (st.isFile()) return absPath;
    if (st.isDirectory()) {
      const indexPath = path.join(absPath, "index.html");
      return existsSync(indexPath) ? indexPath : null;
    }
  }
  const htmlPath = `${absPath}.html`;
  return existsSync(htmlPath) ? htmlPath : null;
}

/**
 * Minimal static file server reproducing the GitHub Pages URL structure:
 * everything is served under the `/ones-to-watch-refactor-test/` prefix
 * (stripped before resolving against `siteDir`), directories fall back to
 * index.html, and anything unresolved is a 404.
 */
function startServer(siteDir, port) {
  const server = createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const isUnderBase = pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
      if (!isUnderBase) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Not found (outside ${BASE_PATH} base path)`);
        return;
      }

      let rest = pathname.slice(BASE_PATH.length);
      if (rest === "") rest = "/";
      const absPath = path.join(siteDir, path.normalize(rest));
      if (!absPath.startsWith(siteDir)) {
        res.writeHead(403, { "content-type": "text/plain; charset=utf-8" });
        res.end("Forbidden");
        return;
      }

      const resolved = resolveStaticFile(absPath);
      if (!resolved) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      const ext = path.extname(resolved).toLowerCase();
      res.writeHead(200, { "content-type": MIME_TYPES[ext] ?? "application/octet-stream" });
      createReadStream(resolved).pipe(res);
    } catch (err) {
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Internal error: ${err.message}`);
    }
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/**
 * Abort every request that doesn't target our own static server. This makes
 * screenshots deterministic (no network flakiness from font CDNs, kit.com,
 * Google Analytics, etc.) at the cost of web fonts falling back to system
 * fonts. That's a fair trade for cross-framework comparison specifically
 * because all four variants lose the exact same external assets and fall
 * back the same way — none is put at a disadvantage relative to astro.
 */
async function blockExternalRequests(page, serverOrigin) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(serverOrigin)) {
      return route.continue();
    }
    return route.abort();
  });
}

/** Wait for web fonts to finish loading (bounded — some pages may never
 * settle document.fonts.ready, so don't block screenshot capture forever). */
async function waitForFonts(page) {
  await page.evaluate(() => {
    if (!("fonts" in document)) return undefined;
    return Promise.race([
      document.fonts.ready,
      new Promise((resolve) => setTimeout(resolve, 5000)),
    ]);
  });
}

function loadPng(filePath) {
  return PNG.sync.read(readFileSync(filePath));
}

/** Copy the top-left `width`×`height` region of `png` into a new PNG, used
 * to compare a common area when two variants' screenshots differ in size. */
function cropTopLeft(png, width, height) {
  const cropped = new PNG({ width, height });
  const srcRowBytes = png.width * 4;
  const destRowBytes = width * 4;
  for (let y = 0; y < height; y++) {
    const srcStart = y * srcRowBytes;
    const destStart = y * destRowBytes;
    for (let i = 0; i < destRowBytes; i++) {
      cropped.data[destStart + i] = png.data[srcStart + i];
    }
  }
  return cropped;
}

/** Pixel-diff `candidatePath` against `baselinePath`, writing a diff PNG to
 * `diffOutPath`. Falls back to comparing only the shared top-left region
 * when dimensions differ, and reports that mismatch separately. */
function diffImages(baselinePath, candidatePath, diffOutPath) {
  const baseline = loadPng(baselinePath);
  const candidate = loadPng(candidatePath);
  const sizeMismatch = baseline.width !== candidate.width || baseline.height !== candidate.height;
  const width = Math.min(baseline.width, candidate.width);
  const height = Math.min(baseline.height, candidate.height);
  const a = sizeMismatch ? cropTopLeft(baseline, width, height) : baseline;
  const b = sizeMismatch ? cropTopLeft(candidate, width, height) : candidate;

  const diff = new PNG({ width, height });
  const diffPixels = pixelmatch(a.data, b.data, diff.data, width, height, {
    threshold: PIXELMATCH_THRESHOLD,
  });
  writeFileSync(diffOutPath, PNG.sync.write(diff));

  return {
    diffPixels,
    ratio: diffPixels / (width * height),
    sizeMismatch,
    candidateSize: { width: candidate.width, height: candidate.height },
    comparedSize: { width, height },
  };
}

function formatPercent(ratio) {
  return `${(ratio * 100).toFixed(3)}%`;
}

function buildSummaryMarkdown(pageResults) {
  const lines = ["# Visual diff summary", "", `_Baseline: astro. Generated: ${new Date().toISOString()}_`, ""];

  for (const page of pageResults) {
    lines.push(`## ${page.label}`, "");
    if (page.baselineError) {
      lines.push(`⚠️ astro baseline screenshot failed: ${page.baselineError}`, "");
      continue;
    }
    lines.push(`Baseline (astro) size: ${page.baselineSize.width}×${page.baselineSize.height}px`, "");
    lines.push("| 변형 | 크기 | Diff 픽셀 | Diff 비율 | 비고 |");
    lines.push("| --- | --- | --- | --- | --- |");
    for (const row of page.rows) {
      if (row.error) {
        lines.push(`| ${row.variant} | - | - | - | ❌ ${row.error} |`);
        continue;
      }
      const note = row.sizeMismatch
        ? `크기 불일치 (공통 영역 ${row.comparedSize.width}×${row.comparedSize.height}px만 비교)`
        : "-";
      lines.push(
        `| ${row.variant} | ${row.candidateSize.width}×${row.candidateSize.height}px | ${row.diffPixels} | ${formatPercent(row.ratio)} | ${note} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let siteDir;
  if (args.site) {
    siteDir = path.resolve(args.site);
    if (!existsSync(siteDir)) {
      console.error(`visual-diff: --site directory not found: ${siteDir}`);
      process.exit(1);
    }
  } else {
    siteDir = assembleSite(path.join(repoRoot, "site"));
  }

  rmSync(visualDiffDir, { recursive: true, force: true });
  const screenshotsDir = path.join(visualDiffDir, "screenshots");
  const diffsDir = path.join(visualDiffDir, "diffs");
  for (const variant of VARIANTS) {
    mkdirSync(path.join(screenshotsDir, variant.key), { recursive: true });
    if (variant.key !== BASELINE_VARIANT) {
      mkdirSync(path.join(diffsDir, variant.key), { recursive: true });
    }
  }

  const server = await startServer(siteDir, args.port);
  const { port } = server.address();
  const serverOrigin = `http://127.0.0.1:${port}`;
  console.log(`visual-diff: serving ${siteDir} at ${serverOrigin}${BASE_PATH}/`);

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });

  const failures = [];
  const shots = {};

  try {
    for (const variant of VARIANTS) {
      shots[variant.key] = {};
      for (const page of PAGES) {
        const url = `${serverOrigin}${BASE_PATH}${variant.paths[page.key]}`;
        const outPath = path.join(screenshotsDir, variant.key, `${page.key}.png`);
        const tabPage = await context.newPage();
        try {
          await blockExternalRequests(tabPage, serverOrigin);
          // colorScheme is also set at context level; emulateMedia
          // reinforces it per-page and pins reduced-motion for animation
          // stability before every screenshot.
          await tabPage.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
          await tabPage.goto(url, { waitUntil: "load", timeout: 30_000 });
          await tabPage.waitForLoadState("networkidle", { timeout: 15_000 });
          await waitForFonts(tabPage);
          await tabPage.screenshot({ path: outPath, fullPage: true });
          shots[variant.key][page.key] = { path: outPath, error: null };
          console.log(`visual-diff: captured ${variant.key}/${page.key}`);
        } catch (err) {
          shots[variant.key][page.key] = { path: null, error: err.message };
          failures.push(`${variant.key}/${page.key}: ${err.message}`);
          console.error(`visual-diff: FAILED ${variant.key}/${page.key}: ${err.message}`);
        } finally {
          await tabPage.close();
        }
      }
    }
  } finally {
    await context.close();
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }

  const pageResults = [];
  for (const page of PAGES) {
    const baseline = shots[BASELINE_VARIANT][page.key];
    const result = {
      label: page.label,
      baselineError: baseline.error,
      baselineSize: null,
      rows: [],
    };
    if (!baseline.error) {
      const baselinePng = loadPng(baseline.path);
      result.baselineSize = { width: baselinePng.width, height: baselinePng.height };
    }

    for (const variant of VARIANTS) {
      if (variant.key === BASELINE_VARIANT) continue;
      const shot = shots[variant.key][page.key];
      if (baseline.error) {
        result.rows.push({ variant: variant.label, error: "astro baseline screenshot failed" });
        continue;
      }
      if (shot.error) {
        result.rows.push({ variant: variant.label, error: shot.error });
        continue;
      }
      const diffOutPath = path.join(diffsDir, variant.key, `${page.key}.png`);
      const diff = diffImages(baseline.path, shot.path, diffOutPath);
      result.rows.push({ variant: variant.label, ...diff });
    }
    pageResults.push(result);
  }

  const summaryMd = buildSummaryMarkdown(pageResults);
  console.log(summaryMd);
  await writeFile(path.join(visualDiffDir, "summary.md"), summaryMd);
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `\n${summaryMd}\n`);
  }

  // Diff ratios are informational only (cross-framework rendering always has
  // minor differences) — only a screenshot capture failure fails the build.
  if (failures.length > 0) {
    console.error(`visual-diff: ${failures.length} screenshot(s) failed:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exit(1);
  }
}

await main();
