import {
  useLoaderData,
  type LoaderFunctionArgs,
  type MetaFunction,
} from "react-router";
import { fetchNewsEntries, type NewsEntry } from "@otw/notion-content";

export async function loader({
  params,
}: LoaderFunctionArgs): Promise<NewsEntry> {
  const slug = params.slug;
  if (!slug) {
    throw new Response("Not Found", { status: 404 });
  }

  const entries = await fetchNewsEntries();
  const entry = entries.find((item) => item.id === slug);
  if (!entry) {
    throw new Response("Not Found", { status: 404 });
  }

  return entry;
}

export const meta: MetaFunction = ({ loaderData }) => {
  const entry = loaderData as NewsEntry | undefined;
  return [{ title: entry ? `${entry.title} | OTW for FE` : "OTW for FE" }];
};

export default function NewsPost() {
  const entry = useLoaderData<NewsEntry>();
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
