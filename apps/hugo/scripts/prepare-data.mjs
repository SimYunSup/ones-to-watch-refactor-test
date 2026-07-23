#!/usr/bin/env node
// Generates every build-time input Hugo's file-based routing needs, since
// Hugo (unlike the JS-framework variants) has no per-request data loader —
// routes come from files that must exist on disk before `hugo` runs.
//
// Writes, in plain Node against the compiled @otw/notion-content dist:
//   1. data/news.json              — full NewsEntry[] (site.Data.news in
//      layouts/).
//   2. content/news/post/<id>.md   — one JSON-front-matter stub per entry.
//      Raw HTML front matter is unsafe to hand-roll (front-matter parsers
//      don't escape arbitrary bodies), so layouts/news-post/single.html
//      instead re-looks-up the entry from site.Data.news by id.
//   3. content/news/list/<n>.md    — one stub per archive page, n = 1..
//      pageCount (always at least 1, so an empty collection still gets a
//      page). layouts/news-list/single.html slices site.Data.news using
//      the `page` front-matter param.
//   4. static/index.bin            — munja full-text search index.
//   5. static/munja/{munja.js,munja_bg.wasm} — munja's wasm-pack browser
//      bundle, ported from apps/kudzu/kudzu.config.mjs's afterBuild copy.
//
// content/, data/news.json, and static/{index.bin,munja/} are all
// regenerated on every build and are not meant to be committed.
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
const PAGE_SIZE = 12;

// fetchNewsEntries() already resolves to [] when Notion credentials are
// unset, but guard here too — the Hugo build must never fail because of an
// unexpected fetch error.
let entries = [];
try {
  entries = await fetchNewsEntries();
} catch (error) {
  console.warn(`prepare-data: failed to fetch news entries, using 0: ${String(error)}`);
}

// --- data/news.json ------------------------------------------------------
const dataDir = path.join(root, "data");
mkdirSync(dataDir, { recursive: true });
writeFileSync(path.join(dataDir, "news.json"), JSON.stringify(entries));

// --- content/news/{post,list}/*.md ---------------------------------------
// Rebuilt from scratch every run so a shrinking entry count (or falling
// back to an empty [] on a failed fetch) never leaves an orphaned post/list
// page behind from a previous build.
const contentNewsDir = path.join(root, "content", "news");
rmSync(contentNewsDir, { recursive: true, force: true });
const postDir = path.join(contentNewsDir, "post");
const listDir = path.join(contentNewsDir, "list");
mkdirSync(postDir, { recursive: true });
mkdirSync(listDir, { recursive: true });

// `type` in JSON front matter re-points Hugo's template lookup at
// layouts/news-post/single.html regardless of the page's Section (still
// "news", derived from the content/news/ directory).
for (const entry of entries) {
  const frontMatter = { title: entry.title, type: "news-post", id: entry.id };
  writeFileSync(path.join(postDir, `${entry.id}.md`), `${JSON.stringify(frontMatter, null, 2)}\n`);
}

const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
for (let page = 1; page <= pageCount; page += 1) {
  const frontMatter = { title: "뉴스레터 아카이브", type: "news-list", page };
  writeFileSync(path.join(listDir, `${page}.md`), `${JSON.stringify(frontMatter, null, 2)}\n`);
}

// --- static/index.bin + static/munja/* -----------------------------------
const staticDir = path.join(root, "static");
const munjaDir = path.join(staticDir, "munja");
mkdirSync(munjaDir, { recursive: true });

const docs = entriesToSearchDocs(entries);
const indexSize = writeSearchIndexFile(docs, path.join(staticDir, "index.bin"));
console.log(`prepare-data: indexed ${docs.length} entries -> static/index.bin (${indexSize} bytes)`);

// Copy munja's wasm-pack (`--target web`) browser glue + wasm binary next to
// the site's other static assets — ported from apps/kudzu/kudzu.config.mjs's
// afterBuild. require.resolve follows the package's exports subpath, and
// the destination filenames match what the glue itself expects to find
// alongside it (`new URL("munja_bg.wasm", import.meta.url)`).
copyFileSync(require.resolve("@pickhealer/munja"), path.join(munjaDir, "munja.js"));
copyFileSync(require.resolve("@pickhealer/munja/munja_bg.wasm"), path.join(munjaDir, "munja_bg.wasm"));

console.log(`prepare-data: wrote ${entries.length} post page(s), ${pageCount} list page(s)`);
