export interface NewsHeading {
  depth: number;
  text: string;
  slug: string;
}

export interface NewsEntry {
  /** Notion page id — used as the URL slug. */
  id: string;
  /** properties.이름 (title). */
  title: string;
  /** properties.날짜.date.start as an ISO string, or null when unset. */
  date: string | null;
  /** page.cover url (external or Notion-hosted file), or null when unset. */
  coverUrl: string | null;
  /** Rendered body HTML. */
  html: string;
  headings: NewsHeading[];
}
