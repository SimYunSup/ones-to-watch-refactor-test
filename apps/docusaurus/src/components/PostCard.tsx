import React from "react";

export interface PostCardData {
  id: string;
  title: string;
  date: string | null;
  coverUrl: string | null;
}

// Ported from apps/kudzu/src/components/PostCard.tsx (markup/classes kept
// identical). Unlike kudzu, the href is computed by the caller via
// `useBaseUrl()` and passed in as a prop, since hooks may only be called
// from function components/hooks, not from plain helper props objects.
export default function PostCard({
  post,
  href
}: {
  post: PostCardData;
  href: string;
}): React.ReactElement {
  const dateLabel = post.date
    ? new Intl.DateTimeFormat("ko-KR").format(new Date(post.date))
    : null;

  return (
    <a className="row" href={href}>
      <span className="thumb">
        {post.coverUrl ? <img src={post.coverUrl} alt="" loading="lazy" /> : "thumbnail"}
      </span>
      <span className="title">{post.title}</span>
      {dateLabel && <span className="date">{dateLabel}</span>}
    </a>
  );
}
