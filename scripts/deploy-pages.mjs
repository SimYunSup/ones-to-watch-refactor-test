#!/usr/bin/env node
// Local GitHub Pages deploy — replaces the old .github/workflows/deploy.yml
// CI pipeline. Rationale: with ten variants a CI matrix build got slow and
// approval-heavy, and every content tweak burned Actions minutes; building on
// the developer machine (where the Notion cache/secrets already live) and
// pushing the assembled artifact is both faster and exactly reproduces what
// the local bench/e2e tools already exercise via scripts/lib/site-server.mjs.
//
// What it does:
//   1. (unless --skip-build) prefetch Notion content once into
//      notion-cache/news-entries.json, then build all variants with
//      NOTION_CONTENT_CACHE pointing at it (astro still fetches live via
//      notion-loader — its own pipeline).
//   2. Assemble the Pages artifact into site/ (same layout the bench/e2e
//      tools serve) + .nojekyll (Next.js emits _next/ which Jekyll would
//      otherwise drop).
//   3. Commit site/ as the root tree of the gh-pages branch (fresh orphan
//      commit each deploy — no history accumulation) and push it.
//
// One-time repo setting: Pages must serve from the gh-pages branch
// ("Deploy from a branch"). The script attempts to set this via `gh api`
// and prints a hint if that fails.
//
// Usage: node ./scripts/deploy-pages.mjs [--skip-build]
import { spawnSync } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { assembleSite } from "./lib/site-server.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const siteDir = path.join(repoRoot, "site");
const skipBuild = process.argv.includes("--skip-build");

/** Run a command, streaming output; exit on failure unless allowFail. */
function run(cmd, args, opts = {}) {
  const { allowFail = false, env = {} } = opts;
  const result = spawnSync(cmd, args, {
    cwd: repoRoot,
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  if (result.status !== 0 && !allowFail) {
    console.error(`deploy-pages: \`${cmd} ${args.join(" ")}\` failed (exit ${result.status})`);
    process.exit(result.status ?? 1);
  }
  return result.status === 0;
}

/** Run a command and capture stdout (trimmed); exit on failure. */
function capture(cmd, args) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`deploy-pages: \`${cmd} ${args.join(" ")}\` failed: ${result.stderr}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}

if (!skipBuild) {
  // One Notion fetch for every variant build (same defense the old CI
  // prefetch job provided — RR v8's prerender has a hard 10s per-request
  // timeout that a live full-database fetch would blow past).
  run("pnpm", ["run", "prefetch:content"]);
  run("pnpm", ["run", "build:all"], {
    env: { NOTION_CONTENT_CACHE: path.join(repoRoot, "notion-cache", "news-entries.json") },
  });
}

assembleSite(repoRoot, siteDir, { toolName: "deploy-pages" });
// Next.js emits _next/ — Jekyll (Pages' default processor) drops _-prefixed
// dirs, so opt out of Jekyll entirely.
writeFileSync(path.join(siteDir, ".nojekyll"), "");

// Publish site/ as a fresh orphan commit on gh-pages without touching the
// current branch's working tree or index: stage site/ into a throwaway
// index (GIT_INDEX_FILE) with --work-tree pointed at site/, hash it into a
// tree object, wrap it in a parentless commit, point the branch at it, push.
// site/ is gitignored on the source branch, hence the explicit `add -f`.
// `.git` may be a file (worktree gitdir pointer), not a directory, so resolve
// the real git dir instead of hardcoding path.join(repoRoot, ".git", ...).
const gitDir = capture("git", ["rev-parse", "--absolute-git-dir"]);
const tmpIndex = path.join(gitDir, "deploy-pages-index");
rmSync(tmpIndex, { force: true });
const snapshotEnv = { GIT_INDEX_FILE: tmpIndex };
function captureWithEnv(cmd, args, env) {
  const result = spawnSync(cmd, args, { cwd: repoRoot, encoding: "utf8", env: { ...process.env, ...env } });
  if (result.status !== 0) {
    console.error(`deploy-pages: \`${cmd} ${args.join(" ")}\` failed: ${result.stderr}`);
    process.exit(result.status ?? 1);
  }
  return result.stdout.trim();
}
captureWithEnv("git", ["--work-tree", siteDir, "add", "-Af", "."], snapshotEnv);
const treeHash = captureWithEnv("git", ["write-tree"], snapshotEnv);
rmSync(tmpIndex, { force: true });
const commitMessage = `deploy: ${new Date().toISOString()}`;
const commitHash = capture("git", ["commit-tree", treeHash, "-m", commitMessage]);
run("git", ["update-ref", "refs/heads/gh-pages", commitHash]);
// gh-pages is a disposable build-artifact branch (fresh orphan commit each
// deploy, no shared history), so a force push is the intended, safe update
// — it never touches source branches. Run by a developer locally, not CI.
run("git", ["push", "--force", "origin", "gh-pages"]);

// Best-effort: make sure Pages serves the gh-pages branch. Fails harmlessly
// if already configured or if the token lacks admin scope.
const configured = run(
  "gh",
  ["api", "-X", "POST", "repos/{owner}/{repo}/pages", "-f", "build_type=legacy", "-f", "source[branch]=gh-pages", "-f", "source[path]=/"],
  { allowFail: true },
) || run(
  "gh",
  ["api", "-X", "PUT", "repos/{owner}/{repo}/pages", "-f", "build_type=legacy", "-f", "source[branch]=gh-pages", "-f", "source[path]=/"],
  { allowFail: true },
);
if (!configured) {
  console.warn(
    "deploy-pages: could not switch the Pages source automatically — set it once in Settings → Pages → 'Deploy from a branch' → gh-pages.",
  );
}

console.log("deploy-pages: pushed gh-pages — the site will update in a minute or two.");
