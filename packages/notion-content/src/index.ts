import { readFile } from "node:fs/promises";
import { APIErrorCode, Client, isFullPage, isNotionClientError, iteratePaginatedAPI } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client";
import { collectBlocks } from "./blocks.js";
import { fileToUrl, richTextToPlainText } from "./format.js";
import { createProcessor } from "./processor.js";
import type { NewsEntry } from "./types.js";

export type { NewsEntry, NewsHeading } from "./types.js";
export type { SearchDoc } from "./search.js";
export {
  htmlToText,
  entriesToSearchDocs,
  buildSearchIndexBytes,
  writeSearchIndexFile,
} from "./search.js";

export interface FetchNewsEntriesOptions {
  auth?: string;
  databaseId?: string;
}

// Memoized per (auth, databaseId) pair for the lifetime of the process, so
// every route/page built by a static site generator that calls
// `fetchNewsEntries()` shares one Notion fetch instead of re-querying per call.
const entriesByCacheKey = new Map<string, Promise<NewsEntry[]>>();

/**
 * Fetch every "New"-status entry from the configured Notion news database,
 * fully rendered to HTML, sorted by date descending.
 *
 * Resolves to an empty array (after a console warning) when `NOTION_TOKEN`
 * or `NOTION_DATABASE_ID` are unset, so builds without repo secrets still
 * succeed.
 */
export function fetchNewsEntries(options: FetchNewsEntriesOptions = {}): Promise<NewsEntry[]> {
  const auth = options.auth ?? process.env.NOTION_TOKEN;
  const databaseId = options.databaseId ?? process.env.NOTION_DATABASE_ID;
  // Include the cache path in the memo key so (auth, databaseId, cache) each
  // resolve to a single load: a process reading a prebuilt cache and one
  // fetching live never share the same memoized promise.
  const cachePath = process.env.NOTION_CONTENT_CACHE;
  const cacheKey = `${auth ?? ""}::${databaseId ?? ""}::${cachePath ?? ""}`;

  let entries = entriesByCacheKey.get(cacheKey);
  if (!entries) {
    entries = loadNewsEntries(auth, databaseId, cachePath);
    entriesByCacheKey.set(cacheKey, entries);
  }
  return entries;
}

async function loadNewsEntries(
  auth: string | undefined,
  databaseId: string | undefined,
  cachePath: string | undefined
): Promise<NewsEntry[]> {
  // Prefer a prebuilt cache when NOTION_CONTENT_CACHE points at one. The CI
  // `prefetch` job queries Notion once and writes news-entries.json; every
  // parallel matrix build then reads that file instead of re-fetching, which
  // is the main defense against 429 rate limits. A missing or malformed cache
  // falls back to a live fetch — loudly (warn with path and reason), never
  // silently — so local builds and cache-write failures still succeed.
  if (cachePath) {
    try {
      const raw = await readFile(cachePath, "utf8");
      const parsed = JSON.parse(raw) as { entries?: NewsEntry[] };
      if (!Array.isArray(parsed.entries)) {
        throw new Error("cache is missing an `entries` array");
      }
      return parsed.entries;
    } catch (error) {
      console.warn(
        `@otw/notion-content: failed to load cache ${cachePath}, falling back to a live Notion fetch: ${errorMessage(error)}`
      );
    }
  }

  if (!auth || !databaseId) {
    console.warn(
      "@otw/notion-content: NOTION_TOKEN or NOTION_DATABASE_ID not set; returning an empty list."
    );
    return [];
  }

  // Raise maxRetries above the SDK default (2) so transient 429s back off and
  // retry (the SDK honors the retry-after header) instead of surfacing as a
  // hard error mid-build.
  const client = new Client({ auth, retry: { maxRetries: 5 } });

  // A Notion database can contain multiple data sources; query the first one.
  const database: any = await client.databases.retrieve({ database_id: databaseId });
  const dataSources = "data_sources" in database ? database.data_sources : [];
  if (!dataSources || dataSources.length === 0) {
    console.warn(
      `@otw/notion-content: database ${databaseId} has no data sources; returning an empty list.`
    );
    return [];
  }
  const dataSourceId = dataSources[0].id as string;

  const pages = iteratePaginatedAPI(client.dataSources.query, {
    data_source_id: dataSourceId,
    filter: { property: "Status", select: { equals: "New" } },
  });

  const entries: NewsEntry[] = [];
  for await (const page of pages) {
    if (!isFullPage(page)) {
      continue;
    }
    const entry = await renderPage(client, page);
    if (entry) {
      entries.push(entry);
    }
  }

  // Descending by date; entries without a date (empty string, coerced from
  // null) sort last since "" precedes every ISO 8601 date string.
  entries.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  return entries;
}

async function renderPage(client: Client, page: PageObjectResponse): Promise<NewsEntry | null> {
  // Workspace-specific property names ("이름", "날짜") have no compile-time
  // schema in the SDK's generic `properties: Record<string, ...>` — cast to
  // the minimal shape this code actually reads instead of relying on
  // discriminated-union narrowing over an index-signature type.
  const titleProperty = page.properties.이름 as { type?: string; title?: Array<{ plain_text: string }> } | undefined;
  const title = titleProperty?.type === "title" && titleProperty.title ? richTextToPlainText(titleProperty.title) : "";
  const dateProperty = page.properties.날짜 as { type?: string; date?: { start: string } | null } | undefined;
  const date = dateProperty?.type === "date" ? (dateProperty.date?.start ?? null) : null;
  const coverUrl = page.cover ? (fileToUrl(page.cover) ?? null) : null;

  try {
    const blocks = await collectBlocks(client, page.id);
    const { html, headings } = await createProcessor().process(blocks);
    return { id: page.id, title, date, coverUrl, html, headings };
  } catch (error) {
    // A rate-limit or unavailable-service error means Notion throttled us, not
    // that this page is malformed. Swallowing it here would silently drop a
    // real post from the deployed site, so rethrow to fail the build loudly.
    // Every other render error (a genuinely broken page) stays warn-and-skip.
    if (
      isNotionClientError(error) &&
      (error.code === APIErrorCode.RateLimited ||
        error.code === APIErrorCode.ServiceUnavailable)
    ) {
      throw error;
    }
    console.warn(
      `@otw/notion-content: failed to render page ${page.id} (${title || "untitled"}): ${errorMessage(error)}`
    );
    return null;
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "Unknown error";
}
