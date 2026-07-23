export interface PostCardData {
  id: string;
  title: string;
  date: string | null;
  coverUrl: string | null;
  /** Base-prefixed link to the post page, precomputed by the page. */
  href: string;
}

// Kudzu compiles function calls inside JSX expressions into reactive-binding
// captures (which reject imported helpers like siteUrl), so every derived
// value — link href and formatted date — is computed in plain JS before the
// JSX return and referenced as a ready-made string.
export default function PostCard({ post }: { post: PostCardData }) {
  const dateLabel = post.date
    ? new Intl.DateTimeFormat("ko-KR").format(new Date(post.date))
    : null;

  return (
    <a className="row" href={post.href}>
      <span className="thumb">
        {post.coverUrl ? <img src={post.coverUrl} alt="" loading="lazy" /> : "thumbnail"}
      </span>
      <span className="title">{post.title}</span>
      {dateLabel && <span className="date">{dateLabel}</span>}
    </a>
  );
}
