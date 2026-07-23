import { fetchNewsEntries } from "@otw/notion-content";

const PAGE_SIZE = 12;

// Pre-chunked archive pages. src/news/list.njk paginates over this
// (`pagination.data: newsPages`, `size: 1`) instead of pagination directly
// over `news`, so the archive is guaranteed at least one page even when
// there are zero entries.
//
// Eleventy's pagination iterates `Math.ceil(data.length / size)` chunks
// (https://www.11ty.dev/docs/pagination/#paging-a-value), so a `data`
// array of length 0 produces 0 output pages — /news/list/1/ would silently
// disappear for a Notion database with 0 "New" entries. Folding "at least
// one page, even if empty" into this data step (mirroring
// apps/hugo/scripts/prepare-data.mjs's `Math.max(1, Math.ceil(...))` and
// apps/kudzu/src/pages/news/list/[page].tsx's getStaticPaths) keeps the
// list template itself simple: it always has exactly one pagination item
// per rendered page, never zero.
export default async function () {
  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  return Array.from({ length: pageCount }, (_, index) => {
    const pageNumber = index + 1;
    return {
      pageNumber,
      items: entries.slice(PAGE_SIZE * index, PAGE_SIZE * pageNumber),
      hasPrev: pageNumber > 1,
      hasNext: pageNumber < pageCount
    };
  });
}
