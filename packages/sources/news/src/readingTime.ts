/**
 * Average adult reading speed for news prose, in words per minute. 225 is
 * the figure the major publishers' own estimates cluster around; the number
 * matters less than being consistent, since the point of the label is to let
 * a reader tell a two-minute brief from a ten-minute feature at a glance.
 */
const WORDS_PER_MINUTE = 225;

/**
 * "4 min read", or null when the feed shipped no article body to measure
 * (see NewsItem.wordCount). Rounds up and floors at 1, so a 40-word brief
 * reads "1 min read" rather than "0 min read".
 */
export function formatReadingTime(wordCount: number | null | undefined): string | null {
  if (wordCount == null || wordCount <= 0) return null;
  return `${Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE))} min read`;
}
