// The newsletter mark from apps/web/src/assets/favicon.svg, inlined so it
// inherits currentColor (var(--accent)). Ported verbatim from
// apps/kudzu/src/components/HeroLogo.tsx — fully static, no props or state.
export default function HeroLogo() {
  return (
    <svg width="192" height="192" viewBox="0 0 24 24" className="hero-logo">
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <rect width="20" height="18" x="2" y="3" rx="2" />
        <path d="M5 6h.01M8 6h.01M11 6h.01" />
      </g>
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        <path d="M12.667 9L10 13h4l-2.667 5" />
      </g>
    </svg>
  );
}
