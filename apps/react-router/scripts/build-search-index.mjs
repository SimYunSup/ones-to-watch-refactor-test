#!/usr/bin/env node
// Builds public/index.bin (the munja full-text search index) before
// `react-router build` runs, so the static output already contains it as a
// plain asset under public/. Runs in plain Node against the compiled
// @otw/notion-content dist — no bundler, no browser APIs.
import { fetchNewsEntries } from "@otw/notion-content";
import { entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content/search";

const outFile = new URL("../public/index.bin", import.meta.url);

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

const size = writeSearchIndexFile(docs, outFile);
console.log(`munja: indexed ${docs.length} entries -> public/index.bin (${size} bytes)`);
