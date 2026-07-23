import { createServerFn } from "@tanstack/react-start";
import { staticFunctionMiddleware } from "@tanstack/start-static-server-functions";
import { fetchNewsEntries as fetchNewsEntriesFromNotion } from "@otw/notion-content";

// Route loaders in TanStack Start run isomorphically by default, so a
// direct call to `@otw/notion-content`'s `fetchNewsEntries` (Node-only:
// `@notionhq/client`, `process.env`) from a loader body would otherwise get
// pulled into the client bundle. Wrapping it in `createServerFn` keeps the
// implementation server-only.
//
// `staticFunctionMiddleware` (must be the last middleware) additionally
// makes this a *static* server function: during prerendering the result is
// executed once and cached as a static JSON asset under the build output.
// On the client, the SSR-embedded result hydrates the first render, and any
// later client-side invocation (e.g. navigating to a prerendered route that
// wasn't embedded in the current page) fetches that static JSON file
// instead of trying to run server code in the browser — required here
// because GitHub Pages serves this build with no application server.
export const fetchNewsEntries = createServerFn({ method: "GET" })
  .middleware([staticFunctionMiddleware])
  .handler(async () => fetchNewsEntriesFromNotion());
