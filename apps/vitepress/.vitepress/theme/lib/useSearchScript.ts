import { onMounted } from "vue";
import { BASE } from "./site";

/**
 * Loads public/search.js (kudzu's vanilla-ESM munja search client, reused
 * as-is — see public/search.js's own header) on pages that render
 * `[data-munja]` markup (HomeView.vue, ArchiveView.vue).
 *
 * A Vue SFC `<template>` cannot contain a literal `<script>` tag — the
 * compiler rejects "tags with side effect" there — so this injects it
 * imperatively in `onMounted`, the documented Vue 3 workaround for loading
 * an external script from within a component.
 *
 * VitePress's SPA router swaps page components without a full reload, and
 * the browser's module map only ever fetches/evaluates a given module URL
 * once per document — re-inserting an identical `<script type="module"
 * src="…/search.js">` a second time (e.g. navigating home → archive → home)
 * would silently no-op, leaving the *new* page's `[data-munja]` element
 * unbound, since search.js's top-level `querySelectorAll` already ran once
 * against the previous page's (now-removed) nodes. A `?t=` cache-busting
 * query makes every mount a distinct module URL, forcing a fresh
 * evaluation against the current page's DOM. This does mean munja's wasm
 * module gets re-instantiated on every home/archive visit rather than once
 * per session — acceptable for this app's traffic, and the only way to
 * keep public/search.js itself byte-for-byte identical to kudzu's.
 */
export function useSearchScript(): void {
  onMounted(() => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = `${BASE}/search.js?t=${Date.now()}`;
    document.head.appendChild(script);
  });
}
