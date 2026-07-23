import { fetchNewsEntries } from "@otw/notion-content";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import PostCard, { type PostCardData } from "../../../components/PostCard";
import { siteUrl } from "../../../lib/site";

const PAGE_SIZE = 12;

interface ListPageProps {
  page: number;
  /** Base-prefixed pager hrefs, or null when there is no prev/next page. */
  prevHref: string | null;
  nextHref: string | null;
  cards: PostCardData[];
}

export const metadata = {
  title: "뉴스레터 아카이브 | OTW for FE",
  lang: "ko",
  icon: "/favicon.svg"
};

// All link hrefs are precomputed here as plain strings: Kudzu treats function
// calls inside JSX expressions as reactive-binding captures and rejects
// imported helpers like siteUrl, so props carry only serializable data.
export async function getStaticPaths() {
  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));

  return Array.from({ length: pageCount }, (_, index) => {
    const page = index + 1;
    const cards: PostCardData[] = entries
      .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page)
      .map(entry => ({
        id: entry.id,
        title: entry.title,
        date: entry.date,
        coverUrl: entry.coverUrl,
        href: siteUrl(`news/post/${entry.id}`)
      }));

    return {
      params: { page: String(page) },
      props: {
        page,
        prevHref: page > 1 ? siteUrl(`news/list/${page - 1}`) : null,
        nextHref: page < pageCount ? siteUrl(`news/list/${page + 1}`) : null,
        cards
      } satisfies ListPageProps
    };
  });
}

export default function NewsListPage({ page, prevHref, nextHref, cards }: ListPageProps) {
  return (
    <>
      <Header />
      <main className="archive">
        <p className="mono-eyebrow">// archive</p>
        <h1 className="archive-title">뉴스레터 아카이브</h1>

        <div className="post-list">
          {cards.length > 0 ? (
            cards.map(card => <PostCard key={card.id} post={card} />)
          ) : (
            <p className="archive-empty">게시물이 없습니다</p>
          )}
        </div>

        <nav className="pager">
          {prevHref ? (
            <a className="pager-btn" href={prevHref}>
              ← 이전
            </a>
          ) : (
            <span />
          )}
          <span className="pager-current">{page}</span>
          {nextHref ? (
            <a className="pager-btn" href={nextHref}>
              다음 →
            </a>
          ) : (
            <span />
          )}
        </nav>
      </main>
      <Footer />
    </>
  );
}
