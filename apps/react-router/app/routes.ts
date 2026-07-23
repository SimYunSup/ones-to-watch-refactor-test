import { type RouteConfig, index, route } from "@react-router/dev/routes";
import { fetchNewsEntries } from "@otw/notion-content";

// With `ssr:false`, every route that exports a server `loader` must be covered
// by at least one prerender path — there is no runtime server to run it later.
// A zero-entry build (no Notion credentials) prerenders no post pages, so the
// post route (and its loader) must not exist at all in that case; any
// /news/post/* URL then falls through to the 404 boundary, which is exactly
// what an empty archive should serve. `fetchNewsEntries` is memoized, so this
// shares the config's prerender() fetch instead of re-querying Notion.
export default (async () => {
  const entries = await fetchNewsEntries();

  return [
    index("routes/home.tsx"),
    route("news/list/:page", "routes/news-list.tsx"),
    ...(entries.length > 0
      ? [route("news/post/:slug", "routes/news-post.tsx")]
      : []),
  ];
})() satisfies RouteConfig;
