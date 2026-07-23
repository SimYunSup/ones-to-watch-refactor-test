<script setup lang="ts">
// Root layout for every page (VitePress custom-theme contract —
// https://vitepress.dev/guide/custom-theme#building-a-layout). Branches on
// `page.isNotFound` first (VitePress's own not-found signal, so no
// dedicated 404.md source file is needed — see NotFoundView.vue) and then
// on the `layout` frontmatter each page/paths-loader sets, mirroring the
// astro variant's per-page layout selection.
import { useData } from "vitepress";
import HomeView from "./components/HomeView.vue";
import ArchiveView from "./components/ArchiveView.vue";
import PostView from "./components/PostView.vue";
import NotFoundView from "./components/NotFoundView.vue";

const { page, frontmatter } = useData();
</script>

<template>
  <NotFoundView v-if="page.isNotFound" />
  <HomeView v-else-if="frontmatter.layout === 'home'" />
  <ArchiveView v-else-if="frontmatter.layout === 'archive'" />
  <PostView v-else-if="frontmatter.layout === 'post'" />
</template>
