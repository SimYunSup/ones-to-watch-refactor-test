import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchNewsEntries } from "@otw/notion-content";

interface PostPageParams {
  id: string;
}

// A Notion page id never collides with this sentinel (ids are UUIDs; see
// apps/kudzu/src/pages/news/post/[slug].tsx's routeFromPage comment on the
// same guarantee), so it's safe to use as a "no real posts" placeholder.
const EMPTY_PLACEHOLDER_ID = "_none";

// `output: "export"` throws `Page "..." is missing "generateStaticParams()"
// so it cannot be used with "output: export" config.` whenever
// generateStaticParams resolves to an *empty* array for a dynamic route —
// not just when the function is missing entirely. Verified against
// packages/next/src/build/index.ts (canary, as of Next 16.2.11): the check
// is `hasGenerateStaticParams = workerResult.prerenderedRoutes &&
// workerResult.prerenderedRoutes.length > 0`, gating
// `if (config.output === "export" && isDynamic && !hasGenerateStaticParams)
// throw ...` — a real function returning `[]` yields the same
// `prerenderedRoutes.length === 0` as no function at all, so it trips the
// identical throw. This differs from apps/next-pages/src/pages/news/post/
// [id].tsx's Pages Router equivalent, where `getStaticPaths` returning
// `{ paths: [], fallback: false }` for an empty collection is completely
// legal — the App Router has no equivalent affordance.
//
// So when there are zero entries, this emits exactly one static path built
// around a placeholder id instead of zero paths, with `dynamicParams: false`
// below closing off every other id. The page component treats "no matching
// entry" (true for the placeholder, and for any id that isn't in the
// current entry list) identically: notFound(), rendering
// src/app/not-found.tsx. That one throwaway route
// (/news/post/_none/) is otherwise unreachable — nothing in this app links
// to it, since every real PostCard/munja hit href is built from an actual
// entry id.
export async function generateStaticParams(): Promise<PostPageParams[]> {
  const entries = await fetchNewsEntries();
  if (entries.length === 0) {
    return [{ id: EMPTY_PLACEHOLDER_ID }];
  }
  return entries.map(entry => ({ id: entry.id }));
}

// Every id this route can serve is enumerated above; treat anything else —
// including a stale id from a previous Notion sync — as 404 rather than the
// (unsupported under output: "export") blocking-render default.
export const dynamicParams = false;

async function findEntry(id: string) {
  if (id === EMPTY_PLACEHOLDER_ID) return undefined;
  const entries = await fetchNewsEntries();
  return entries.find(entry => entry.id === id);
}

export async function generateMetadata({
  params
}: {
  params: Promise<PostPageParams>;
}): Promise<Metadata> {
  const { id } = await params;
  const entry = await findEntry(id);
  return { title: entry?.title ?? "페이지를 찾을 수 없습니다" };
}

export default async function NewsPostPage({ params }: { params: Promise<PostPageParams> }) {
  const { id } = await params;
  const entry = await findEntry(id);
  if (!entry) {
    notFound();
  }

  const dateLabel = entry.date ? new Intl.DateTimeFormat("ko-KR").format(new Date(entry.date)) : null;

  return (
    <main className="post-page">
      {entry.coverUrl && (
        <div className="image-container">
          <img src={entry.coverUrl} alt="" />
        </div>
      )}
      <h1 className="title">{entry.title}</h1>
      {dateLabel && (
        <div className="description">
          <p>{dateLabel}</p>
        </div>
      )}
      <article
        className="markdown-body"
        // Notion content is rendered to HTML at build time by
        // @otw/notion-content; there is no client-side data source to
        // sanitize against, only the pre-baked static string.
        dangerouslySetInnerHTML={{ __html: entry.html }}
      />
    </main>
  );
}
