import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";
// `@pickhealer/munja` is the wasm-pack (`--target web`) build. In Node we drive
// it with `initSync` + the vendored `.wasm`, so build-time tokenization is the
// exact same code path the browser runs at query time.
// @ts-ignore -- wasm-bindgen glue may ship no .d.ts depending on the published build.
import { initSync, build_index_bytes } from "@pickhealer/munja";
import type { NewsEntry } from "./types.js";

const require = createRequire(import.meta.url);

let ready = false;
function ensureWasm(): void {
  if (ready) return;
  const wasmPath = require.resolve("@pickhealer/munja/munja_bg.wasm");
  initSync({ module: readFileSync(wasmPath) });
  ready = true;
}

export interface SearchDoc {
  title: string;
  category: string;
  href: string;
  body: string;
  keywords?: string[] | null;
}

/** Strip rendered HTML down to the plain text munja should tokenize. */
export function htmlToText(html: string): string {
  return cheerio.load(html).text().replace(/\s+/g, " ").trim();
}

/** Map rendered news entries to munja search documents. */
export function entriesToSearchDocs(entries: NewsEntry[]): SearchDoc[] {
  return entries.map((entry) => ({
    title: entry.title || entry.id,
    category: "news",
    href: `/news/post/${entry.id}`,
    body: htmlToText(entry.html),
    keywords: null,
  }));
}

/** Build the munja index bytes for `docs`. */
export function buildSearchIndexBytes(docs: SearchDoc[]): Uint8Array {
  ensureWasm();
  return build_index_bytes(JSON.stringify(docs));
}

/**
 * Build the munja index from `docs` and write it to `outFile`. Creates any
 * missing parent directories. Returns the byte length of the written index.
 */
export function writeSearchIndexFile(docs: SearchDoc[], outFile: string | URL): number {
  const bytes = buildSearchIndexBytes(docs);
  const outPath = outFile instanceof URL ? fileURLToPath(outFile) : outFile;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, bytes);
  return bytes.length;
}
