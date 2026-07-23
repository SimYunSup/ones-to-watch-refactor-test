// Dynamic-route paths loader (VitePress dynamic routes —
// https://vitepress.dev/guide/routing#dynamic-routes): pairs with [id].md,
// one generated page per Notion entry. Ported from
// apps/kudzu/src/pages/news/post/[slug].tsx's getStaticPaths.
//
// Node-only module — see news/list/[page].paths.ts's header comment for why
// @otw/notion-content is imported directly and shares fetchNewsEntries()'s
// process-wide memoization with the other two data-fetching entry points.
//
// A zero-entry build (no Notion credentials at build time) returns `[]`
// here — vitepress@1.6.4's resolveDynamicRoutes maps an empty paths array
// to zero ResolvedRouteConfig entries with no error, so the build still
// succeeds; it just emits no news/post/*.html files, matching
// react-router.config.ts's/tanstack's "no post route/pages when the archive
// is empty" contract for this same scenario.
import { fetchNewsEntries } from "@otw/notion-content";

// Notion page ids are UUIDs (hyphens, no slash/query/hash characters), so
// they satisfy the `[id]` route param's single-path-segment requirement —
// no slug transform is needed (mirrors kudzu's [slug].tsx comment on the
// same guarantee).
interface PostParams extends Record<string, unknown> {
  id: string;
  title: string;
  date: string | null;
  coverUrl: string | null;
  html: string;
}

export default {
  async paths(): Promise<{ params: PostParams }[]> {
    const entries = await fetchNewsEntries();
    return entries.map((entry) => ({
      params: {
        id: entry.id,
        title: entry.title,
        date: entry.date,
        coverUrl: entry.coverUrl,
        html: entry.html,
      },
    }));
  },
};
