import type { AppProps } from "next/app";
// Global CSS may only be imported from _app.tsx in the Pages Router — Next
// rejects it anywhere deeper in the tree. Header/Footer are NOT wrapped
// here: kudzu's <Footer /><script .../> DOM order (script after Footer,
// present only on the home/archive pages) is part of the ported markup, so
// each page composes its own Header/Footer instead of a shared _app shell —
// see src/pages/index.tsx.
import "../styles/style.css";
import "../styles/content.css";

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
