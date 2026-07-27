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
export const newsSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-news-serif",
});

export const newsSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-news-sans",
});
