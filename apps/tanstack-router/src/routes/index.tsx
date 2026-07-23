import { Link, createFileRoute } from "@tanstack/react-router";
import PostCard, { type PostCardData } from "../components/PostCard";
import Search from "../components/Search";
import { fetchNewsEntries } from "../server/fetchNewsEntries";

const RECENT_COUNT = 8;

export const Route = createFileRoute("/")({
  loader: async () => {
    const entries = await fetchNewsEntries();
    // Loader data crosses the server/client boundary and is embedded in the
    // prerendered HTML — keep it to the minimal serializable fields the
    // page actually renders rather than shipping full entry HTML/headings.
    const cards: Array<PostCardData> = entries.slice(0, RECENT_COUNT).map((entry) => ({
      id: entry.id,
      title: entry.title,
      date: entry.date,
      coverUrl: entry.coverUrl,
    }));
    return { cards };
  },
  component: Home,
});

function Home() {
  const { cards } = Route.useLoaderData();

  return (
    <main className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-text">
          <p className="mono-eyebrow hero-eyebrow">
            // weekly frontend newsletter
          </p>
          <h1 className="hero-title">
            Ones To Watch
            <br />
            for FrontEnd
          </h1>
          <p className="hero-sub">주목할 만한 블로그를 모아두는 웹사이트</p>
          <p className="hero-fineprint">주 1회 발행 · 광고 없음 · 언제든 해지</p>
        </div>
      </section>

      {/* Features */}
      <section className="features">
        <div className="features-inner">
          <div className="feature">
            <p className="feature-num">01</p>
            <h3 className="feature-title">Deep Insights</h3>
            <p className="feature-desc">
              기술적인 깊이가 있거나 방향성을 고민하게 만드는 글
            </p>
          </div>
          <div className="feature">
            <p className="feature-num">02</p>
            <h3 className="feature-title">Curated Archive</h3>
            <p className="feature-desc">주 1회 발행되는 프론트엔드 아카이브</p>
          </div>
          <div className="feature">
            <p className="feature-num">03</p>
            <h3 className="feature-title">Developer Focused</h3>
            <p className="feature-desc">
              프론트엔드 개발자에게 영감을 주는 인사이트
            </p>
          </div>
        </div>
      </section>

      {/* Recent */}
      <section className="recent">
        <div className="recent-head">
          <h2 className="recent-title">최근 뉴스레터</h2>
          <Link className="recent-all" to="/news/list/$page" params={{ page: "1" }}>
            전체 보기 →
          </Link>
        </div>
        <div className="recent-search">
          <Search />
        </div>
        <div className="post-list">
          {cards.map((card) => (
            <PostCard key={card.id} post={card} />
          ))}
        </div>
      </section>
    </main>
  );
}
