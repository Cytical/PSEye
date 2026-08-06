import { NEWS_DESKS, topicToSlug } from "@pseye/source-news";

/**
 * Every route whose content is the news corpus: the front page plus one page
 * per desk (see apps/web/app/news/[topic]/page.tsx).
 *
 * Derived from NEWS_DESKS rather than hand-listed, so adding a desk to the
 * lexicon cannot leave its page serving yesterday's stories for six hours.
 * The desk pages are statically generated with an ISR ceiling like /news
 * itself, and revalidateTag("news") only clears the underlying data cache,
 * not each page's own rendered entry — so both have to be named here or the
 * new desk pages simply would not refresh when the news job runs.
 *
 * Twelve paths per news run, once a day: negligible against the ISR Writes
 * budget that made on-demand revalidation worth building in the first place.
 */
export const NEWS_REVALIDATE_PATHS: string[] = [
  "/news",
  ...NEWS_DESKS.map((desk) => `/news/${topicToSlug(desk)}`),
];
