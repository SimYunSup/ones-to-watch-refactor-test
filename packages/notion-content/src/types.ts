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
  /** Always null: cover/body images are dropped so the static output has no
   *  expiring remote image fetches — see index.ts/blocks.ts. Kept in the
   *  shape (not removed) so consumers' `coverUrl ? <img> : placeholder`
   *  branches stay valid and render the placeholder. */
  coverUrl: string | null;
  /** Rendered body HTML. */
  html: string;
  headings: NewsHeading[];
}
