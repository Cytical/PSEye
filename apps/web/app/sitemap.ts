import type { MetadataRoute } from "next";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/charts", changeFrequency: "daily", priority: 0.7 },
  { path: "/compare", changeFrequency: "daily", priority: 0.6 },
  { path: "/news", changeFrequency: "hourly", priority: 0.8 },
  { path: "/calendar", changeFrequency: "daily", priority: 0.6 },
  { path: "/block-sales", changeFrequency: "monthly", priority: 0.5 },
  { path: "/disclosures", changeFrequency: "hourly", priority: 0.6 },
  { path: "/offerings", changeFrequency: "daily", priority: 0.5 },
  { path: "/foreign-flow", changeFrequency: "weekly", priority: 0.5 },
  { path: "/dca", changeFrequency: "monthly", priority: 0.6 },
];

export default function sitemap(): MetadataRoute.Sitemap {
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

  return [...staticEntries, ...stockEntries];
}
