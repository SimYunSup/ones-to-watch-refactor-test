import { Link, createFileRoute, notFound } from "@tanstack/react-router";
import PostCard, { type PostCardData } from "../components/PostCard";
import { PAGE_SIZE } from "../lib/pagination";
import { fetchNewsEntries } from "../server/fetchNewsEntries";

interface NewsListLoaderData {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  cards: Array<PostCardData>;
}

export const Route = createFileRoute("/news/list/$page")({
  loader: async ({ params }): Promise<NewsListLoaderData> => {
    const page = Number(params.page);
    if (!Number.isInteger(page) || page < 1) {
      throw notFound();
    }

    const entries = await fetchNewsEntries();
    const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
    if (page > pageCount) {
      throw notFound();
    }

    const cards: Array<PostCardData> = entries
      .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page)
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        date: entry.date,
        coverUrl: entry.coverUrl,
      }));

    return { page, hasPrev: page > 1, hasNext: page < pageCount, cards };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData ? `${loaderData.page}페이지 | OTW for FE` : "OTW for FE",
      },
    ],
  }),
  component: NewsList,
});

function NewsList() {
  const { page, hasPrev, hasNext, cards } = Route.useLoaderData();

  return (
    <main className="archive">
      <p className="mono-eyebrow">// archive</p>
      <h1 className="archive-title">뉴스레터 아카이브</h1>

      <div className="post-list">
        {cards.length > 0 ? (
          cards.map((card) => <PostCard key={card.id} post={card} />)
        ) : (
          <p className="archive-empty">게시물이 없습니다</p>
        )}
      </div>

      <nav className="pager">
        {hasPrev ? (
          <Link className="pager-btn" to="/news/list/$page" params={{ page: String(page - 1) }}>
            ← 이전
          </Link>
        ) : (
          <span />
        )}
        <span className="pager-current">{page}</span>
        {hasNext ? (
          <Link className="pager-btn" to="/news/list/$page" params={{ page: String(page + 1) }}>
            다음 →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
