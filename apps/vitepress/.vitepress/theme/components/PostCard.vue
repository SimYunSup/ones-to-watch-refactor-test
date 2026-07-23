<script setup lang="ts">
// Ported from apps/kudzu/src/components/PostCard.tsx — same `.row`/`.thumb`/
// `.title`/`.date` markup and class names.
import type { PostCardData } from "../lib/types";

const { post } = defineProps<{ post: PostCardData }>();
const dateLabel = post.date ? new Intl.DateTimeFormat("ko-KR").format(new Date(post.date)) : null;
</script>

<template>
  <a class="row" :href="post.href">
    <span class="thumb">
      <img v-if="post.coverUrl" :src="post.coverUrl" alt="" loading="lazy" />
      <template v-else>thumbnail</template>
    </span>
    <span class="title">{{ post.title }}</span>
    <span v-if="dateLabel" class="date">{{ dateLabel }}</span>
  </a>
</template>
