import { Html, Head, Main, NextScript } from "next/document";
import { assetUrl } from "../lib/site";

// Rendered once per generated HTML file (Pages Router convention, unlike
// _app which re-renders per route) — the right place for attributes and
// tags that never change across routes: the ko lang attribute and the
// favicon link, whose href needs the manual BASE_PATH prefix next/link
// gets for free (see src/lib/site.ts).
export default function Document() {
  return (
    <Html lang="ko">
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={assetUrl("favicon.svg")} type="image/svg+xml" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
