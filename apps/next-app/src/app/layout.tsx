import type { ReactNode } from "react";
import type { Metadata } from "next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { BASE_PATH } from "../lib/site";
// App Router requires global (non-module) CSS to be imported from the root
// layout — importing style.css/content.css per-page, like kudzu does, is
// rejected at build time.
// https://nextjs.org/docs/app/getting-started/css#global-css
import "../styles/style.css";
import "../styles/content.css";

export const metadata: Metadata = {
  title: {
    default: "Ones To Watch for FrontEnd",
    template: "%s | OTW for FE"
  },
  description: "매주 프론트엔드 소식을 정리해서 보내드립니다.",
  // Next's metadata `icons` field is not basePath-aware for hand-written
  // paths — only next/link and next/image get the automatic prefix
  // (next.config.ts) — so this is prefixed manually with the same constant
  // every other hand-authored asset URL in this app uses.
  icons: {
    icon: `${BASE_PATH}/favicon.svg`
  }
};

// Unlike apps/next-pages (Pages Router), where Header/Footer are composed
// per-page to preserve kudzu's `<Footer /><script>` DOM order exactly, the
// idiomatic App Router shape is a shared root layout: every route —
// including news/post/[id], which has no search island — gets Header above
// and Footer below its page content here. The search
// `<script type="module">` tag still needs per-page placement (only the
// home and archive pages render it), but its position relative to Footer
// doesn't change behavior: module scripts are deferred by spec
// (https://developer.mozilla.org/docs/Web/HTML/Element/script#module), so
// it still runs only after the whole document — including the elements its
// `querySelectorAll("[data-munja]")` needs — has parsed, regardless of
// where in the DOM it sits.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
