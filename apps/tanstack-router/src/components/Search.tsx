// munja search island — dictionary-free CJK/Latin full-text search running
// entirely in the browser against the prebuilt /index.bin (written by
// scripts/build-search-index.mjs at build time). Ported from
// apps/web/src/components/Search.astro's markup/behavior/CSS.
//
// TanStack Start renders this component on the server during SSR/prerender,
// so the wasm module is loaded via a `useEffect`-scoped dynamic `import()`
// rather than a top-level import — nothing wasm-related is ever evaluated
// outside the browser. `munja_bg.wasm?url` stays a static import: Vite
// resolves that to a plain string (the asset URL), so importing it at
// module scope is inert on the server and avoids an extra dynamic-import
// round trip for something that is never itself wasm.
import { useEffect, useRef, useState } from "react";
import wasmUrl from "@pickhealer/munja/munja_bg.wasm?url";

interface Hit {
  title: string;
  href: string;
  category: string;
  body: string;
}

type SearchJsonFn = (index: Uint8Array, query: string, max: number) => string;

const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c as "&" | "<" | ">" | '"' | "'"
      ]!
  );
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Build a ~80-char snippet centered on the first matched term, with every
// term wrapped in <mark> — this is what makes it obvious *why* a doc matched
// (e.g. an English word buried in Korean body text).
function snippetHtml(body: string, terms: string[]): string {
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

const base = () => import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Search() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const indexRef = useRef<Uint8Array | null>(null);
  const searchJsonRef = useRef<SearchJsonFn | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);

  useEffect(() => {
    readyRef.current = (async () => {
      // Dynamic import: TanStack Start renders this component on the server
      // for SSR/prerender, and this module instantiates a wasm binary. A
      // static top-level import would pull the wasm loader into the server
      // bundle; deferring it to a browser-only effect keeps SSR safe.
      const { default: init, search_json } = await import("@pickhealer/munja");
      await init(wasmUrl);
      searchJsonRef.current = search_json;
      const res = await fetch(`${base()}/index.bin`);
      if (!res.ok) throw new Error(`index.bin ${res.status}`);
      indexRef.current = new Uint8Array(await res.arrayBuffer());
    })().catch((e) => console.error("munja: failed to load index", e));
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setHits(null);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const runSearch = async (raw: string) => {
    await readyRef.current;
    const index = indexRef.current;
    const searchJson = searchJsonRef.current;
    if (!index || !searchJson || raw.trim() === "") {
      setHits(null);
      return;
    }
    try {
      setHits(JSON.parse(searchJson(index, raw, 8)) as Hit[]);
    } catch (e) {
      console.error("munja: search failed", e);
      setHits([]);
    }
  };

  const close = () => {
    setQuery("");
    setHits(null);
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
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={inputRef}
          className="munja-input"
          type="search"
          placeholder="뉴스레터 검색…"
          aria-label="뉴스레터 검색"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            void runSearch(e.target.value);
          }}
          onFocus={() => {
            if (query.trim() !== "") void runSearch(query);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              close();
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
        {hits !== null && hits.length === 0 && <li className="munja-empty">검색 결과가 없어요</li>}
        {hits !== null &&
          hits.map((h) => (
            <li role="option" key={h.href}>
              <a href={`${base()}/${h.href.replace(/^\//, "")}${qs}`}>
                <span className="munja-hit-head">
                  <span className="munja-hit-title">{h.title}</span>
                  <span className="munja-hit-cat">{h.category}</span>
                </span>
                <span
                  className="munja-hit-snippet"
                  dangerouslySetInnerHTML={{ __html: snippetHtml(h.body, terms) }}
                />
              </a>
            </li>
          ))}
      </ul>
    </div>
  );
}
