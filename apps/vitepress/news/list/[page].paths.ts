// Dynamic-route paths loader (VitePress dynamic routes —
// https://vitepress.dev/guide/routing#dynamic-routes): pairs with
// [page].md, one generated page per array entry below. Ported from
// apps/kudzu/src/pages/news/list/[page].tsx's getStaticPaths.
//
// Node-only module (evaluated by VitePress's build/dev process, never
// bundled for the browser), so it imports @otw/notion-content directly —
// same memoized fetchNewsEntries() the home page's newsEntries.data.ts and
// news/post/[id].paths.ts also call, so this contributes no extra fetch.
//
// `paths()` returning `[]` would emit zero pages for this route (confirmed
// against vitepress@1.6.4's resolveDynamicRoutes: an empty paths array maps
// to zero ResolvedRouteConfig entries, no error) — Math.max(1, …) below
// guarantees a page 1 even for a zero-entry archive, matching every other
// variant's "empty archive still ships one valid page" contract.
import { fetchNewsEntries } from "@otw/notion-content";
import type { PostCardData } from "../../.vitepress/theme/lib/types";
import { siteUrl } from "../../.vitepress/theme/lib/site";
import { PAGE_SIZE } from "../../.vitepress/theme/lib/pagination";

// The `[page]` route param is matched into the output filename by string
// substitution, so it — like every other param VitePress's dynamic-route
// plugin threads through — must be a string.
interface ListPageParams extends Record<string, unknown> {
  page: string;
  /** `<title>` text — read by .vitepress/config.ts's transformPageData
   *  hook, since frontmatter values aren't Vue-template-interpolated. */
  docTitle: string;
  prevHref: string | null;
  nextHref: string | null;
  cards: PostCardData[];
}

export default {
  async paths(): Promise<{ params: ListPageParams }[]> {
    const entries = await fetchNewsEntries();
    const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

    return Array.from({ length: pageCount }, (_, index) => {
      const page = index + 1;
      const cards: PostCardData[] = entries
        .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page)
        .map((entry) => ({
          id: entry.id,
          title: entry.title,
          date: entry.date,
          coverUrl: entry.coverUrl,
          href: siteUrl(`news/post/${entry.id}`),
        }));

      return {
        params: {
          page: String(page),
          docTitle: `${page}페이지 | OTW for FE`,
          prevHref: page > 1 ? siteUrl(`news/list/${page - 1}`) : null,
          nextHref: page < pageCount ? siteUrl(`news/list/${page + 1}`) : null,
          cards,
        },
      };
    });
  },
};
