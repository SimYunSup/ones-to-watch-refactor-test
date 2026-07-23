<!-- Ported from apps/react-router/app/root.tsx's ErrorBoundary /
     apps/tanstack-router/src/routes/__root.tsx's notFoundComponent — same
     `.error-page` / `.mono-eyebrow` markup and copy. Rendered by Layout.vue
     whenever `useData().page.isNotFound` is true (VitePress's own
     not-found signal — see https://vitepress.dev/guide/custom-theme, no
     dedicated 404.md file is needed). -->
<template>
  <main class="error-page">
    <p class="mono-eyebrow">// 404</p>
    <h1>페이지를 찾을 수 없습니다</h1>
  </main>
</template>
