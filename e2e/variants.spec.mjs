// Core user-flow coverage for all four framework variants
// (astro/react-router/tanstack/kudzu), parametrized off the same VARIANTS
// list scripts/visual-diff.mjs and scripts/perf-bench.mjs already use so
// route paths never drift out of sync with the assembled Pages artifact
// (scripts/lib/site-server.mjs assembleSite/startServer, served locally by
// scripts/serve-site.mjs via playwright.config.mjs's webServer).
//
// Selectors were confirmed by reading each variant's markup directly:
//   - hero-title / features / feature-num / recent / recent-all: identical
//     class names across apps/web/src/pages/home.astro,
//     apps/{react-router,tanstack-router}/*/routes/{home,index}.tsx and
//     apps/kudzu/src/pages/index.tsx.
//   - archive-title / post-list / archive-empty: identical across
//     apps/web/src/pages/news/list/[page].astro and the three React
//     variants' news-list routes. IMPORTANT ASYMMETRY: only the three React
//     variants render a `.archive-empty` element when there are 0 posts —
//     apps/web/src/pages/news/list/[page].astro has no empty-state branch
//     at all (it unconditionally renders `<div class="post-list">`), so
//     astro has nothing to assert on an empty archive; see the post-detail
//     test below.
//   - markdown-body: the article content wrapper class, identical across
//     apps/web/src/pages/news/post/[slug].astro and the three React
//     variants' news-post routes.
//   - munja-input / munja-panel / [data-munja]: identical across
//     apps/web/src/components/Search.astro (astro),
//     apps/{react-router,tanstack-router}/*/components/Search.tsx, and
//     apps/kudzu's inline markup (src/pages/index.tsx,
//     src/pages/news/list/[page].tsx) + public/search.js.
//   - variant-switch / variant-link / is-active: identical across every
//     variant's Footer (apps/web/src/components/Footer.astro,
//     apps/{react-router,tanstack-router}/*/components/Footer.tsx,
//     apps/kudzu/src/components/Footer.tsx) — note these footer hrefs are
//     ABSOLUTE https://simyunsup.github.io/... URLs (not relative to this
//     local server), so this test only asserts presence/state and never
//     clicks them.
import { test, expect } from "@playwright/test";
import { BASE_PATH, VARIANTS, blockExternalRequests } from "../scripts/lib/site-server.mjs";

// Must match playwright.config.mjs's `use.baseURL` / `webServer.url` origin.
const SERVER_ORIGIN = "http://127.0.0.1:4173";

// Uncertain point: whether a local (secret-less) build ever produces >0
// posts is out of this suite's control — the post-detail test below
// branches on the actual card count instead of assuming either state.

test.beforeEach(async ({ page }) => {
  // Make navigation/asset loading deterministic: abort everything that
  // isn't served by our own static server (analytics beacons, the kit.com
  // subscribe embed, GitHub Pages links, web fonts, ...). Same-origin
  // assets — including /index.bin and the munja .wasm/.js module every
  // variant's search island fetches — are unaffected since they already
  // resolve under SERVER_ORIGIN.
  await blockExternalRequests(page, SERVER_ORIGIN);
});

/** Find the archive link on the home page. Prefers the home-page "전체 보기"
 * card link (present with the same `recent-all` class in all four variants);
 * falls back to the header's "Archive" nav link (present in
 * react-router/tanstack/kudzu, but not astro, which labels that link "News"
 * — see apps/web/src/components/Header.astro). Ported from the identical
 * helper in scripts/perf-bench.mjs. */
async function findArchiveLink(page) {
  const recentAll = page.locator("a.recent-all");
  if ((await recentAll.count()) > 0) return recentAll.first();
  const headerArchive = page.getByRole("link", { name: "Archive" });
  if ((await headerArchive.count()) > 0) return headerArchive.first();
  throw new Error("archive link not found (tried a.recent-all and role=link name=Archive)");
}

for (const variant of VARIANTS) {
  const homePath = `${BASE_PATH}${variant.paths.home}`;
  const archivePath = `${BASE_PATH}${variant.paths.archive}`;

  test.describe(`${variant.label} (${variant.key})`, () => {
    test("home renders hero, features and recent section", async ({ page }) => {
      await page.goto(homePath, { waitUntil: "load", timeout: 30_000 });

      const heroTitle = page.locator("h1.hero-title, .hero-title");
      await expect(heroTitle).toBeVisible();
      await expect(heroTitle).toContainText("Ones To Watch");

      await expect(page.locator(".feature")).toHaveCount(3);

      await expect(page.locator("section.recent, .recent")).toBeVisible();
    });

    test("home -> archive navigation", async ({ page }) => {
      await page.goto(homePath, { waitUntil: "load", timeout: 30_000 });

      const archiveLink = await findArchiveLink(page);
      await Promise.all([
        page.waitForSelector("h1.archive-title", { state: "visible", timeout: 15_000 }),
        archiveLink.click(),
      ]);

      await expect(page.locator("h1.archive-title")).toBeVisible();
      expect(page.url()).toContain("news/list/1");
    });

    test("archive -> post detail", async ({ page }) => {
      await page.goto(archivePath, { waitUntil: "load", timeout: 30_000 });

      const cards = page.locator(".post-list a");
      const cardCount = await cards.count();

      if (cardCount === 0) {
        // apps/web/src/pages/news/list/[page].astro has no empty-state
        // branch (see file-header comment) — nothing to assert for astro
        // beyond "no cards", so skip explicitly rather than asserting an
        // element that variant never renders.
        if (variant.key !== "astro") {
          await expect(page.locator(".archive-empty")).toBeVisible();
        }
        test.skip(
          true,
          `empty collection (local build has no Notion credentials, 0 posts) — no card to open for ${variant.key}`,
        );
        return;
      }

      await cards.first().click();
      await expect(page.locator(".markdown-body")).toBeVisible();
    });

    test("search island returns a visible panel", async ({ page }) => {
      await page.goto(homePath, { waitUntil: "load", timeout: 30_000 });

      // wasm init + index.bin fetch can take a moment on a cold local
      // server, hence the generous timeout below.
      await page.locator(".munja-input").fill("test");
      await expect(page.locator(".munja-panel")).toBeVisible({ timeout: 15_000 });
    });

    test("footer variant-switch links to every variant", async ({ page }) => {
      await page.goto(homePath, { waitUntil: "load", timeout: 30_000 });

      const links = page.locator("nav.variant-switch a.variant-link");
      await expect(links).toHaveCount(VARIANTS.length);

      const active = page.locator("nav.variant-switch a.variant-link.is-active");
      await expect(active).toHaveCount(1);
      await expect(active).toHaveText(variant.key);
    });
  });
}
