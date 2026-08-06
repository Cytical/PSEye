/**
 * Drops stories that are not business news at all.
 *
 * Three of the configured feeds are site-wide rather than business-only, and
 * it is not obvious from their URLs that they are: Malaya's "Business
 * Insight" feed is `malaya.com.ph/feed/`, which carries the whole paper.
 * Measured against a live 200-row sample, 12 of Malaya's 14 items were an
 * editorial cartoon, a showbiz item, a film-box-office wire story or an
 * opinion column ("Value of naps", "Who started a joke?"). BusinessWorld's
 * feed contributes "Stuff to Do (08/07/26)" and a music-festival preview the
 * same way.
 *
 * That padding is the substantive half of "there are too many stories": the
 * page was not dense with business news, it was diluted with the rest of the
 * newspaper.
 *
 * Section is read from the URL path rather than guessed from the headline,
 * because the path is what the outlet's own CMS filed it under and is
 * therefore right by construction. "Value of naps" is unclassifiable from its
 * title alone; `/opinion/column-of-the-day/` is not ambiguous at all.
 */

/**
 * Path segments that mean "not the business desk". Deliberately excludes
 * `/opinion/` as a whole: business commentary is legitimate on a business
 * page, and BusinessWorld and Manila Times both file real market analysis
 * there. Only the sub-sections that are unambiguously not business are
 * listed, plus `special-features`, which is where advertorials live.
 */
const NON_BUSINESS_PATH_SEGMENTS = [
  "entertainment",
  "showbiz",
  "lifestyle",
  "sports",
  "editorial-cartoon",
  "cartoon",
  "travel",
  "food",
  "motoring",
  "health",
  "horoscope",
  "weather",
  "obituaries",
  "special-features",
  "advertorial",
  "arts-and-culture",
  "arts-culture",
  "campus-press",
  "column-of-the-day",
];

/**
 * Whether a story belongs on a PSE tracker's news page.
 *
 * Fails open: a URL that can't be parsed is kept, since the cost of showing
 * one off-topic story is far lower than silently dropping a real one over a
 * malformed link.
 */
export function isBusinessRelevant(url: string): boolean {
  let path: string;
  try {
    path = new URL(url).pathname.toLowerCase();
  } catch {
    return true;
  }
  // Split on "/" so a segment must match whole. Substring matching would
  // drop "/business/food-and-beverage-giant-posts-record-profit" over
  // "food", which is exactly the kind of story this page exists for.
  const segments = path.split("/").filter(Boolean);
  return !segments.some((segment) => NON_BUSINESS_PATH_SEGMENTS.includes(segment));
}
