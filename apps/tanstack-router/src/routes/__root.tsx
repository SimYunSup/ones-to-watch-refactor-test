/// <reference types="vite/client" />
import type { ReactNode } from "react";
import { HeadContent, Scripts, createRootRoute } from "@tanstack/react-router";
import Header from "../components/Header";
import Footer from "../components/Footer";
import "../styles/global.css";
import "../styles/home.css";
import "../styles/list-page.css";
import "../styles/content.css";
import "../styles/search.css";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Ones To Watch for FrontEnd" },
      {
        name: "description",
        content: "매주 프론트엔드 소식을 정리해서 보내드립니다.",
      },
    ],
    links: [
      {
        rel: "icon",
        href: `${import.meta.env.BASE_URL}favicon.svg`,
        type: "image/svg+xml",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="error-page">
      <p className="mono-eyebrow">// 404</p>
      <h1>페이지를 찾을 수 없습니다</h1>
    </main>
  ),
  shellComponent: RootDocument,
});

// The router hands the matched child route tree's rendered output as
// `children` here — this shell is the single place `<html>`/`<head>`/
// `<body>` are declared, per Start's root-route contract.
function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <Scripts />
      </body>
    </html>
  );
}
