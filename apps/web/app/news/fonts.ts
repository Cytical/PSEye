import { Bitter, Libre_Franklin } from "next/font/google";

// Editorial serif/sans pairing for the News tab's front-page redesign — a
// slab serif for headlines and a Franklin Gothic-style grotesk for
// kickers/bylines, the same roles Cheltenham/Franklin play on nytimes.com
// (those are proprietary NYT cuts; these are the closest open equivalents).
// Scoped to this route via `.variable`, not registered globally, so the
// rest of the site keeps its existing Geist typography.
export const newsSerif = Bitter({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-news-serif",
});

export const newsSans = Libre_Franklin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-news-sans",
});
