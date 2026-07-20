import type { MetadataRoute } from "next";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { getRecentRecapDates } from "@/lib/dailyRecap";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://pseye.vercel.app" : "http://localhost:3000");

const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/charts", changeFrequency: "daily", priority: 0.7 },
  { path: "/compare", changeFrequency: "daily", priority: 0.6 },
  { path: "/news", changeFrequency: "hourly", priority: 0.8 },
  { path: "/calendar", changeFrequency: "daily", priority: 0.6 },
  { path: "/dividends", changeFrequency: "daily", priority: 0.7 },
  { path: "/block-sales", changeFrequency: "monthly", priority: 0.5 },
  { path: "/disclosures", changeFrequency: "hourly", priority: 0.6 },
  // /offerings deliberately excluded — hidden from nav (still mock-only, no
  // real source found after two investigations), not worth indexing.
  { path: "/foreign-flow", changeFrequency: "weekly", priority: 0.5 },
  { path: "/dca", changeFrequency: "monthly", priority: 0.6 },
  { path: "/daily", changeFrequency: "daily", priority: 0.7 },
  { path: "/stocks", changeFrequency: "daily", priority: 0.7 },
  { path: "/about", changeFrequency: "yearly", priority: 0.3 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries = ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  // One entry per tracked company — see apps/web/app/stocks/[ticker]/page.tsx,
  // the single biggest indexable-page-count lever in the site (9 routes -> 100+).
  const stockEntries = PSE_EDGE_COMPANIES.map((company) => ({
    url: `${SITE_URL}/stocks/${company.ticker}`,
    lastModified: now,
    changeFrequency: "hourly" as const,
    priority: 0.6,
  }));

  // Recent daily recaps (see app/daily/[date]/page.tsx) — [] without a database,
  // so builds stay green in DB-less environments.
  const recapEntries = (await getRecentRecapDates(30)).map((date) => ({
    url: `${SITE_URL}/daily/${date}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticEntries, ...stockEntries, ...recapEntries];
}
