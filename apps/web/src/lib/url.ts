// Prefix an app-absolute path with the configured base. BASE_URL may or may not
// carry a trailing slash (Astro drops it under `trailingSlash: 'ignore'`), so
// join with exactly one slash regardless.
export const withBase = (path: string) =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
