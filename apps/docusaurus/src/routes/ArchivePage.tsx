import React from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";
import useBaseUrl from "@docusaurus/useBaseUrl";
import PostCard, { type PostCardData } from "../components/PostCard";

// Route component for "/news/list/<n>", one instance per page registered by
// plugins/newsletter.js's contentLoaded loop (12 entries/page, 1-based;
// always at least page 1, even for a zero-entry collection). Markup/classes
// ported from apps/kudzu/src/pages/news/list/[page].tsx.
export default function ArchivePage({
  data
}: {
  data: { page: number; pageCount: number; cards: PostCardData[] };
}): React.ReactElement {
  const { page, pageCount, cards } = data;
  const prevUrl = useBaseUrl(page > 1 ? `/news/list/${page - 1}` : "/news/list/1");
  const nextUrl = useBaseUrl(page < pageCount ? `/news/list/${page + 1}` : "/news/list/1");
  const searchScriptUrl = useBaseUrl("/search.js");

  return (
    <Layout>
      <Head>
        <title>뉴스레터 아카이브 | OTW for FE</title>
      </Head>
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
            cards.map(card => <ArchiveCard key={card.id} card={card} />)
          ) : (
            <p className="archive-empty">게시물이 없습니다</p>
          )}
        </div>

        <nav className="pager">
          {page > 1 ? (
            <a className="pager-btn" href={prevUrl}>
              ← 이전
            </a>
          ) : (
            <span />
          )}
          <span className="pager-current">{page}</span>
          {page < pageCount ? (
            <a className="pager-btn" href={nextUrl}>
              다음 →
            </a>
          ) : (
            <span />
          )}
        </nav>
      </main>
      <script type="module" src={searchScriptUrl}></script>
    </Layout>
  );
}

function ArchiveCard({ card }: { card: PostCardData }): React.ReactElement {
  const href = useBaseUrl(`/news/post/${card.id}`);
  return <PostCard post={card} href={href} />;
}
