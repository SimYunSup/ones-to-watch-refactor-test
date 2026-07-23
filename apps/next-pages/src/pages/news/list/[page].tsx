import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import type { ParsedUrlQuery } from "node:querystring";
import Head from "next/head";
import Link from "next/link";
import { fetchNewsEntries } from "@otw/notion-content";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import PostCard, { type PostCardData } from "../../../components/PostCard";
import { assetUrl } from "../../../lib/site";
import { PAGE_SIZE } from "../../../lib/pagination";

interface ListPageParams extends ParsedUrlQuery {
  page: string;
}

// `output: "export"` only supports `fallback: false` — `true`/"blocking"
// need a live server to render paths that weren't pre-rendered at build
// time, which does not exist in a static export (see next.config.mjs).
// `Math.max(1, ...)` mirrors apps/kudzu/src/pages/news/list/[page].tsx: an
// empty collection still yields page 1 (an empty-but-valid archive) rather
// than zero paths, satisfying "빈 컬렉션이면 1만" — page 1 is never fallback
// content, it is genuinely built.
export const getStaticPaths: GetStaticPaths<ListPageParams> = async () => {
  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  return {
    paths: Array.from({ length: pageCount }, (_, index) => ({
      params: { page: String(index + 1) }
    })),
    fallback: false
  };
};

interface ListPageProps {
  page: number;
  prevPage: number | null;
  nextPage: number | null;
  cards: PostCardData[];
}

export const getStaticProps: GetStaticProps<ListPageProps, ListPageParams> = async ({ params }) => {
  const page = Number(params!.page);
  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const cards: PostCardData[] = entries
    .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page)
    .map(entry => ({
      id: entry.id,
      title: entry.title,
      date: entry.date,
      coverUrl: entry.coverUrl
    }));

  return {
    props: {
      page,
      prevPage: page > 1 ? page - 1 : null,
      nextPage: page < pageCount ? page + 1 : null,
      cards
    }
  };
};

export default function NewsListPage({
  page,
  prevPage,
  nextPage,
  cards
}: InferGetStaticPropsType<typeof getStaticProps>) {
  return (
    <>
      <Head>
        <title>뉴스레터 아카이브 | OTW for FE</title>
      </Head>
      <Header />
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
      <Footer />
      <script type="module" src={assetUrl("search.js")}></script>
    </>
  );
}
