<script setup lang="ts">
// Ported from apps/kudzu/src/pages/news/post/[slug].tsx — same section
// structure and class names. `params` comes from
// news/post/[id].paths.ts's `paths()` return value, including the fully
// rendered `entry.html` (injected via v-html, per this app's brief) —
// VitePress's own docs (Build-Time Data Loading > Rendering Raw Content)
// note params get serialized into the client bundle and steer heavy HTML
// toward the `content`/`<!-- @content -->` mechanism instead, but that
// mechanism re-runs the HTML through markdown-it + the Vue template
// compiler, which risks mangling already-rendered Notion HTML; params +
// v-html (matching every other variant's dangerouslySetInnerHTML/v-html
// approach) keeps the injected markup byte-for-byte.
import { useData } from "vitepress";
import type { Ref } from "vue";
import Header from "./Header.vue";
import Footer from "./Footer.vue";

interface PostParams {
  title: string;
  date: string | null;
  coverUrl: string | null;
  html: string;
}

const { params } = useData();
const post = params as unknown as Ref<PostParams>;
const dateLabel = post.value.date
  ? new Intl.DateTimeFormat("ko-KR").format(new Date(post.value.date))
  : null;
</script>

<template>
  <Header />
  <main class="post-page">
    <div v-if="post.coverUrl" class="image-container">
      <img :src="post.coverUrl" alt="" />
    </div>
    <h1 class="title">{{ post.title }}</h1>
    <div v-if="dateLabel" class="description">
      <p>{{ dateLabel }}</p>
    </div>
    <article class="markdown-body" v-html="post.html"></article>
  </main>
  <Footer />
</template>
