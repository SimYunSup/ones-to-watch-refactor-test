import type { GetStaticPaths, GetStaticProps, InferGetStaticPropsType } from "next";
import type { ParsedUrlQuery } from "node:querystring";
import Head from "next/head";
import { fetchNewsEntries } from "@otw/notion-content";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";

interface PostPageParams extends ParsedUrlQuery {
  id: string;
}

// `output: "export"` only supports `fallback: false` (see next.config.mjs
// and news/list/[page].tsx). An empty collection returns `paths: []`, so no
// post pages are built at all — any /news/post/* URL then 404s, which is
// exactly what an empty archive should serve.
export const getStaticPaths: GetStaticPaths<PostPageParams> = async () => {
  const entries = await fetchNewsEntries();

  return {
    paths: entries.map(entry => ({ params: { id: entry.id } })),
    fallback: false
  };
};

interface PostPageProps {
  title: string;
  date: string | null;
  coverUrl: string | null;
  html: string;
}

export const getStaticProps: GetStaticProps<PostPageProps, PostPageParams> = async ({ params }) => {
  const entries = await fetchNewsEntries();
  // Safe non-null assertion: getStaticPaths above only ever emits params
  // whose id came from the same fetchNewsEntries() call (memoized per
  // process), so every id getStaticProps receives here is guaranteed present.
  const entry = entries.find(item => item.id === params!.id)!;

  return {
    props: {
      title: entry.title,
      date: entry.date,
      coverUrl: entry.coverUrl,
      html: entry.html
    }
  };
};

export default function NewsPostPage({
  title,
  date,
  coverUrl,
  html
}: InferGetStaticPropsType<typeof getStaticProps>) {
  const dateLabel = date ? new Intl.DateTimeFormat("ko-KR").format(new Date(date)) : null;

  return (
    <>
      <Head>
        <title>{title} | OTW for FE</title>
      </Head>
      <Header />
      <main className="post-page">
        {coverUrl && (
          <div className="image-container">
            <img src={coverUrl} alt="" />
          </div>
        )}
        <h1 className="title">{title}</h1>
        {dateLabel && (
          <div className="description">
            <p>{dateLabel}</p>
          </div>
        )}
        <article className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
      </main>
      <Footer />
    </>
  );
}
