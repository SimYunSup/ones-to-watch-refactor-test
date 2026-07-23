import React from "react";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

// Swizzles Docusaurus's fallback `@theme/Layout` — a bare
// `<>{children}</>` pass-through shipped by @docusaurus/core itself when no
// theme package provides one (theme-fallback/Layout) — with the
// kudzu-ported chrome. `website/src/theme/*` always wins over any
// theme/plugin-provided or fallback component at this alias; see "Client
// architecture > Theme aliases"
// (https://docusaurus.io/docs/advanced/client#theme-aliases). Every route
// component under src/routes/ imports `@theme/Layout` explicitly (addRoute
// does not auto-wrap components), and so does the core's own fallback
// `@theme/NotFound` (theme-fallback/NotFound imports `@theme/Layout`) — so
// swizzling this one file gives every page, including the 404, consistent
// header/footer without a classic theme.
export default function Layout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}
