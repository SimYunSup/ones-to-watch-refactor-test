import Link from "next/link";

export interface PostCardData {
  id: string;
  title: string;
  date: string | null;
  coverUrl: string | null;
}

// Unlike kudzu's siteUrl-precomputed href (a workaround for a compiler
// restriction that does not apply here), this Link is built straight from
// the post id — next.config.ts's basePath prefixes it automatically.
export default function PostCard({ post }: { post: PostCardData }) {
  const dateLabel = post.date
    ? new Intl.DateTimeFormat("ko-KR").format(new Date(post.date))
    : null;

  return (
    <Link className="row" href={`/news/post/${post.id}`}>
      <span className="thumb">
        {post.coverUrl ? <img src={post.coverUrl} alt="" loading="lazy" /> : "thumbnail"}
      </span>
      <span className="title">{post.title}</span>
      {dateLabel && <span className="date">{dateLabel}</span>}
    </Link>
  );
}
