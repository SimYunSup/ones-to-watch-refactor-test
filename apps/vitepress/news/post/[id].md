---
layout: post
title: OTW for FE
titleTemplate: false
lang: ko
---

<!--
  Dynamic route body (see [id].paths.ts): Layout.vue renders PostView.vue
  instead of <Content /> whenever frontmatter.layout is "post", so this body
  is intentionally empty. The real per-post <title> ("<title> | OTW for FE")
  comes from `params.title` via .vitepress/config.ts's transformPageData
  hook — see news/list/[page].md's comment for why frontmatter itself can't
  interpolate `$params`.
-->
