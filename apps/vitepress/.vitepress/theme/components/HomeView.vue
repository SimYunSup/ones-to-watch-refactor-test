<script setup lang="ts">
// Ported from apps/kudzu/src/pages/index.tsx — same section structure and
// class names. Unlike the dynamic list/post routes, the home page isn't
// itself a dynamic route (there's exactly one), so it pulls the full entry
// list straight from the `.data.ts` loader instead of going through a
// `.paths.ts` params payload.
import { data as entries } from "../newsEntries.data";
import { BASE, siteUrl } from "../lib/site";
import { useSearchScript } from "../lib/useSearchScript";
import type { PostCardData } from "../lib/types";
import Header from "./Header.vue";
import Footer from "./Footer.vue";
import HeroLogo from "./HeroLogo.vue";
import PostCard from "./PostCard.vue";
import SearchBox from "./SearchBox.vue";

const RECENT_COUNT = 8;

const cards: PostCardData[] = entries.slice(0, RECENT_COUNT).map((entry) => ({
  id: entry.id,
  title: entry.title,
  date: entry.date,
  coverUrl: entry.coverUrl,
  href: siteUrl(`news/post/${entry.id}`),
}));

useSearchScript();
</script>

<template>
  <Header />
  <main class="home">
    <section class="hero">
      <div class="hero-text">
        <p class="mono-eyebrow hero-eyebrow">// weekly frontend newsletter</p>
        <h1 class="hero-title">
          Ones To Watch
          <br />
          for FrontEnd
        </h1>
        <p class="hero-sub">주목할 만한 블로그를 모아두는 웹사이트</p>
        <p class="hero-fineprint">주 1회 발행 · 광고 없음 · 언제든 해지</p>
      </div>
      <HeroLogo />
    </section>

    <section class="features">
      <div class="features-inner">
        <div class="feature">
          <p class="feature-num">01</p>
          <h3 class="feature-title">Deep Insights</h3>
          <p class="feature-desc">기술적인 깊이가 있거나 방향성을 고민하게 만드는 글</p>
        </div>
        <div class="feature">
          <p class="feature-num">02</p>
          <h3 class="feature-title">Curated Archive</h3>
          <p class="feature-desc">주 1회 발행되는 프론트엔드 아카이브</p>
        </div>
        <div class="feature">
          <p class="feature-num">03</p>
          <h3 class="feature-title">Developer Focused</h3>
          <p class="feature-desc">프론트엔드 개발자에게 영감을 주는 인사이트</p>
        </div>
      </div>
    </section>

    <section class="recent">
      <div class="recent-head">
        <h2 class="recent-title">최근 뉴스레터</h2>
        <a class="recent-all" :href="`${BASE}/news/list/1`">전체 보기 →</a>
      </div>
      <div class="recent-search">
        <SearchBox />
      </div>
      <div class="post-list">
        <PostCard v-for="card in cards" :key="card.id" :post="card" />
      </div>
    </section>
  </main>
  <Footer />
</template>
