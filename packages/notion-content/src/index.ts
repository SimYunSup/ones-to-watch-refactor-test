import { Client, isFullPage, iteratePaginatedAPI } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client";
import { collectBlocks } from "./blocks.js";
import { fileToUrl, richTextToPlainText } from "./format.js";
import { createProcessor } from "./processor.js";
import type { NewsEntry } from "./types.js";

export type { NewsEntry, NewsHeading } from "./types.js";

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
  const cacheKey = `${auth ?? ""}::${databaseId ?? ""}`;

  let entries = entriesByCacheKey.get(cacheKey);
  if (!entries) {
    entries = loadNewsEntries(auth, databaseId);
    entriesByCacheKey.set(cacheKey, entries);
  }
  return entries;
}

async function loadNewsEntries(
  auth: string | undefined,
  databaseId: string | undefined
): Promise<NewsEntry[]> {
  if (!auth || !databaseId) {
    console.warn(
      "@otw/notion-content: NOTION_TOKEN or NOTION_DATABASE_ID not set; returning an empty list."
    );
    return [];
  }

  const client = new Client({ auth });

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
