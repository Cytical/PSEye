import { ImageResponse } from "next/og";
import { getDailyQuotes } from "@/lib/quotes";
import {
  computeTreemapLayout,
  pctChangeToColor,
  getContrastText,
  shouldShowLabel,
  SECTOR_HEADER_HEIGHT,
} from "@pseye/treemap-layout";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "PSEye — PSE Market Map. Box size is market cap, color is today's percent change.";

const CANVAS_PADDING = 20;
const HEADER_HEIGHT = 64;

/** Same dark finviz-style palette as TreemapChart.tsx — kept in sync so the
 * share-image preview matches what viewers land on, not a different product. */
const CANVAS_BG = "#0d0f14";
const HEADER_BG = "#1c212b";
const GRID_LINE = "#05060a";

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
          background: CANVAS_BG,
          padding: CANVAS_PADDING,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: "#ffffff" }}>PSEye</span>
            <span style={{ fontSize: 20, color: "#8b93a1" }}>PSE Market Map</span>
          </div>
          <span style={{ fontSize: 15, color: "#5b6272" }}>Delayed/EOD data — not for trading decisions</span>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            width: mapWidth,
            height: mapHeight,
            marginTop: 16,
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          {layout.sectors.map((sector) => (
            <div
              key={sector.sector}
              style={{
                position: "absolute",
                left: sector.x0,
                top: sector.y0,
                width: sector.x1 - sector.x0,
                height: SECTOR_HEADER_HEIGHT,
                display: "flex",
                alignItems: "center",
                paddingLeft: 10,
                background: HEADER_BG,
                borderBottom: `1px solid ${GRID_LINE}`,
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: 0.5,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.8)",
              }}
            >
              {sector.sector}
            </div>
          ))}

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
                  border: `1px solid ${GRID_LINE}`,
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
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{box.ticker}</span>
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
