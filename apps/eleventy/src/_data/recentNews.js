import { fetchNewsEntries } from "@otw/notion-content";

const RECENT_COUNT = 8;

// The home page's "최근 뉴스레터" section shows the 8 newest entries
// (RECENT_COUNT ported from apps/kudzu/src/pages/index.tsx). Sliced here,
// in a data file, rather than in src/index.njk's template — Nunjucks'
// built-in `slice` filter batches an array into chunks of N
// (https://mozilla.github.io/nunjucks/templating.html#slice), it does not
// take the first N items, so doing this in JS avoids a filter that doesn't
// exist. fetchNewsEntries() is memoized (see src/_data/news.js), so this
// costs no extra Notion query.
export default async function () {
  const entries = await fetchNewsEntries();
  return entries.slice(0, RECENT_COUNT);
}
