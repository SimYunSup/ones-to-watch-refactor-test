import type { Metadata } from "next";
import Link from "next/link";
import { fetchNewsEntries } from "@otw/notion-content";
import PostCard, { type PostCardData } from "../../../../components/PostCard";
import { assetUrl } from "../../../../lib/site";
import { PAGE_SIZE } from "../../../../lib/pagination";

interface ListPageParams {
  page: string;
}

// `output: "export"` throws a build-time error for any dynamic route whose
// generateStaticParams resolves to zero entries (see next.config.ts for the
// exact message and source citation) — so, mirroring
// apps/kudzu/src/pages/news/list/[page].tsx and
// apps/next-pages/src/pages/news/list/[page].tsx, `Math.max(1, ...)` makes
// an empty collection still yield page 1 (a genuinely built, empty-but-valid
// archive) instead of zero paths.
export async function generateStaticParams(): Promise<ListPageParams[]> {
  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  return Array.from({ length: pageCount }, (_, index) => ({
    page: String(index + 1)
  }));
}

// Every page this route can serve is enumerated above — `output: "export"`
// has no live server to render anything else at request time, so treat any
// unlisted page number as 404 rather than the (unsupported, per the Static
// Exports guide's "Unsupported Features") blocking-render default.
export const dynamicParams = false;

export const metadata: Metadata = {
  title: "뉴스레터 아카이브"
};

export default async function NewsListPage({ params }: { params: Promise<ListPageParams> }) {
  const { page: pageParam } = await params;
  const page = Number(pageParam);

  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const cards: PostCardData[] = entries.slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page).map(entry => ({
    id: entry.id,
    title: entry.title,
    date: entry.date,
    coverUrl: entry.coverUrl
  }));
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < pageCount ? page + 1 : null;

  return (
    <>
      <main className="archive">
        <p className="mono-eyebrow">// archive</p>
        <h1 className="archive-title">뉴스레터 아카이브</h1>

        <div className="archive-search">
          <div className="munja-search" data-munja>
            <div className="munja-field">
              <svg
                className="munja-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                className="munja-input"
                type="search"
                placeholder="뉴스레터 검색…"
                aria-label="뉴스레터 검색"
                autoComplete="off"
                spellCheck="false"
              />
            </div>
            <ul className="munja-panel" role="listbox" aria-label="검색 결과" hidden></ul>
          </div>
        </div>

        <div className="post-list">
          {cards.length > 0 ? (
            cards.map(card => <PostCard key={card.id} post={card} />)
          ) : (
            <p className="archive-empty">게시물이 없습니다</p>
          )}
        </div>

        <nav className="pager">
          {prevPage ? (
            <Link className="pager-btn" href={`/news/list/${prevPage}`}>
              ← 이전
            </Link>
          ) : (
            <span />
          )}
          <span className="pager-current">{page}</span>
          {nextPage ? (
            <Link className="pager-btn" href={`/news/list/${nextPage}`}>
              다음 →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      </main>
      <script type="module" src={assetUrl("search.js")}></script>
    </>
  );
}
