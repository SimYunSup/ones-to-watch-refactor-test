import Link from "next/link";
import { fetchNewsEntries } from "@otw/notion-content";
import PostCard, { type PostCardData } from "../components/PostCard";
import HeroLogo from "../components/HeroLogo";
import { assetUrl } from "../lib/site";

const RECENT_COUNT = 8;

// Static build-time Server Component: `output: "export"` runs every Server
// Component once during `next build` (docs: "How to create a static
// export", Supported Features > Server Components), so this fetch runs
// exactly once per `fetchNewsEntries()` cache key, same as every other
// variant.
export default async function HomePage() {
  const entries = await fetchNewsEntries();
  const cards: PostCardData[] = entries.slice(0, RECENT_COUNT).map(entry => ({
    id: entry.id,
    title: entry.title,
    date: entry.date,
    coverUrl: entry.coverUrl
  }));

  return (
    <>
      <main className="home">
        <section className="hero">
          <div className="hero-text">
            <p className="mono-eyebrow hero-eyebrow">// weekly frontend newsletter</p>
            <h1 className="hero-title">
              Ones To Watch
              <br />
              for FrontEnd
            </h1>
            <p className="hero-sub">주목할 만한 블로그를 모아두는 웹사이트</p>
            <p className="hero-fineprint">주 1회 발행 · 광고 없음 · 언제든 해지</p>
          </div>
          <HeroLogo />
        </section>

        <section className="features">
          <div className="features-inner">
            <div className="feature">
              <p className="feature-num">01</p>
              <h3 className="feature-title">Deep Insights</h3>
              <p className="feature-desc">기술적인 깊이가 있거나 방향성을 고민하게 만드는 글</p>
            </div>
            <div className="feature">
              <p className="feature-num">02</p>
              <h3 className="feature-title">Curated Archive</h3>
              <p className="feature-desc">주 1회 발행되는 프론트엔드 아카이브</p>
            </div>
            <div className="feature">
              <p className="feature-num">03</p>
              <h3 className="feature-title">Developer Focused</h3>
              <p className="feature-desc">프론트엔드 개발자에게 영감을 주는 인사이트</p>
            </div>
          </div>
        </section>

        <section className="recent">
          <div className="recent-head">
            <h2 className="recent-title">최근 뉴스레터</h2>
            <Link className="recent-all" href="/news/list/1">
              전체 보기 →
            </Link>
          </div>
          <div className="recent-search">
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
            {cards.map(card => (
              <PostCard key={card.id} post={card} />
            ))}
          </div>
        </section>
      </main>
      {/* Vanilla ESM munja search island (public/search.js) — not a Client
          Component, since it needs no React state or hydration, just raw DOM
          APIs against the markup above. A plain <script> tag renders as
          literal HTML from a Server Component and is fully supported by
          `output: "export"` (the Static Exports guide's "Client Components"
          and "Browser APIs" sections only gate React state/hydration
          concerns, not hand-written <script> tags); next/script's loading
          strategies (beforeInteractive/afterInteractive/lazyOnload) exist to
          optimize *when* a script runs relative to hydration, which this
          static-export app has no use for. */}
      <script type="module" src={assetUrl("search.js")}></script>
    </>
  );
}
