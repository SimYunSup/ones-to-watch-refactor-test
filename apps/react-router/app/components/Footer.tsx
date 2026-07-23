// Every static variant links to the other three so readers can hop between
// framework implementations of the same content.
const VARIANTS = [
  {
    key: "astro",
    label: "astro",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/",
  },
  {
    key: "react-router",
    label: "react-router",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/react-router/",
  },
  {
    key: "tanstack",
    label: "tanstack",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/tanstack/",
  },
  {
    key: "kudzu",
    label: "kudzu",
    href: "https://simyunsup.github.io/ones-to-watch-refactor-test/kudzu/",
  },
] as const;

const CURRENT_VARIANT = "react-router";

export default function Footer() {
  return (
    <footer className="site-footer">
      <nav className="variant-switch" aria-label="프레임워크 변형 전환">
        {VARIANTS.map((variant) => (
          <a
            key={variant.key}
            href={variant.href}
            className={
              variant.key === CURRENT_VARIANT
                ? "variant-link is-active"
                : "variant-link"
            }
            aria-current={variant.key === CURRENT_VARIANT ? "page" : undefined}
          >
            {variant.label}
          </a>
        ))}
      </nav>
      <p>&copy; {new Date().getFullYear()} OTW for FE All rights reserved.</p>
    </footer>
  );
}
