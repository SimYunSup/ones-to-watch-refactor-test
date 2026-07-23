import React from "react";
import useBaseUrl from "@docusaurus/useBaseUrl";

// Ported from apps/kudzu/src/components/Header.tsx (markup/classes kept
// identical for the shared visual-diff/e2e suite). Kudzu hand-rolls a
// site-relative `siteUrl()` helper because it has no baseUrl concept; here
// `useBaseUrl()` is the framework-native equivalent
// (https://docusaurus.io/docs/static-assets#in-jsx) and stays correct if
// `baseUrl` in docusaurus.config.js ever changes.
export default function Header(): React.ReactElement {
  const homeUrl = useBaseUrl("/");
  const archiveUrl = useBaseUrl("/news/list/1");

  return (
    <header className="header">
      <div className="container">
        <a className="logo" href={homeUrl}>
          OTW <span className="logo-sub">for</span> FE
        </a>
        <a className="link" href={archiveUrl}>
          Archive
        </a>
      </div>
    </header>
  );
}
