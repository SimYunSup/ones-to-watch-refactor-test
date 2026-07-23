// Custom theme entry (https://vitepress.dev/guide/custom-theme) — the
// default theme's docs/blog chrome (nav, sidebar, DocSearch) is dropped
// entirely; Layout.vue is the only required export, and it renders the
// kudzu-ported markup directly instead of `<Content />`.
import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import "./style.css";
import "./content.css";

export default {
  Layout,
} satisfies Theme;
