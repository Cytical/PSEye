import { describe, expect, it } from "vitest";
import {
  buildMapAltText,
  buildMapTweetText,
  buildRecapReplyText,
  estimateTweetLength,
} from "./tweetCopy";

const SITE_URL = "https://pseye.site";

describe("buildMapTweetText", () => {
  it("includes PSEi level, breadth, the link, and hashtags when everything is present", () => {
    const text = buildMapTweetText({
      dateLabel: "Jul 27, 2026",
      siteUrl: SITE_URL,
      snapshot: { pseiValue: 6812.4512, pseiChange: -28.91, pseiPctChange: -0.42 },
      breadth: { advancers: 123, decliners: 98, unchanged: 12 },
    });

    expect(text).toContain("PSEi 6,812.45");
    expect(text).toContain("-0.42%");
    expect(text).toContain("123🟢 advancers");
    expect(text).toContain(SITE_URL);
    expect(text).toContain("#PSE");
    expect(estimateTweetLength(text)).toBeLessThanOrEqual(280);
  });

  it("uses an up arrow/emoji for a positive move", () => {
    const text = buildMapTweetText({
      dateLabel: "Jul 27, 2026",
      siteUrl: SITE_URL,
      snapshot: { pseiValue: 6900, pseiChange: 12.5, pseiPctChange: 0.18 },
      breadth: null,
    });
    expect(text).toContain("🟢▲");
    expect(text).toContain("+0.18%");
  });

  it("omits the breadth line when breadth is null, and the PSEi line when snapshot is null", () => {
    const text = buildMapTweetText({
      dateLabel: "Jul 27, 2026",
      siteUrl: SITE_URL,
      snapshot: null,
      breadth: null,
    });
    expect(text).not.toContain("pts)");
    expect(text).not.toContain("advancers");
    expect(text).toContain(SITE_URL);
  });

  it("never exceeds 280 estimated characters even with a long date label", () => {
    const text = buildMapTweetText({
      dateLabel: "A Very Long Weekday Name, Some Ridiculously Long Month 27, 2026",
      siteUrl: SITE_URL,
      snapshot: { pseiValue: 6812.4512, pseiChange: -28.91, pseiPctChange: -0.42 },
      breadth: { advancers: 123, decliners: 98, unchanged: 12 },
    });
    expect(estimateTweetLength(text)).toBeLessThanOrEqual(280);
    // The link is mandatory content — it should survive even if hashtags get dropped.
    expect(text).toContain(SITE_URL);
  });
});

describe("buildMapAltText", () => {
  it("mentions the date and describes the image for accessibility/SEO", () => {
    const alt = buildMapAltText("Jul 27, 2026");
    expect(alt).toContain("Jul 27, 2026");
    expect(alt).toContain("Philippine Stock Exchange");
  });
});

describe("buildRecapReplyText", () => {
  it("includes top gainer/loser, foreign flow, and the /daily/[date] link", () => {
    const text = buildRecapReplyText({
      date: "2026-07-27",
      siteUrl: SITE_URL,
      topGainer: { ticker: "JFC", pctChange: 5.2 },
      topLoser: { ticker: "SM", pctChange: -3.1 },
      topForeignBuy: { ticker: "BDO", netValue: 45_200_000 },
      topForeignSell: { ticker: "ALI", netValue: -12_000_000 },
    });

    expect(text).toContain("JFC +5.20%");
    expect(text).toContain("SM -3.10%");
    expect(text).toContain("₱45.2M");
    expect(text).toContain("₱12.0M");
    expect(text).toContain(`${SITE_URL}/daily/2026-07-27`);
    expect(estimateTweetLength(text)).toBeLessThanOrEqual(280);
  });

  it("falls back to a generic line when no movers or flow data are available", () => {
    const text = buildRecapReplyText({
      date: "2026-07-27",
      siteUrl: SITE_URL,
      topGainer: null,
      topLoser: null,
      topForeignBuy: null,
      topForeignSell: null,
    });
    expect(text).toContain("Full breakdown");
    expect(text).toContain(`${SITE_URL}/daily/2026-07-27`);
  });
});

describe("estimateTweetLength", () => {
  it("counts a URL as exactly 23 chars regardless of its real length", () => {
    const longUrl = "https://pseye.site/daily/2026-07-27?some=extra&query=params";
    expect(estimateTweetLength(longUrl)).toBe(23);
    expect(estimateTweetLength(`abc ${longUrl}`)).toBe(4 + 23);
  });
});
