import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다"
};

// Rendered inside the root layout (Header above, Footer below via
// src/app/layout.tsx) whenever a route segment throws next/navigation's
// notFound() (see src/app/news/post/[id]/page.tsx) or a URL matches no
// route at all. Mirrors the other variants' `.error-page` treatment —
// apps/react-router/app/root.tsx's ErrorBoundary, apps/tanstack-router's
// __root.tsx notFoundComponent, apps/next-pages/src/pages/404.tsx, and
// apps/lume/src/404.vto — see src/styles/style.css's ported `.error-page`
// rule.
export default function NotFound() {
  return (
    <main className="error-page">
      <p className="mono-eyebrow">// 404</p>
      <h1>페이지를 찾을 수 없습니다</h1>
    </main>
  );
}
