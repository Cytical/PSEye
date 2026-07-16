import { ImageResponse } from "next/og";
import { getDailyQuotes } from "@/lib/quotes";
import { computeTreemapLayout, pctChangeToColor, getContrastText, shouldShowLabel } from "@pseye/treemap-layout";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PSEye — PSE Market Map. Box size is market cap, color is today's percent change.";

const CANVAS_PADDING = 20;
const HEADER_HEIGHT = 64;

export default async function Image() {
  const quotes = await getDailyQuotes();
  const mapWidth = size.width - CANVAS_PADDING * 2;
  const mapHeight = size.height - CANVAS_PADDING * 2 - HEADER_HEIGHT;
  const layout = computeTreemapLayout(quotes, mapWidth, mapHeight);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#fcfcfb",
          padding: CANVAS_PADDING,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: "#0b0b0b" }}>PSEye</span>
            <span style={{ fontSize: 20, color: "#52514e" }}>PSE Market Map</span>
          </div>
          <span style={{ fontSize: 15, color: "#898781" }}>Delayed/EOD data — not for trading decisions</span>
        </div>

        <div style={{ display: "flex", position: "relative", width: mapWidth, height: mapHeight, marginTop: 16 }}>
          {layout.stocks.map((box) => {
            const w = box.x1 - box.x0;
            const h = box.y1 - box.y0;
            const fill = pctChangeToColor(box.pctChange);
            const ink = getContrastText(fill);
            const showLabel = shouldShowLabel(w, h);
            return (
              <div
                key={box.ticker}
                style={{
                  position: "absolute",
                  left: box.x0,
                  top: box.y0,
                  width: w,
                  height: h,
                  background: fill,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                {showLabel && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      color: ink,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{box.ticker}</span>
                    <span style={{ fontSize: 11 }}>
                      {box.pctChange == null
                        ? "N/A"
                        : `${box.pctChange >= 0 ? "+" : ""}${box.pctChange.toFixed(2)}%`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    ),
    { width: size.width, height: size.height }
  );
}
