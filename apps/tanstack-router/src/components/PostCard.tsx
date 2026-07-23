import { Link } from "@tanstack/react-router";
import styles from "../styles/post.module.css";

export interface PostCardData {
  id: string;
  title: string;
  date: string | null;
  coverUrl: string | null;
}

export default function PostCard({ post }: { post: PostCardData }) {
  const dateLabel = post.date
    ? new Intl.DateTimeFormat("ko-KR").format(new Date(post.date))
    : null;

  return (
    <Link
      to="/news/post/$slug"
      params={{ slug: post.id }}
      className={styles.row}
    >
      <span className={styles.thumb}>
        {post.coverUrl ? (
          <img src={post.coverUrl} alt="" loading="lazy" />
        ) : (
          "thumbnail"
        )}
      </span>
      <span className={styles.title}>{post.title}</span>
      {dateLabel && <span className={styles.date}>{dateLabel}</span>}
    </Link>
  );
}
