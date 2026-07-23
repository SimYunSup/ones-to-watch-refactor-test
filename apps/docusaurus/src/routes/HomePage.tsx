import React from "react";
import Layout from "@theme/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import HeroLogo from "../components/HeroLogo";
import PostCard, { type PostCardData } from "../components/PostCard";

// Route component for "/", registered by plugins/newsletter.js's
// contentLoaded via addRoute({component: "@site/src/routes/HomePage.tsx",
// modules: {data: homeDataPath}}). The `data` prop below is the parsed
// content of that generated JSON module — see "Lifecycle APIs >
// createData"/"addRoute" (https://docusaurus.io/docs/api/plugin-methods/lifecycle-apis).
// Markup/classes ported from apps/kudzu/src/pages/index.tsx.
export default function HomePage({
  data
}: {
  data: { cards: PostCardData[] };
}): React.ReactElement {
  const archiveUrl = useBaseUrl("/news/list/1");
  // Munja search is a vanilla ESM script (static/search.js, a plain static
  // asset — not compiled by webpack) — see plugins/newsletter.js postBuild
  // for how index.bin/munja/ land in build/.
  const searchScriptUrl = useBaseUrl("/search.js");

  return (
    <Layout>
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
            <a className="recent-all" href={archiveUrl}>
              전체 보기 →
            </a>
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
            {data.cards.map(card => (
              <HomeCard key={card.id} card={card} />
            ))}
          </div>
        </section>
      </main>
      <script type="module" src={searchScriptUrl}></script>
    </Layout>
  );
}

// A hook (useBaseUrl) may only be called from a function component, so the
// per-card post href — which kudzu's page computes inline before returning
// JSX — is derived here instead, once per card.
function HomeCard({ card }: { card: PostCardData }): React.ReactElement {
  const href = useBaseUrl(`/news/post/${card.id}`);
  return <PostCard post={card} href={href} />;
}
