import React from "react";
import Head from "@docusaurus/Head";
import Layout from "@theme/Layout";

// Swizzles Docusaurus's fallback `@theme/NotFound` (theme-fallback/NotFound,
// which renders plain English "Oops, page not found" text) with a
// Korean-copy 404 matching the sibling variants' shared wording, e.g.
// apps/tanstack-router/src/routes/__root.tsx's errorComponent
// ("// 404" / "페이지를 찾을 수 없습니다"). Docusaurus renders this
// component automatically for the router's catch-all "*" route — see
// client/exports/ComponentCreator.js's `if (path === '*') { loader: () =>
// import('@theme/NotFound') }` — no addRoute call is needed for it.
export default function NotFound(): React.ReactElement {
  return (
    <>
      <Head>
        <title>페이지를 찾을 수 없습니다 | OTW for FE</title>
      </Head>
      <Layout>
        <main className="archive">
          <p className="mono-eyebrow">// 404</p>
          <h1 className="archive-title">페이지를 찾을 수 없습니다</h1>
        </main>
      </Layout>
    </>
  );
}
