import { createDb, getCashDividends, getRecentDisclosures } from "@pseye/db";
import { getNewsForTicker } from "./news";

export interface CompanyFeedItem {
  title: string;
  link: string;
  /** Stable unique id for the reader; not necessarily a fetchable URL. */
  guid: string;
  pubDate: Date;
  description: string | null;
}

/** Minimal XML-entity escaping — same contract as feed.xml/route.ts's. */
export function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Everything worth an alert for one company, merged newest-first: disclosures
 * filed, cash dividends declared (dated by ex-date), and tagged news. RSS is
 * an *external* distribution channel, so disclosures/dividends are read
 * real-only (empty on DB failure) rather than through the mock-fallback libs —
 * pushing fabricated filings into someone's feed reader fails the same honesty
 * bar as StockPriceChart; news is fine either way since its fallback
 * live-fetches real headlines.
 */
export async function getCompanyFeedItems(
  ticker: string,
  companyName: string,
  siteUrl: string,
  limit = 30
): Promise<CompanyFeedItem[]> {
  const stockUrl = `${siteUrl}/stocks/${ticker}`;
  const items: CompanyFeedItem[] = [];

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const db = createDb(databaseUrl);
      const yearAgo = new Date();
      yearAgo.setUTCDate(yearAgo.getUTCDate() - 365);
      const [disclosureRows, dividendRows] = await Promise.all([
        getRecentDisclosures(db),
        getCashDividends(db, yearAgo.toISOString().slice(0, 10)),
      ]);

      for (const d of disclosureRows) {
        if (d.ticker !== ticker) continue;
        // The live disclosures table still carries a few "SAMPLE-…" rows left
        // over from before the source was real (deletion pending) — a feed
        // pushed to external readers must never emit them.
        if (d.referenceNo.startsWith("SAMPLE-")) continue;
        items.push({
          title: `[Disclosure] ${d.headline}`,
          link: d.url ?? stockUrl,
          guid: `pseye:disclosure:${d.referenceNo}`,
          pubDate: d.filedAt,
          description: `${companyName} filed "${d.headline}" with the PSE.`,
        });
      }

      for (const div of dividendRows) {
        if (div.ticker !== ticker) continue;
        items.push({
          title: `[Dividend] ${div.details} — ex-date ${div.exDate}`,
          link: stockUrl,
          guid: `pseye:dividend:${ticker}:${div.exDate}`,
          // Dated on the Manila ex-date: the moment the entitlement actually cuts off.
          pubDate: new Date(`${div.exDate}T00:00:00+08:00`),
          description: `${companyName} cash dividend: ${div.details}. Own the stock before ${div.exDate} to be entitled.${div.paymentDate ? ` Payment on ${div.paymentDate}.` : ""}`,
        });
      }
    } catch (err) {
      console.error("getCompanyFeedItems: DB read failed — feed will carry news only", err);
    }
  }

  const news = await getNewsForTicker(ticker, 10);
  for (const n of news) {
    items.push({
      title: n.title,
      link: n.url,
      guid: n.url,
      pubDate: n.publishedAt,
      description: n.snippet ? `${n.snippet} (${n.source})` : n.source,
    });
  }

  return items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime()).slice(0, limit);
}
