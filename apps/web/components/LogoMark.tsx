/**
 * The PSEye mark: an eye (watching the market) with an iris in the same
 * bright green used for "up" days across the app (treemap/foreign-flow —
 * see @pseye/treemap-layout's color.ts COLOR_RANGE), and a small diamond
 * pupil nodding to a chart data-point rather than a plain dot. The dark chip
 * background matches the treemap/OG canvas color (#0d0f14) deliberately —
 * on a dark surface the chip disappears and only the eye floats free; on a
 * light surface (browser chrome, light/sepia theme header) it reads as a
 * badge. Plain SVG primitives only (rect/path/circle/polygon) so this same
 * component renders both as normal JSX (header) and inside next/og's
 * ImageResponse (icon.tsx, apple-icon.tsx, opengraph-image.tsx), which is
 * powered by satori and only understands a limited element set — confirmed
 * against next's bundled @vercel/og build, which special-cases raw `svg`
 * children before handing them to its own layout engine.
 */
export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="PSEye">
      <rect width="48" height="48" rx="10" fill="#0d0f14" />
      <path d="M8,24 Q24,8 40,24 Q24,40 8,24 Z" fill="#ffffff" />
      <circle cx="24" cy="24" r="7.5" fill="#30cc5a" />
      <polygon points="24,19.4 28.6,24 24,28.6 19.4,24" fill="#0d0f14" />
    </svg>
  );
}
