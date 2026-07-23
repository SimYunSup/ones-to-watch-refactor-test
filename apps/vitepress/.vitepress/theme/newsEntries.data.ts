// Build-time data loader (VitePress "Build-Time Data Loading" —
// https://vitepress.dev/guide/data-loading): the loader itself only runs in
// Node, so it can import @otw/notion-content directly instead of going
// through a prepare-data.mjs prebuild step (contrast with kudzu, whose TSX
// compiler forbids vendored npm packages inside page handlers).
//
// `fetchNewsEntries()` is memoized per (auth, databaseId, cache) for the
// process lifetime, so this loader and every `.paths.ts` dynamic-route file
// below share one Notion fetch — importing this module (for its `data`
// export, per VitePress's "Typed Data Loaders" pattern) alongside the
// `news/list/[page].paths.ts` and `news/post/[id].paths.ts` loaders never
// re-queries Notion.
//
// Imported by HomeView.vue, which needs the full (unpaged) entry list for
// its "recent 8" section — the only page that isn't itself a dynamic route.
import { defineLoader } from "vitepress";
import { fetchNewsEntries } from "@otw/notion-content";
import type { NewsEntry } from "@otw/notion-content";

export default defineLoader({
  load: (): Promise<NewsEntry[]> => fetchNewsEntries(),
});

// `data` is populated by VitePress at build time (JSON.parse of the resolved
// load() result) and re-exported for `.md`/`.vue` consumers that import this
// file directly, per the "Typed Data Loaders" pattern.
export declare const data: NewsEntry[];
