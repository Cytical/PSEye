import { ImageResponse } from "next/og";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { LogoMark } from "@/components/LogoMark";
import { getDailyQuotes } from "@/lib/quotes";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CANVAS_BG = "#0d0f14";
const UP = "#30cc5a";
const DOWN = "#f6362f";
const MUTED = "#8b93a1";

/**
 * Per-ticker share image — unlike the homepage's opengraph-image.tsx (which
 * can't vary per ?filter=/?ticker= since Next only threads dynamic route
 * `params` into this file convention, never `searchParams`, see CLAUDE.md),
 * this route has ticker as a real path param, so a share of a specific
 * stock page finally gets a preview that matches what was shared.
 */
export default async function Image({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = await params;
  const upper = tickerParam.toUpperCase();
  const company = PSE_EDGE_COMPANIES.find((c) => c.ticker === upper);
  const quotes = await getDailyQuotes();
  const quote = quotes.find((q) => q.ticker === upper);

  const pctChange = quote?.pctChange ?? null;
  const changeColor = pctChange == null ? MUTED : pctChange >= 0 ? UP : DOWN;
  const changeText = pctChange == null ? "N/A" : `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%`;
  const priceText = quote?.price == null ? "N/A" : `₱${quote.price.toFixed(2)}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: CANVAS_BG,
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LogoMark size={32} />
          <span style={{ fontSize: 28, color: MUTED, letterSpacing: 1 }}>PSEye</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20, marginTop: 24 }}>
          <span style={{ fontSize: 96, fontWeight: 700, color: "#ffffff" }}>{upper}</span>
          <span style={{ fontSize: 40, color: MUTED }}>{company?.companyName ?? ""}</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 32 }}>
          <span style={{ fontSize: 56, fontWeight: 700, color: "#ffffff" }}>{priceText}</span>
          <span style={{ fontSize: 40, fontWeight: 600, color: changeColor }}>{changeText}</span>
        </div>
        <span style={{ fontSize: 20, color: MUTED, marginTop: 40 }}>
          {company?.sector ?? ""} &middot; Delayed/EOD data — not for trading decisions
        </span>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
