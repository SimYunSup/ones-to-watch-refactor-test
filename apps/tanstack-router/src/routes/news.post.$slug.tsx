import { createFileRoute, notFound } from "@tanstack/react-router";
import type { NewsEntry } from "@otw/notion-content";
import { fetchNewsEntries } from "../server/fetchNewsEntries";

export const Route = createFileRoute("/news/post/$slug")({
  loader: async ({ params }): Promise<NewsEntry> => {
    const entries = await fetchNewsEntries();
    const entry = entries.find((item) => item.id === params.slug);
    if (!entry) {
      throw notFound();
    }
    return entry;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData ? `${loaderData.title} | OTW for FE` : "OTW for FE" }],
  }),
  component: NewsPost,
});

function NewsPost() {
  const entry = Route.useLoaderData();
  const dateLabel = entry.date
    ? new Intl.DateTimeFormat("ko-KR").format(new Date(entry.date))
    : null;

  return (
    <main className="container">
      <article>
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
        <div
          className="markdown-body"
          // Notion content is rendered to HTML at build time by
          // @otw/notion-content; there is no client-side data source to
          // sanitize against, only the pre-baked static string.
          dangerouslySetInnerHTML={{ __html: entry.html }}
        />
      </article>
    </main>
  );
}
