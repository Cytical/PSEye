import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { escapeXml, getCompanyFeedItems } from "@/lib/companyFeed";

export const revalidate = 3600; // matches the stock page / news cadence

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.NODE_ENV === "production" ? "https://pseye.vercel.app" : "http://localhost:3000");

/**
 * Per-company RSS 2.0 feed: disclosures + dividends + tagged news for one
 * ticker — alerts with no account, no email, no infrastructure; any feed
 * reader can watch a specific PSE company. Linked from /stocks/[ticker] (both
 * a visible link and <link rel="alternate"> in its metadata).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = await params;
  const company = PSE_EDGE_COMPANIES.find((c) => c.ticker === tickerParam.toUpperCase());
  if (!company) return new Response("Unknown ticker", { status: 404 });

  const items = await getCompanyFeedItems(company.ticker, company.companyName, SITE_URL);

  const itemsXml = items
    .map(
      (item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      ${item.description ? `<description>${escapeXml(item.description)}</description>` : ""}
    </item>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>PSEye — ${escapeXml(company.ticker)} ${escapeXml(company.companyName)}</title>
    <link>${SITE_URL}/stocks/${company.ticker}</link>
    <description>Disclosures, dividends, and news for ${escapeXml(company.companyName)} (${escapeXml(company.ticker)}) on the Philippine Stock Exchange.</description>
    <language>en-us</language>${itemsXml}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
