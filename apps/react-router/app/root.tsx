import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
  type MetaFunction,
} from "react-router";
import Header from "./components/Header";
import Footer from "./components/Footer";
import "./styles/global.css";
import "./styles/home.css";
import "./styles/list-page.css";
import "./styles/content.css";

const faviconHref = `${import.meta.env.BASE_URL}favicon.svg`;

export const meta: MetaFunction = () => [
  { title: "Ones To Watch for FrontEnd" },
  { name: "description", content: "매주 프론트엔드 소식을 정리해서 보내드립니다." },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href={faviconHref} type="image/svg+xml" />
        <Meta />
        <Links />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const status = isRouteErrorResponse(error) ? error.status : 500;
  const message =
    status === 404 ? "페이지를 찾을 수 없습니다" : "문제가 발생했습니다";

  return (
    <main className="error-page">
      <p className="mono-eyebrow">// {status}</p>
      <h1>{message}</h1>
    </main>
  );
}
