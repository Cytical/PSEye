import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://pseye.vercel.app" : "http://localhost:3000");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Belt-and-suspenders with /test/page.tsx's own `robots: { index: false }` —
      // that meta tag only stops indexing, this stops the crawl outright.
      disallow: "/test",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
