<script setup lang="ts">
// Ported from apps/kudzu/src/pages/news/list/[page].tsx — same section
// structure and class names. `params` comes from
// news/list/[page].paths.ts's `paths()` return value (VitePress dynamic
// routes — https://vitepress.dev/guide/routing#dynamic-routes).
import { useData } from "vitepress";
import type { Ref } from "vue";
import Header from "./Header.vue";
import Footer from "./Footer.vue";
import PostCard from "./PostCard.vue";
import SearchBox from "./SearchBox.vue";
import { useSearchScript } from "../lib/useSearchScript";
import type { PostCardData } from "../lib/types";

interface ArchiveParams {
  page: string;
  prevHref: string | null;
  nextHref: string | null;
  cards: PostCardData[];
}

// `useData().params` is typed as the loose `PageData['params']`
// (`Record<string, any> | undefined`) regardless of `useData`'s generic —
// that generic only covers `theme`. The shape here is guaranteed by
// news/list/[page].paths.ts's `paths()` return value, so this cast is safe.
const { params } = useData();
const archive = params as unknown as Ref<ArchiveParams>;

useSearchScript();
</script>

<template>
  <Header />
  <main class="archive">
    <p class="mono-eyebrow">// archive</p>
    <h1 class="archive-title">뉴스레터 아카이브</h1>

    <div class="archive-search">
      <SearchBox />
    </div>

    <div class="post-list">
      <template v-if="archive.cards.length > 0">
        <PostCard v-for="card in archive.cards" :key="card.id" :post="card" />
      </template>
      <p v-else class="archive-empty">게시물이 없습니다</p>
    </div>

    <nav class="pager">
      <a v-if="archive.prevHref" class="pager-btn" :href="archive.prevHref">← 이전</a>
      <span v-else />
      <span class="pager-current">{{ archive.page }}</span>
      <a v-if="archive.nextHref" class="pager-btn" :href="archive.nextHref">다음 →</a>
      <span v-else />
    </nav>
  </main>
  <Footer />
</template>
