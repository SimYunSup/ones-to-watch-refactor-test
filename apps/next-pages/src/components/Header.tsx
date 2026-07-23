import Link from "next/link";

// next.config.mjs's basePath auto-prefixes next/link hrefs, so — unlike
// kudzu's src/lib/site.ts siteUrl() helper — these route-relative paths
// need no manual BASE_PATH concatenation.
export default function Header() {
  return (
    <header className="header">
      <div className="container">
        <Link className="logo" href="/">
          OTW <span className="logo-sub">for</span> FE
        </Link>
        <Link className="link" href="/news/list/1">
          Archive
        </Link>
      </div>
    </header>
  );
}
