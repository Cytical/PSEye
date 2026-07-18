import { getRecentNewsFeed } from "@/lib/news";

export const revalidate = 3600; // matches the news ETL cadence / front-page revalidate

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Minimal XML-entity escaping — titles/snippets are plain outlet text, not markup. */
function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Standard RSS 2.0 feed of recent PSE-relevant headlines — a free organic
 * distribution channel (feed readers, aggregators) that costs nothing beyond
 * reformatting data /news already fetches. Linked from the <head> via
 * layout.tsx's metadata.alternates.types.
 */
export async function GET() {
  const items = await getRecentNewsFeed();

  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.url)}</link>
      <guid isPermaLink="true">${escapeXml(item.url)}</guid>
      <pubDate>${item.publishedAt.toUTCString()}</pubDate>
      <source>${escapeXml(item.source)}</source>
      ${item.snippet ? `<description>${escapeXml(item.snippet)}</description>` : ""}
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PSEye — Markets News</title>
    <link>${SITE_URL}/news</link>
    <description>The most relevant PH business headlines, auto-tagged by PSE ticker.</description>
    <language>en-us</language>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
