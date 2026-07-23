import {
  Link,
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { fetchNewsEntries } from "@otw/notion-content";
import PostCard, { type PostCardData } from "../components/PostCard";
import { PAGE_SIZE } from "../lib/pagination";
import Search from "../components/Search";

interface NewsListLoaderData {
  page: number;
  hasPrev: boolean;
  hasNext: boolean;
  cards: PostCardData[];
}

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<NewsListLoaderData> {
  const page = Number(params.page);
  if (!Number.isInteger(page) || page < 1) {
    throw new Response("Not Found", { status: 404 });
  }

  const entries = await fetchNewsEntries();
  const pageCount = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  if (page > pageCount) {
    throw new Response("Not Found", { status: 404 });
  }

  const cards = entries
    .slice(PAGE_SIZE * (page - 1), PAGE_SIZE * page)
    .map((entry) => ({
      id: entry.id,
      title: entry.title,
      date: entry.date,
      coverUrl: entry.coverUrl,
    }));

  return { page, hasPrev: page > 1, hasNext: page < pageCount, cards };
}

export const meta: MetaFunction = ({ data }) => {
  const page = (data as NewsListLoaderData | undefined)?.page;
  return [{ title: page ? `${page}페이지 | OTW for FE` : "OTW for FE" }];
};

export default function NewsList() {
  const { page, hasPrev, hasNext, cards } = useLoaderData<NewsListLoaderData>();

  return (
    <main className="archive">
      <p className="mono-eyebrow">// archive</p>
      <h1 className="archive-title">뉴스레터 아카이브</h1>

      <div className="archive-search">
        <Search />
      </div>

      <div className="post-list">
        {cards.length > 0 ? (
          cards.map((card) => <PostCard key={card.id} post={card} />)
        ) : (
          <p className="archive-empty">게시물이 없습니다</p>
        )}
      </div>

      <nav className="pager">
        {hasPrev ? (
          <Link className="pager-btn" to={`/news/list/${page - 1}`}>
            ← 이전
          </Link>
        ) : (
          <span />
        )}
        <span className="pager-current">{page}</span>
        {hasNext ? (
          <Link className="pager-btn" to={`/news/list/${page + 1}`}>
            다음 →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </main>
  );
}
