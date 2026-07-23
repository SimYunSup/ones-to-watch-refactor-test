import React from "react";
import Layout from "@theme/Layout";
import Head from "@docusaurus/Head";

// Route component for "/news/post/<id>", one instance per Notion entry
// registered by plugins/newsletter.js's contentLoaded loop. Markup/classes
// ported from apps/kudzu/src/pages/news/post/[slug].tsx; the body HTML
// (`data.html`, already rendered by @otw/notion-content) is injected raw,
// same as every other static variant.
export default function PostPage({
  data
}: {
  data: {
    title: string;
    date: string | null;
    coverUrl: string | null;
    html: string;
  };
}): React.ReactElement {
  const { title, date, coverUrl, html } = data;
  const dateLabel = date ? new Intl.DateTimeFormat("ko-KR").format(new Date(date)) : null;

  return (
    <Layout>
      <Head>
        <title>{title} | OTW for FE</title>
      </Head>
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
    </Layout>
  );
}
