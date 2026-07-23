// Shared "assemble the GitHub Pages artifact + serve it locally" logic used
// by both scripts/visual-diff.mjs (screenshot parity) and
// scripts/perf-bench.mjs (Lighthouse + routing perf). Keeping this in one
// place means both tools exercise byte-for-byte the same site/ layout and
// URL structure that .github/workflows/deploy.yml actually publishes.
import { createReadStream, cpSync, existsSync, mkdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

// Must match the `base`/`basename`/`BASE` baked into each variant's build
// config (apps/web/astro.config.mjs, apps/react-router/{react-router,vite}.config.ts,
// apps/tanstack-router/vite.config.ts, apps/kudzu/kudzu.config.mjs) — this is
// the GitHub Pages repo-name prefix every variant's routes are generated under.
export const BASE_PATH = "/ones-to-watch-refactor-test";

// astro is intentionally listed first: several consumers (visual-diff's
// BASELINE_VARIANT) treat it as the reference variant, and the remaining
// three are compared/reported against it in this same order.
export const VARIANTS = [
  {
    key: "astro",
    label: "Astro",
    // Astro's `/` redirects to `/home` (see astro.config.mjs `redirects`);
    // navigate to the redirect target directly instead of following it.
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

export const MIME_TYPES = {
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

/**
 * Rebuild site/ from the four variant build outputs, replicating the
 * "Assemble Pages artifact" step in .github/workflows/deploy.yml exactly
 * (including the react-router two-step merge + cleanup) via node:fs instead
 * of shell `cp -R`.
 *
 * @param {string} repoRoot absolute path to the monorepo root
 * @param {string} siteDir absolute path to assemble the Pages artifact into
 * @param {{ toolName?: string }} [opts] error-message prefix (defaults to "site-server")
 */
export function assembleSite(repoRoot, siteDir, opts = {}) {
  const toolName = opts.toolName ?? "site-server";
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
        `${toolName}: missing build output for ${name} at ${dir}. Run \`pnpm run build:all\` first, or pass --site <already-assembled-dir>.`,
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

  console.log(`${toolName}: assembled site at ${siteDir}`);
  return siteDir;
}

/** Resolve a filesystem path to a servable file: itself, its index.html (if a
 * directory), or a `${path}.html` sibling (covers flat non-directory output). */
export function resolveStaticFile(absPath) {
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
 * everything is served under the `basePath` (default `BASE_PATH`, stripped
 * before resolving against `siteDir`), directories fall back to index.html,
 * and anything unresolved is a 404.
 *
 * @param {string} siteDir absolute path to the assembled Pages artifact
 * @param {number} port 0 lets the OS pick a free port
 * @param {string} [basePath]
 * @returns {Promise<import("node:http").Server>}
 */
export function startServer(siteDir, port, basePath = BASE_PATH) {
  const server = createServer((req, res) => {
    try {
      const requestUrl = new URL(req.url, "http://localhost");
      const pathname = decodeURIComponent(requestUrl.pathname);
      const isUnderBase = pathname === basePath || pathname.startsWith(`${basePath}/`);
      if (!isUnderBase) {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end(`Not found (outside ${basePath} base path)`);
        return;
      }

      let rest = pathname.slice(basePath.length);
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
 * Abort every request that doesn't target our own static server. Used to
 * make screenshots deterministic (visual-diff) and, optionally, to run
 * Lighthouse/routing measurements in a fully offline mode (perf-bench
 * `--offline`) — at the cost of external assets (web fonts, analytics,
 * embeds) falling back or failing to load. Every variant loses the exact
 * same external assets, so cross-variant comparisons stay fair.
 */
export async function blockExternalRequests(page, serverOrigin) {
  await page.route("**/*", (route) => {
    const url = route.request().url();
    if (url.startsWith(serverOrigin)) {
      return route.continue();
    }
    return route.abort();
  });
}
