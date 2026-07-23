#!/usr/bin/env node
// Local-only performance bench for the four framework variants
// (astro/react-router/tanstack/kudzu): Lighthouse (desktop, performance
// category) on the home + archive pages, plus a routing (home -> archive
// client navigation) timing measured with Playwright. NOT wired into CI —
// run it locally after `pnpm run build:all`.
//
// Usage:
//   node ./scripts/perf-bench.mjs                # assembles site/ from the
//                                                 # four build outputs first
//   node ./scripts/perf-bench.mjs --site dir     # reuse an already-assembled
//                                                 # Pages artifact directory
//   node ./scripts/perf-bench.mjs --runs 5       # repeat each measurement
//                                                 # N times, report the
//                                                 # median (default 3)
//   node ./scripts/perf-bench.mjs --offline      # block every request that
//                                                 # doesn't target our local
//                                                 # static server — use this
//                                                 # when external resources
//                                                 # (fonts/analytics/embeds)
//                                                 # would otherwise time out
//                                                 # and skew results
//
// Assumes `pnpm run build:all` has already produced apps/*/dist (or
// build/client) — this script does not build the apps itself.
//
// Deps: lighthouse, playwright (see package.json devDependencies). Reuses
// playwright's bundled Chromium binary for both Lighthouse (connected over
// its remote-debugging port) and the routing measurement (launched normally)
// instead of pulling in chrome-launcher.
import lighthouse, { desktopConfig } from "lighthouse";
import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { createServer as createNetServer } from "node:net";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assembleSite, blockExternalRequests, BASE_PATH, startServer, VARIANTS } from "./lib/site-server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const benchDir = path.join(repoRoot, "bench");

const PAGES = [
  { key: "home", label: "Home" },
  { key: "archive", label: "Archive (news/list/1)" },
];

const DEFAULT_RUNS = 3;

function parseArgs(argv) {
  const args = { site: null, port: 0, runs: DEFAULT_RUNS, offline: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--site") {
      args.site = argv[++i];
    } else if (argv[i] === "--port") {
      args.port = Number(argv[++i]);
    } else if (argv[i] === "--runs") {
      args.runs = Number(argv[++i]);
    } else if (argv[i] === "--offline") {
      args.offline = true;
    }
  }
  if (!Number.isInteger(args.runs) || args.runs < 1) {
    console.error("perf-bench: --runs must be a positive integer");
    process.exit(1);
  }
  return args;
}

/** Grab an OS-assigned free TCP port by binding to port 0 and closing right away. */
function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = createNetServer();
    srv.once("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

/** Poll Chrome's DevTools HTTP endpoint until the remote-debugging port accepts connections. */
async function waitForDebugPort(port, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (res.ok) return;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(
    `chromium debug port ${port} not ready after ${timeoutMs}ms${lastError ? `: ${lastError.message}` : ""}`,
  );
}

/**
 * Launch playwright's bundled Chromium as a standalone process with a
 * remote-debugging port open, the way Lighthouse's node docs recommend
 * connecting to an already-running browser (`{port}` flag, no `page` arg —
 * Lighthouse then owns tab lifecycle itself via its own puppeteer-core
 * connection). `--offline` maps every hostname to an unroutable address so
 * external requests fail fast instead of hanging; our own server is
 * addressed by IP literal (127.0.0.1) so it's unaffected.
 */
async function launchLighthouseChrome(offline) {
  const executablePath = chromium.executablePath();
  const port = await getFreePort();
  const args = [
    `--remote-debugging-port=${port}`,
    // Chrome 111+ validates the Origin header on CDP websocket connections;
    // puppeteer-core (which Lighthouse uses under the hood) connects from a
    // plain Node process with no Origin header, but pinning this explicitly
    // avoids relying on that omission across Chrome versions.
    "--remote-allow-origins=*",
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--disable-extensions",
  ];
  if (offline) args.push("--host-resolver-rules=MAP * 0.0.0.0");

  const proc = spawn(executablePath, args, { stdio: ["ignore", "ignore", "pipe"] });
  let stderrTail = "";
  proc.stderr.on("data", (chunk) => {
    stderrTail = (stderrTail + chunk.toString()).slice(-4000);
  });

  try {
    await waitForDebugPort(port);
  } catch (err) {
    proc.kill("SIGKILL");
    throw new Error(`${err.message}${stderrTail ? `\nchromium stderr (tail):\n${stderrTail}` : ""}`);
  }

  return { proc, port };
}

/** Run Lighthouse (desktop, performance-only) against `url` `runs` times over
 * the shared debugging-port Chrome, returning per-metric medians. A single
 * run failing doesn't abort the cell — only reported as `ok: false` once
 * every run has failed. */
async function measureLighthouseCell(url, port, runs) {
  const samples = { score: [], fcp: [], lcp: [], tbt: [], cls: [], si: [], transferBytes: [], bootupTime: [] };
  let lastError = null;

  for (let i = 0; i < runs; i++) {
    try {
      const flags = { logLevel: "error", output: "json", onlyCategories: ["performance"], port };
      const runnerResult = await lighthouse(url, flags, desktopConfig);
      if (!runnerResult) throw new Error("lighthouse returned no result (page load likely failed)");
      const { lhr } = runnerResult;
      const auditValue = (id) => lhr.audits[id]?.numericValue ?? null;

      samples.score.push(
        lhr.categories.performance?.score != null ? lhr.categories.performance.score * 100 : null,
      );
      samples.fcp.push(auditValue("first-contentful-paint"));
      samples.lcp.push(auditValue("largest-contentful-paint"));
      samples.tbt.push(auditValue("total-blocking-time"));
      samples.cls.push(auditValue("cumulative-layout-shift"));
      samples.si.push(auditValue("speed-index"));
      samples.transferBytes.push(auditValue("total-byte-weight"));
      samples.bootupTime.push(auditValue("bootup-time"));
    } catch (err) {
      lastError = err;
      console.error(`perf-bench: lighthouse run ${i + 1}/${runs} failed for ${url}: ${err.message}`);
    }
  }

  const ok = samples.score.some((v) => v !== null);
  return {
    ok,
    error: ok ? null : (lastError?.message ?? "all runs failed"),
    score: median(samples.score),
    fcp: median(samples.fcp),
    lcp: median(samples.lcp),
    tbt: median(samples.tbt),
    cls: median(samples.cls),
    si: median(samples.si),
    transferBytes: median(samples.transferBytes),
    bootupTime: median(samples.bootupTime),
  };
}

/** Find the archive link on the home page. Prefers the home-page "전체 보기"
 * card link (present with the same `recent-all` class in all four variants);
 * falls back to the header's "Archive" nav link (present in
 * react-router/tanstack/kudzu, but not astro, which labels that link "News"). */
async function findArchiveLink(page) {
  const recentAll = page.locator("a.recent-all");
  if ((await recentAll.count()) > 0) return recentAll.first();
  const headerArchive = page.getByRole("link", { name: "Archive" });
  if ((await headerArchive.count()) > 0) return headerArchive.first();
  throw new Error("archive link not found (tried a.recent-all and role=link name=Archive)");
}

/**
 * Load `homeUrl`, click through to the archive page, and time the
 * transition with Node's `performance.now()` bracketing the click + the
 * archive title becoming visible (robust whether the transition turns out
 * to be a full page load or a client-side route change — a browser-side
 * `performance.now()` diff would be meaningless across a full navigation
 * since `performance.timeOrigin` resets with the new document).
 *
 * Routing mode (MPA vs SPA) is judged by planting a marker on `window`
 * right before the click and checking after the title is visible whether
 * it survived: a full page load tears down the document (and the marker
 * with it), a client-side route change doesn't.
 */
async function measureRoutingTransition(page, homeUrl) {
  await page.goto(homeUrl, { waitUntil: "load", timeout: 30_000 });

  const initialLoad = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const resourceBytes = performance
      .getEntriesByType("resource")
      .reduce((sum, entry) => sum + (entry.transferSize ?? 0), 0);
    return {
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd - nav.startTime : null,
      loadMs: nav ? nav.loadEventEnd - nav.startTime : null,
      transferBytes: (nav?.transferSize ?? 0) + resourceBytes,
    };
  });

  const archiveLink = await findArchiveLink(page);
  await page.evaluate(() => {
    window.__perfBenchNavMarker = true;
  });

  const t0 = performance.now();
  await Promise.all([
    page.waitForSelector("h1.archive-title", { state: "visible", timeout: 15_000 }),
    archiveLink.click(),
  ]);
  const t1 = performance.now();

  let survivedMarker = false;
  try {
    survivedMarker = await page.evaluate(() => window.__perfBenchNavMarker === true);
  } catch {
    // Execution context torn down mid-navigation — definitely a full load.
    survivedMarker = false;
  }

  return { transitionMs: t1 - t0, routingMode: survivedMarker ? "SPA" : "MPA", ...initialLoad };
}

/** Repeat the routing measurement `runs` times (fresh browser context per
 * run, so no HTTP-cache warmup bias) and report per-metric medians. */
async function measureRoutingForVariant(browser, homeUrl, runs, offline, serverOrigin) {
  const samples = { transitionMs: [], routingMode: [], dclMs: [], loadMs: [], transferBytes: [] };
  let lastError = null;

  for (let i = 0; i < runs; i++) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    try {
      const page = await context.newPage();
      if (offline) await blockExternalRequests(page, serverOrigin);
      const result = await measureRoutingTransition(page, homeUrl);
      samples.transitionMs.push(result.transitionMs);
      samples.routingMode.push(result.routingMode);
      samples.dclMs.push(result.domContentLoadedMs);
      samples.loadMs.push(result.loadMs);
      samples.transferBytes.push(result.transferBytes);
    } catch (err) {
      lastError = err;
      console.error(`perf-bench: routing run ${i + 1}/${runs} failed for ${homeUrl}: ${err.message}`);
    } finally {
      await context.close();
    }
  }

  const ok = samples.transitionMs.some((v) => Number.isFinite(v));
  return {
    ok,
    error: ok ? null : (lastError?.message ?? "all runs failed"),
    transitionMs: median(samples.transitionMs),
    routingMode: majorityMode(samples.routingMode),
    dclMs: median(samples.dclMs),
    loadMs: median(samples.loadMs),
    transferBytes: median(samples.transferBytes),
  };
}

function median(values) {
  const nums = values.filter((v) => v !== null && v !== undefined && Number.isFinite(v)).sort((a, b) => a - b);
  if (nums.length === 0) return null;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 === 0 ? (nums[mid - 1] + nums[mid]) / 2 : nums[mid];
}

/** Most frequent non-null value (used for the MPA/SPA verdict across runs). */
function majorityMode(values) {
  const counts = new Map();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function formatMs(ms) {
  if (ms === null || !Number.isFinite(ms)) return "-";
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatScore(score) {
  if (score === null || !Number.isFinite(score)) return "-";
  return Math.round(score).toString();
}

function formatCls(cls) {
  if (cls === null || !Number.isFinite(cls)) return "-";
  return cls.toFixed(3);
}

/** Auto-format a byte count as B / KB / MB. */
function formatBytes(bytes) {
  if (bytes === null || !Number.isFinite(bytes)) return "-";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function buildReportMarkdown(lighthouseRows, routingRows, meta) {
  const lines = [
    "# 성능 벤치 리포트",
    "",
    `_생성 시각: ${meta.generatedAt}. 셀당 ${meta.runs}회 측정 후 중앙값. 오프라인 모드(외부 도메인 차단): ${meta.offline ? "on" : "off"}._`,
    "",
    "## Lighthouse (Desktop, Performance)",
    "",
    "| 변형 | 페이지 | Score | FCP | LCP | TBT | CLS | SI | 전송량 | JS 실행시간(bootup) |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  ];

  for (const row of lighthouseRows) {
    if (!row.ok) {
      lines.push(`| ${row.variant} | ${row.page} | - | - | - | - | - | - | - | - |`);
      continue;
    }
    lines.push(
      `| ${row.variant} | ${row.page} | ${formatScore(row.score)} | ${formatMs(row.fcp)} | ${formatMs(row.lcp)} | ${formatMs(row.tbt)} | ${formatCls(row.cls)} | ${formatMs(row.si)} | ${formatBytes(row.transferBytes)} | ${formatMs(row.bootupTime)} |`,
    );
  }

  lines.push(
    "",
    "## 라우팅 (홈 → 아카이브 전환)",
    "",
    "| 변형 | 전환 시간 | 전환 방식 | DCL | Load | 전송량(초기 로드) |",
    "| --- | --- | --- | --- | --- | --- |",
  );

  for (const row of routingRows) {
    if (!row.ok) {
      lines.push(`| ${row.variant} | - | - | - | - | - |`);
      continue;
    }
    lines.push(
      `| ${row.variant} | ${formatMs(row.transitionMs)} | ${row.routingMode ?? "-"} | ${formatMs(row.dclMs)} | ${formatMs(row.loadMs)} | ${formatBytes(row.transferBytes)} |`,
    );
  }

  lines.push(
    "",
    "## 참고",
    "",
    "- 로컬 머신에서 측정한 수치이며 실행 환경(CPU/메모리/백그라운드 프로세스)에 따라 편차가 큽니다. **절대값이 아니라 변형 간 상대 비교** 용도로만 사용하세요.",
    `- 변형×페이지(Lighthouse) 및 변형(라우팅)마다 ${meta.runs}회 반복 측정 후 **중앙값**을 표에 보고합니다.`,
    "- Lighthouse는 기본적으로 외부 도메인 요청(웹폰트, 분석 스크립트 등)을 차단하지 않습니다 — 실제 사용자 조건이 측정 기준이기 때문입니다. 다만 오프라인이거나 네트워크가 불안정한 환경에서는 외부 리소스 타임아웃으로 결과가 크게 흔들릴 수 있습니다. 이런 경우 `--offline` 플래그로 외부 도메인 요청을 차단한 채(로컬 서버만 응답) 재측정하세요.",
    "- 전환 방식(MPA/SPA) 판정: 클릭 직전 `window` 전역에 마커를 심고, 아카이브 제목(`h1.archive-title`)이 보인 뒤 그 마커가 살아있으면 SPA(클라이언트 라우팅), 사라졌으면(문서가 통째로 교체된) MPA(풀 페이지 로드)로 판정합니다.",
    "- `bench/`는 매 실행마다 새로 생성되는 산출물 디렉터리입니다 — 이 스크립트는 `.gitignore`를 건드리지 않으므로, 저장소에 커밋되지 않게 하려면 별도로 `.gitignore`에 추가해야 합니다.",
    "",
  );

  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  let siteDir;
  if (args.site) {
    siteDir = path.resolve(args.site);
    if (!existsSync(siteDir)) {
      console.error(`perf-bench: --site directory not found: ${siteDir}`);
      process.exit(1);
    }
  } else {
    siteDir = assembleSite(repoRoot, path.join(repoRoot, "site"), { toolName: "perf-bench" });
  }

  rmSync(benchDir, { recursive: true, force: true });
  mkdirSync(benchDir, { recursive: true });

  const server = await startServer(siteDir, args.port);
  const { port: staticPort } = server.address();
  const serverOrigin = `http://127.0.0.1:${staticPort}`;
  console.log(
    `perf-bench: serving ${siteDir} at ${serverOrigin}${BASE_PATH}/ (runs=${args.runs}, offline=${args.offline})`,
  );

  let lhChrome = null;
  let browser = null;
  const lighthouseRows = [];
  const routingRows = [];

  try {
    lhChrome = await launchLighthouseChrome(args.offline);
    browser = await chromium.launch();

    for (const variant of VARIANTS) {
      for (const page of PAGES) {
        const url = `${serverOrigin}${BASE_PATH}${variant.paths[page.key]}`;
        console.log(`perf-bench: lighthouse ${variant.key}/${page.key} (${args.runs} runs)`);
        const cell = await measureLighthouseCell(url, lhChrome.port, args.runs);
        lighthouseRows.push({ variant: variant.label, page: page.label, ...cell });
        if (!cell.ok) {
          console.error(`perf-bench: lighthouse FAILED for ${variant.key}/${page.key}: ${cell.error}`);
        }
      }
    }

    for (const variant of VARIANTS) {
      const homeUrl = `${serverOrigin}${BASE_PATH}${variant.paths.home}`;
      console.log(`perf-bench: routing ${variant.key} (${args.runs} runs)`);
      const cell = await measureRoutingForVariant(browser, homeUrl, args.runs, args.offline, serverOrigin);
      routingRows.push({ variant: variant.label, ...cell });
      if (!cell.ok) {
        console.error(`perf-bench: routing FAILED for ${variant.key}: ${cell.error}`);
      }
    }
  } finally {
    if (browser) await browser.close();
    if (lhChrome) lhChrome.proc.kill("SIGTERM");
    await new Promise((resolve) => server.close(resolve));
  }

  const meta = { runs: args.runs, offline: args.offline, generatedAt: new Date().toISOString() };
  const reportMd = buildReportMarkdown(lighthouseRows, routingRows, meta);
  console.log(reportMd);
  await writeFile(path.join(benchDir, "report.md"), reportMd);
  console.log(`perf-bench: report written to ${path.join(benchDir, "report.md")}`);
}

await main();
