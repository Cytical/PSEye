import { createRssSource } from "./rssSource";
import type { NewsSource } from "./types";

/**
 * Adding/removing an outlet only touches this file. Confidence on each feed
 * URL varies — see notes. Verify before relying on an outlet in production
 * (Open Question #6/#7 in the project plan).
 */
export const NEWS_SOURCES: NewsSource[] = [
  // Confirmed reachable at time of writing.
  createRssSource("BusinessWorld", "https://www.bworldonline.com/feed/"),
  createRssSource("Inquirer Business", "https://business.inquirer.net/feed"),
  createRssSource("GMA News Money", "https://data.gmanetwork.com/gno/rss/money/feed.xml"),

  // UNVERIFIED — philstar.com blocks automated fetches from this environment,
  // so the business-specific feed path could not be confirmed. Replace with
  // the correct URL from https://www.philstar.com/rss before enabling.
  createRssSource("Philstar Business", "https://www.philstar.com/rss/business"),

  // UNVERIFIED — Manila Bulletin's /rss page does not list a direct
  // business-category feed URL; this is a best-guess pattern. Confirm against
  // https://mb.com.ph/rss before enabling.
  createRssSource("Manila Bulletin Business", "https://mb.com.ph/rss/business/"),
];
