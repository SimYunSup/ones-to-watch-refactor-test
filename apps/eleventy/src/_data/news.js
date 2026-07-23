import { fetchNewsEntries } from "@otw/notion-content";

// Global data key "news": the full NewsEntry[] fetched from Notion (11ty's
// standard "call fetchNewsEntries() directly from a _data file" pattern).
// Shared by src/news/post.njk's per-entry pagination and, via
// entriesToSearchDocs(), the munja search index written in
// eleventy.config.js's eleventy.after handler. Resolves to [] (after a
// console warning) when NOTION_TOKEN/NOTION_DATABASE_ID are unset, so a
// secret-less build still succeeds — see @otw/notion-content's
// fetchNewsEntries() doc comment.
export default async function () {
  return fetchNewsEntries();
}
