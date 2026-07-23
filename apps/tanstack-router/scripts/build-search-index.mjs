// Build-time munja index writer, run before `vite build` (see package.json).
// Mirrors what notion-loader's Astro Content Layer hook does for apps/web,
// but this variant has no content-layer integration, so the index is built
// as a standalone prebuild step instead: fetch entries -> map to search
// docs -> serialize -> write to public/index.bin for vite to copy verbatim
// into the static build output.
import { fetchNewsEntries, entriesToSearchDocs, writeSearchIndexFile } from "@otw/notion-content";

const entries = await fetchNewsEntries();
const docs = entriesToSearchDocs(entries);
const outFile = new URL("../public/index.bin", import.meta.url);
const size = writeSearchIndexFile(docs, outFile);

console.log(`munja: indexed ${docs.length} entries → public/index.bin (${size} bytes)`);
