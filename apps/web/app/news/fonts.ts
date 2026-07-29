import { IBM_Plex_Sans, Source_Serif_4 } from "next/font/google";

// Editorial serif/sans pairing for the News tab's front-page redesign — now
// FT-inspired rather than NYT-inspired (see the page/component comments for
// the palette side of that switch). Source Serif 4's tall x-height and
// editorial proportions stand in for FT's proprietary "Financier Display"
// headline face; IBM Plex Sans (a grotesk associated with financial/data
// tooling) stands in for FT's kicker/byline sans. Both are open equivalents,
// not the real proprietary FT cuts.
// Scoped to this route via `.variable`, not registered globally, so the
// rest of the site keeps its existing Geist typography.
// 600/700 only: every `font-news-serif` usage in the route pairs it with
// font-semibold or font-bold, so the declared 400 was six @font-face rules and
// a downloaded subset that nothing ever rendered in. IBM Plex Sans below keeps
// all four weights — those are genuinely in use (500 alone appears on 45
// elements of the news front page).
//
// `preload: false` on both, which is the opposite of next/font's default and
// deliberate. Being scoped to this route is not the same as being *fetched*
// only on this route: the site header links to /news from every page, Next
// prefetches links in the viewport, and that prefetch pulls in this route's
// stylesheet — whose `<link rel="preload" as="font">` entries then make the
// browser download both families everywhere. Measured on the homepage against
// a production build: 93kB of fonts by the load event (Geist, Geist Mono,
// Fraunces — the ones actually rendering), then a further 89kB at ~330ms that
// was purely Source Serif 4 + IBM Plex Sans for a page the visitor had not
// opened. Without preload they are fetched when text first renders in them,
// i.e. on /news itself. The cost is a brief swap there, bounded by next/font's
// generated `*_Fallback` metric-matched face so it is a repaint, not a reflow.
export const newsSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-news-serif",
  preload: false,
});

export const newsSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-news-sans",
  preload: false,
});
