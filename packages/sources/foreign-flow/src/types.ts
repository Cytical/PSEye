/** Index-level foreign buying/selling for one reporting period, in PHP. */
export interface IndexForeignFlow {
  periodEnd: string; // YYYY-MM-DD, the Friday/month-end the period covers through
  foreignBuyValue: number;
  foreignSellValue: number;
  netValue: number; // foreignBuyValue - foreignSellValue
}

/** One stock's ranking in a period's net-foreign-buying or net-foreign-selling table. */
export interface StockForeignFlow {
  ticker: string;
  companyName: string;
  netValue: number; // positive = net buying, negative = net selling
  rank: number; // 1-based rank within its direction (buying or selling)
}

export interface ForeignFlowSource {
  /** Recent weekly periods, oldest first, ending with the latest available week. */
  getIndexFlow(): Promise<IndexForeignFlow[]>;
  /** Latest period's top net-foreign-buying and net-foreign-selling stocks. */
  getTopStockFlows(): Promise<{ periodEnd: string; topBuying: StockForeignFlow[]; topSelling: StockForeignFlow[] }>;
}
