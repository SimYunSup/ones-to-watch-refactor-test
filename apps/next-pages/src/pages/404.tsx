import Head from "next/head";
import Header from "../components/Header";
import Footer from "../components/Footer";

// Static export's 404 page (see next.config.mjs — `output: "export"` writes
// this to out/404.html, which GitHub Pages serves automatically for any
// unmatched path). kudzu has no error route to port markup from, so this
// mirrors apps/react-router/app/root.tsx's ErrorBoundary and
// apps/tanstack-router/src/routes/__root.tsx's notFoundComponent (identical
// in both) for visual parity with the other variants — see .error-page in
// src/styles/style.css.
export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>페이지를 찾을 수 없습니다 | OTW for FE</title>
      </Head>
      <Header />
      <main className="error-page">
        <p className="mono-eyebrow">// 404</p>
        <h1>페이지를 찾을 수 없습니다</h1>
      </main>
      <Footer />
    </>
  );
}
