<!-- The `[data-munja]`/`.munja-input`/`.munja-panel` markup public/search.js
     (vanilla ESM, loaded via a <script type="module"> tag in Layout.vue)
     wires up client-side — this component only renders the static shell so
     it renders identically during SSG. Ported from apps/kudzu/src/pages/
     index.tsx and news/list/[page].tsx, which inline this same markup on
     both the home and archive pages; VitePress's custom-theme SFCs let us
     share it instead of duplicating it per page. -->
<template>
  <div class="munja-search" data-munja>
    <div class="munja-field">
      <svg
        class="munja-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>
      <input
        class="munja-input"
        type="search"
        placeholder="뉴스레터 검색…"
        aria-label="뉴스레터 검색"
        autocomplete="off"
        spellcheck="false"
      />
    </div>
    <ul class="munja-panel" role="listbox" aria-label="검색 결과" hidden></ul>
  </div>
</template>
