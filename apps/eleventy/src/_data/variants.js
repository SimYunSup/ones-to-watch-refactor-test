// Every static variant links to the other nine (see
// apps/kudzu/src/components/Footer.tsx for the pattern this is ported
// from). astro's entry point is /home, not /; every other variant serves
// its index at the bare subpath root.
export default [
  { key: "astro", label: "astro", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/astro/home" },
  {
    key: "react-router",
    label: "react-router",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/react-router/"
  },
  { key: "tanstack", label: "tanstack", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/tanstack/" },
  { key: "kudzu", label: "kudzu", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/kudzu/" },
  { key: "hugo", label: "hugo", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/hugo/" },
  { key: "vitepress", label: "vitepress", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/vitepress/" },
  {
    key: "docusaurus",
    label: "docusaurus",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/docusaurus/"
  },
  { key: "eleventy", label: "eleventy", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/eleventy/" },
  { key: "next-app", label: "next-app", href: "https://simyunsup.github.io/ones-to-watch-refactor-test/next-app/" },
  {
    key: "next-pages",
    label: "next-pages",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/next-pages/"
  }
];
