import { ImageResponse } from "next/og";
import { LogoMark } from "@/components/LogoMark";
import { getDailyRecap } from "@/lib/dailyRecap";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PSEye — PSE daily market recap";

const CANVAS_BG = "#0d0f14";
const PANEL_BG = "#151922";
const UP = "#30cc5a";
const DOWN = "#f6362f";
const MUTED = "#8b93a1";
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatLongDate(iso: string): string {
  if (!DATE_RE.test(iso)) return iso;
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Per-day share card — a recap link dropped in Messenger/Viber/FB previews as a
 * branded "PSEi closed at X, +Y%" image with the day's top movers, not the
 * generic site card. Mirrors the recap page's real-only stance: with no data on
 * record it falls back to a plain branded card rather than inventing numbers.
 */
export default async function Image({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const recap = DATE_RE.test(date) ? await getDailyRecap(date) : null;
  const snapshot = recap?.snapshot ?? null;
  const gainers = recap?.gainers?.slice(0, 3) ?? [];

  const pctText =
    snapshot == null
      ? null
      : `${snapshot.pseiPctChange >= 0 ? "+" : ""}${snapshot.pseiPctChange.toFixed(2)}%`;
  const changeColor = snapshot == null ? MUTED : snapshot.pseiPctChange >= 0 ? UP : DOWN;

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
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark size={32} />
          <span style={{ fontSize: 28, fontWeight: 700, color: "#ffffff" }}>PSEye</span>
          <span style={{ fontSize: 22, color: MUTED, marginLeft: 6 }}>PSE Daily Recap</span>
        </div>

        <span style={{ fontSize: 40, fontWeight: 600, color: "#ffffff", marginTop: 28 }}>
          {formatLongDate(date)}
        </span>

        {snapshot ? (
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 20 }}>
            <span style={{ fontSize: 26, color: MUTED }}>PSEi</span>
            <span style={{ fontSize: 72, fontWeight: 700, color: "#ffffff" }}>
              {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: 44, fontWeight: 700, color: changeColor }}>{pctText}</span>
          </div>
        ) : (
          <span style={{ fontSize: 28, color: MUTED, marginTop: 20 }}>
            Index move, top movers, foreign flow, block sales &amp; disclosures
          </span>
        )}

        {gainers.length > 0 && (
          <div style={{ display: "flex", gap: 14, marginTop: 40 }}>
            {gainers.map((g) => (
              <div
                key={g.ticker}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  background: PANEL_BG,
                  borderRadius: 12,
                  padding: "16px 22px",
                }}
              >
                <span style={{ fontSize: 30, fontWeight: 700, color: "#ffffff" }}>{g.ticker}</span>
                <span style={{ fontSize: 26, fontWeight: 600, color: UP }}>
                  +{g.pctChange.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        )}

        <span style={{ fontSize: 20, color: MUTED, marginTop: gainers.length > 0 ? 44 : 56 }}>
          Delayed/EOD data — not for trading decisions
        </span>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
