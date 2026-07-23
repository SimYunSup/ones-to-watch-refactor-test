#!/usr/bin/env node
// Builds the static assets public/search.js needs before `next build` runs:
// public/index.bin (the munja search index) and public/munja/{munja.js,
// munja_bg.wasm} (the wasm-pack `--target web` browser glue). Next's static
// export copies public/ verbatim into out/ — there is no build-hook
// equivalent to kudzu's kudzu.config.mjs afterBuild for `next build`, so
// this prebuild step (mirroring apps/react-router and apps/tanstack-router's
// build-search-index.mjs, extended with kudzu.config.mjs's munja copy) does
// both jobs before Next ever runs.
import { createRequire } from "node:module";
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const require = createRequire(import.meta.url);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");

// `fetchNewsEntries` already resolves to [] when Notion credentials are
// unset, but guard here too — a search index build must never fail the
// site build, even on an unexpected fetch error.
let docs = [];
try {
  const entries = await fetchNewsEntries();
  docs = entriesToSearchDocs(entries);
} catch (error) {
  console.warn(`munja: failed to fetch news entries, indexing 0: ${String(error)}`);
}

const size = writeSearchIndexFile(docs, join(publicDir, "index.bin"));
console.log(`munja: indexed ${docs.length} entries -> public/index.bin (${size} bytes)`);

// Copy munja's wasm-pack (`--target web`) browser glue + wasm binary next to
// the site's other static assets. require.resolve follows the package's
// "main"/exports subpath, and the destination filenames match what the glue
// itself expects to find alongside it (`new URL("munja_bg.wasm", import.meta.url)`).
const munjaDir = join(publicDir, "munja");
mkdirSync(munjaDir, { recursive: true });
copyFileSync(require.resolve("@pickhealer/munja"), join(munjaDir, "munja.js"));
copyFileSync(require.resolve("@pickhealer/munja/munja_bg.wasm"), join(munjaDir, "munja_bg.wasm"));
console.log("munja: copied wasm glue -> public/munja/");
