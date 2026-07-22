import type { MetadataRoute } from "next";
import { PSE_EDGE_COMPANIES, PSE_SECTORS } from "@pseye/source-quotes";
import { getRecentRecapDates } from "@/lib/dailyRecap";
import { sectorToSlug } from "@/lib/sectorSlug";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://pseye.vercel.app" : "http://localhost:3000");

/** `quoteDated: true` routes get the actual latest trade date on record as
 * lastModified instead of build time — real freshness signal for the pages
 * whose content is literally "today's quotes", rather than the same fake
 * `now` regardless of when the underlying data last changed (Google
 * documents that it discounts implausible/uninformative lastmod values). */
const ROUTES: {
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
  quoteDated?: boolean;
}[] = [
  { path: "/", changeFrequency: "daily", priority: 1, quoteDated: true },
  { path: "/charts", changeFrequency: "daily", priority: 0.7 },
  { path: "/screener", changeFrequency: "daily", priority: 0.7, quoteDated: true },
  { path: "/rankings", changeFrequency: "daily", priority: 0.7, quoteDated: true },
  { path: "/most-active", changeFrequency: "daily", priority: 0.7, quoteDated: true },
  { path: "/portfolio", changeFrequency: "monthly", priority: 0.5, quoteDated: true },
  { path: "/compare", changeFrequency: "daily", priority: 0.6, quoteDated: true },
  { path: "/news", changeFrequency: "hourly", priority: 0.8 },
  { path: "/calendar", changeFrequency: "daily", priority: 0.6 },
  { path: "/dividends", changeFrequency: "daily", priority: 0.7, quoteDated: true },
  { path: "/block-sales", changeFrequency: "monthly", priority: 0.5 },
  { path: "/disclosures", changeFrequency: "hourly", priority: 0.6 },
  // /offerings deliberately excluded — hidden from nav (still mock-only, no
  // real source found after two investigations), not worth indexing.
  { path: "/foreign-flow", changeFrequency: "weekly", priority: 0.5 },
  { path: "/dca", changeFrequency: "monthly", priority: 0.6 },
  { path: "/daily", changeFrequency: "daily", priority: 0.7 },
  { path: "/stocks", changeFrequency: "daily", priority: 0.7, quoteDated: true },
  { path: "/sectors", changeFrequency: "daily", priority: 0.6, quoteDated: true },
  { path: "/glossary", changeFrequency: "monthly", priority: 0.5 },
  { path: "/about", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  // Newest first — see getRecentRecapDates' own doc comment. [] without a
  // database, so builds stay green in DB-less environments (falls back to
  // `now` below exactly like every other DB-backed page in this repo).
  const recapDates = await getRecentRecapDates(30);
  const latestQuoteDate = recapDates[0] ? new Date(`${recapDates[0]}T00:00:00Z`) : now;

  const staticEntries = ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: route.quoteDated ? latestQuoteDate : now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // One entry per tracked company — see apps/web/app/stocks/[ticker]/page.tsx,
  // the single biggest indexable-page-count lever in the site (9 routes -> 100+).
  // All tickers share one lastModified because the quotes ETL upserts every
  // roster ticker's row on every run regardless of whether that ticker
  // actually traded — still a real "as of" date, just not per-ticker-distinct.
  const stockEntries = PSE_EDGE_COMPANIES.map((company) => ({
    url: `${SITE_URL}/stocks/${company.ticker}`,
    lastModified: latestQuoteDate,
    changeFrequency: "hourly" as const,
    priority: 0.6,
  }));

  // Each recap's own trade date, not `now` — a past day's recap content is
  // fixed once that day is over, so its real last-modified date is the day
  // itself, not whenever the sitemap happened to be requested.
  const recapEntries = recapDates.map((date) => ({
    url: `${SITE_URL}/daily/${date}`,
    lastModified: new Date(`${date}T00:00:00Z`),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  // One entry per sector (see app/sectors/[sector]/page.tsx).
  const sectorEntries = PSE_SECTORS.map((sector) => ({
    url: `${SITE_URL}/sectors/${sectorToSlug(sector)}`,
    lastModified: latestQuoteDate,
    changeFrequency: "daily" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...stockEntries, ...recapEntries, ...sectorEntries];
}
