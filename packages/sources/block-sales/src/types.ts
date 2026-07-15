/**
 * A single negotiated "cross" trade reported in PSE's Monthly Report block sales
 * section — large trades arranged directly between parties and executed outside
 * the normal continuous order book.
 */
export interface BlockSale {
  ticker: string;
  companyName: string;
  tradeDate: string; // YYYY-MM-DD
  volume: number; // shares
  price: number; // per share
  value: number; // volume * price, precomputed for sorting/display
}

export interface BlockSaleSource {
  /** Most recently published month's block sales, most recent trade first. */
  getLatest(): Promise<BlockSale[]>;
}
