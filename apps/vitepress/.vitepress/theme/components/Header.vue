<script setup lang="ts">
import { BASE } from "../lib/site";
</script>

<template>
  <header class="header">
    <div class="container">
      <a class="logo" :href="`${BASE}/`">
        OTW <span class="logo-sub">for</span> FE
      </a>
      <a class="link" :href="`${BASE}/news/list/1`">Archive</a>
    </div>
  </header>
</template>
