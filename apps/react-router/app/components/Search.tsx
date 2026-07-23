import { useEffect, useRef, useState } from "react";
import init, { search_json } from "@pickhealer/munja";
import wasmUrl from "@pickhealer/munja/munja_bg.wasm?url";

// munja search island — dictionary-free CJK/Latin full-text search running
// entirely in the browser against the prebuilt /index.bin (written by
// scripts/build-search-index.mjs at build time). No framework, no backend.
//
// Ported from apps/web/src/components/Search.astro. This route tree is
// server-prerendered (react-router.config.ts, `ssr: false` + `prerender`),
// so every bit of wasm/fetch/DOM work below runs inside `useEffect` — those
// never execute during prerendering, only after hydration in the browser.
// The component body itself renders nothing but static markup.
//
// Each result links to the post with `?q=<query>` so the destination page
// can natively highlight the matched terms (see routes/news-post.tsx).

interface Hit {
  title: string;
  href: string;
  category: string;
  body: string;
}

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build a ~80-char snippet centered on the first matched term, with every
// term wrapped in <mark> — this is what makes it obvious *why* a doc matched
// (e.g. an English word buried in Korean body text).
function snippet(body: string, terms: string[]): string {
  const lower = body.toLowerCase();
  let pos = -1;
  for (const t of terms) {
    const i = lower.indexOf(t);
    if (i !== -1 && (pos === -1 || i < pos)) pos = i;
  }
  const start = pos === -1 ? 0 : Math.max(0, pos - 30);
  const end = pos === -1 ? 90 : Math.min(body.length, pos + 50);
  let html = escapeHtml(body.slice(start, end));
  for (const t of terms) {
    if (t) html = html.replace(new RegExp(`(${escapeRe(t)})`, "gi"), "<mark>$1</mark>");
  }
  return (start > 0 ? "…" : "") + html + (end < body.length ? "…" : "");
}

const basePath = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Search() {
  const rootRef = useRef<HTMLDivElement>(null);
  const indexRef = useRef<Uint8Array | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);

  // Lazily init the wasm module + fetch the prebuilt index once, on mount.
  // Browser-only: never runs during SSR/prerender.
  useEffect(() => {
    readyRef.current = (async () => {
      await init(wasmUrl);
      const res = await fetch(`${basePath()}/index.bin`);
      if (!res.ok) throw new Error(`index.bin ${res.status}`);
      indexRef.current = new Uint8Array(await res.arrayBuffer());
    })().catch((e) => console.error("munja: failed to load index", e));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setHits(null);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const run = async (raw: string) => {
    await readyRef.current;
    const trimmed = raw.trim();
    if (!indexRef.current || trimmed === "") {
      setHits(null);
      return;
    }
    let result: Hit[] = [];
    try {
      result = JSON.parse(search_json(indexRef.current, trimmed, 8)) as Hit[];
    } catch (e) {
      console.error("munja: search failed", e);
    }
    setHits(result);
  };

  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const qs = `?q=${encodeURIComponent(query.trim())}`;

  return (
    <div className="munja-search" data-munja ref={rootRef}>
      <div className="munja-field">
        <svg
          className="munja-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="munja-input"
          type="search"
          placeholder="뉴스레터 검색…"
          aria-label="뉴스레터 검색"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            void run(value);
          }}
          onFocus={() => {
            if (query.trim() !== "") void run(query);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setQuery("");
              setHits(null);
            } else if (e.key === "Enter") {
              const first = rootRef.current?.querySelector<HTMLAnchorElement>(".munja-panel a");
              if (first) {
                e.preventDefault();
                window.location.href = first.href;
              }
            }
          }}
        />
      </div>
      <ul className="munja-panel" role="listbox" aria-label="검색 결과" hidden={hits === null}>
        {hits && hits.length === 0 && <li className="munja-empty">검색 결과가 없어요</li>}
        {hits?.map((h, i) => (
          <li role="option" key={`${h.href}-${i}`}>
            <a href={`${basePath()}/${h.href.replace(/^\//, "")}${qs}`}>
              <span className="munja-hit-head">
                <span className="munja-hit-title">{h.title}</span>
                <span className="munja-hit-cat">{h.category}</span>
              </span>
              <span
                className="munja-hit-snippet"
                dangerouslySetInnerHTML={{ __html: snippet(h.body, terms) }}
              />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
