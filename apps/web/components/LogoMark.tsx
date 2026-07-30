/**
 * The PSEye mark: an eye (watching the market) with an iris in the same
 * bright green used for "up" days across the app (treemap/foreign-flow —
 * see @pseye/treemap-layout's color.ts COLOR_RANGE), and a small upward
 * triangle pupil — a plain "stock's up" glyph that also nods to the golden
 * triangle field on the Philippine flag. 2026-07-30 revision: the original
 * pointed-almond outline plus a solid dark diamond pupil read fine at the
 * 28px header size it was designed for, but blown up (180px apple-icon,
 * 1200px OG image) it reads as a stare rather than a glance — confirmed by
 * rendering both at scale before choosing this one over two other
 * candidates. The lens shape below has the same overall footprint but caps
 * both tips with a small arc (the `A3.2,3.2` segments) instead of letting
 * the two lid curves meet at a 0-radius point. The dark chip background
 * matches the treemap/OG canvas color (#0d0f14) deliberately — on a dark
 * surface the chip disappears and only the eye floats free; on a light
 * surface (browser chrome, light theme header) it reads as a badge. Plain
 * SVG primitives only (rect/path/circle/polygon) so this same component
 * renders both as normal JSX (header) and inside next/og's ImageResponse
 * (icon.tsx, apple-icon.tsx, opengraph-image.tsx), which is powered by
 * satori and only understands a limited element set — confirmed against
 * next's bundled @vercel/og build, which special-cases raw `svg` children
 * before handing them to its own layout engine.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="PSEye">
      <rect width="48" height="48" rx="10" fill="#0d0f14" />
      <path
        d="M8.74,21.74 Q24,13 39.26,21.74 A3.2,3.2 0 0,1 39.26,26.26 Q24,35 8.74,26.26 A3.2,3.2 0 0,1 8.74,21.74 Z"
        fill="#ffffff"
      />
      <circle cx="24" cy="24" r="7" fill="#30cc5a" />
      <polygon points="24,20 27.5,26.5 20.5,26.5" fill="#e8b923" />
    </svg>
  );
}
