import { Link } from "@tanstack/react-router";
import styles from "../styles/header.module.css";

export default function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <Link to="/" className={styles.logo}>
          OTW <span className={styles.logoSub}>for</span> FE
        </Link>
        <Link to="/news/list/$page" params={{ page: "1" }} className={styles.link}>
          Archive
        </Link>
      </div>
    </header>
  );
}
