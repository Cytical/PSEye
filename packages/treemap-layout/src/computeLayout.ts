import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

export interface TreemapInput {
  ticker: string;
  sector: string;
  marketCap: number;
  /** null when the source has no current % change to report — render as "N/A", not 0. */
  pctChange: number | null;
  /**
   * PSE Edge's "Free Float Level(%)" (0-100), when known. A stock's box is
   * sized by marketCap × (freeFloatPct / 100) when present, not raw marketCap
   * — see floatAdjustedMarketCap below for why.
   */
  freeFloatPct?: number | null;
}

/**
 * PSE Edge's "Market Capitalization" is Last Traded Price × total Outstanding
 * Shares. For an ordinary PH-listed company Outstanding Shares ≈ its PSE
 * float, so that number is a reasonable proxy for sizing. For a foreign
 * dual-listing with only a sliver of its global shares actually trading here
 * (e.g. MFC/Manulife, 0.20% free float — confirmed live 2026-07-22: reports a
 * ₱4.15T "Market Capitalization" against real PH large caps in the
 * ₱300-700B range), that raw number conflates the company's entire global
 * cap with what's actually listed on the PSE, making its treemap box wildly
 * oversized relative to its real weight on this market. Adjusting by free
 * float (the same convention real float-adjusted indices use) fixes that
 * without needing to special-case any specific ticker. Falls back to raw
 * marketCap when freeFloatPct isn't known, so this is a no-op for the vast
 * majority of normal, high-float PH stocks.
 */
function floatAdjustedMarketCap(stock: TreemapInput): number {
  if (stock.freeFloatPct == null) return stock.marketCap;
  return stock.marketCap * (stock.freeFloatPct / 100);
}

export interface StockRect {
  ticker: string;
  sector: string;
  pctChange: number | null;
  marketCap: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface SectorRect {
  sector: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface TreemapLayout {
  width: number;
  height: number;
  stocks: StockRect[];
  sectors: SectorRect[];
}

interface HierarchyDatum {
  name: string;
  children?: HierarchyDatum[];
  value?: number;
  raw?: TreemapInput;
}

/** Height (px) reserved at the top of each sector block for its header bar. */
export const SECTOR_HEADER_HEIGHT = 22;

/**
 * Pure layout math shared by the interactive web treemap (hand-rolled, absolute-
 * positioned boxes in TreemapChart.tsx) and the static social-share image
 * (Satori, in app/opengraph-image.tsx). Groups stocks by PSE sector, sizes boxes
 * by market cap, and computes pixel rects for a given canvas size.
 */
export function computeTreemapLayout(
  stocks: TreemapInput[],
  width: number,
  height: number
): TreemapLayout {
  const bySector = new Map<string, TreemapInput[]>();
  for (const stock of stocks) {
    const group = bySector.get(stock.sector) ?? [];
    group.push(stock);
    bySector.set(stock.sector, group);
  }

  const root: HierarchyDatum = {
    name: "root",
    children: Array.from(bySector.entries()).map(([sector, group]) => ({
      name: sector,
      children: group.map((stock) => ({
        name: stock.ticker,
        value: Math.max(floatAdjustedMarketCap(stock), 1),
        raw: stock,
      })),
    })),
  };

  const rootNode = hierarchy(root)
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  const layout = treemap<HierarchyDatum>()
    .tile(treemapSquarify)
    .size([width, height])
    .paddingOuter(2)
    .paddingTop(SECTOR_HEADER_HEIGHT)
    .paddingInner(1)
    .round(true);

  const laidOut = layout(rootNode);

  const sectors: SectorRect[] = laidOut.children?.map((sectorNode) => ({
    sector: sectorNode.data.name,
    x0: sectorNode.x0,
    y0: sectorNode.y0,
    x1: sectorNode.x1,
    y1: sectorNode.y1,
  })) ?? [];

  const stockRects: StockRect[] =
    laidOut.children?.flatMap(
      (sectorNode) =>
        sectorNode.children?.map((leaf) => {
          const raw = leaf.data.raw!;
          // A stock whose value is tiny relative to its sector peers can round(true)
          // down to an exactly-0px-wide or -tall rect — invisible and unclickable,
          // not just "small." Nudging the far edge out by 1px (a negligible overlap
          // into a neighboring box at these box sizes) guarantees every stock stays
          // reachable, regardless of how extreme the market-cap spread is.
          const x1 = leaf.x1 - leaf.x0 < 1 ? leaf.x0 + 1 : leaf.x1;
          const y1 = leaf.y1 - leaf.y0 < 1 ? leaf.y0 + 1 : leaf.y1;
          return {
            ticker: raw.ticker,
            sector: raw.sector,
            pctChange: raw.pctChange,
            marketCap: raw.marketCap,
            x0: leaf.x0,
            y0: leaf.y0,
            x1,
            y1,
          };
        }) ?? []
    ) ?? [];

  return { width, height, stocks: stockRects, sectors };
}
