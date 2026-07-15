import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
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
  return ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
