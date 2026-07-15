import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";

export interface TreemapInput {
  ticker: string;
  sector: string;
  marketCap: number;
  pctChange: number;
}

export interface StockRect {
  ticker: string;
  sector: string;
  pctChange: number;
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

/**
 * Pure layout math shared by the interactive web treemap (nivo) and the
 * static social-share image (Satori). Groups stocks by PSE sector, sizes
 * boxes by market cap, and computes pixel rects for a given canvas size.
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
        value: Math.max(stock.marketCap, 1),
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
    .paddingOuter(4)
    .paddingTop(24)
    .paddingInner(2)
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
          return {
            ticker: raw.ticker,
            sector: raw.sector,
            pctChange: raw.pctChange,
            marketCap: raw.marketCap,
            x0: leaf.x0,
            y0: leaf.y0,
            x1: leaf.x1,
            y1: leaf.y1,
          };
        }) ?? []
    ) ?? [];

  return { width, height, stocks: stockRects, sectors };
}
