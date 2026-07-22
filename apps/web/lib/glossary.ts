export interface GlossaryTerm {
  id: string;
  term: string;
  definition: string;
  /** Optional links to the PSEye page(s) where this term is actually used/computed. */
  related?: { href: string; label: string }[];
}

/**
 * Every entry describes a term this site actually computes or displays
 * somewhere — no generic finance-textbook filler for concepts PSEye doesn't
 * touch (e.g. no options/futures terms). Ordering is alphabetical by id so
 * anchor links stay stable as entries are added.
 */
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "block-sale",
    term: "Block Sale",
    definition:
      "A large trade in a stock (usually institutional) negotiated off the regular order book at a single agreed price, then reported separately from normal trading. PSE publishes these in its daily Quotation Report.",
    related: [{ href: "/block-sales", label: "Block sales" }],
  },
  {
    id: "board-lot",
    term: "Board Lot",
    definition:
      "The minimum number of shares you can trade in one order for a given stock on the PSE, set by the exchange's board lot table based on the stock's price range — lower-priced stocks generally have a larger board lot, higher-priced stocks a smaller one. You can't buy or sell a fraction of a board lot through a regular order.",
  },
  {
    id: "dividend-yield",
    term: "Dividend Yield",
    definition:
      "Trailing-twelve-month cash dividends per share, divided by the current price, shown as a percentage. It's backward-looking — it tells you what a share paid out over the last year, not a guaranteed future payout.",
    related: [{ href: "/dividends", label: "Dividend screener" }],
  },
  {
    id: "ex-dividend-date",
    term: "Ex-Dividend Date (Ex-Date)",
    definition:
      "The first day a stock trades without the right to its next declared dividend. You must own the stock before this date to receive that payout — buying on or after the ex-date means the next dividend goes to the seller instead.",
    related: [{ href: "/calendar", label: "Dividend & corporate action calendar" }],
  },
  {
    id: "foreign-buying-selling",
    term: "Net Foreign Buying / Selling",
    definition:
      "The peso value of shares bought by foreign investors minus the peso value sold, over a given period. Positive means foreign investors were net buyers (foreign money flowing in); negative means net sellers (flowing out). Tracked both index-wide and per-stock.",
    related: [{ href: "/foreign-flow", label: "Foreign flow" }],
  },
  {
    id: "free-float",
    term: "Free Float (Free Float Level)",
    definition:
      "The percentage of a company's total outstanding shares that are actually available for public trading, excluding shares locked up by controlling owners, the government, or other strategic holders. A company can have a huge market cap but a tiny free float if almost all its shares are held privately.",
  },
  {
    id: "market-capitalization",
    term: "Market Capitalization (Market Cap)",
    definition:
      "A company's total value on the exchange: its last traded share price multiplied by its total outstanding shares. It's the standard measure of company size used to rank and compare listed companies against each other.",
    related: [
      { href: "/rankings", label: "Company rankings" },
      { href: "/sectors", label: "Sectors" },
    ],
  },
  {
    id: "pe-ratio",
    term: "P/E Ratio (Price-to-Earnings)",
    definition:
      "Share price divided by earnings per share — a common measure of how expensive a stock is relative to its profit. PSEye doesn't display this: PSE Edge's own company pages have a P/E Ratio field, but it's left blank in practice for every company checked, and no other free, reliable source publishes it for PSE-listed stocks. Rather than estimate or guess a number, this site leaves it out.",
  },
  {
    id: "psei",
    term: "PSEi (PSE Composite Index)",
    definition:
      "The Philippine Stock Exchange's main benchmark index — a weighted average of roughly 30 of the largest, most-traded companies on the exchange, used as the standard gauge of \"the market\" going up or down.",
  },
  {
    id: "sector",
    term: "Sector",
    definition:
      "The industry group a listed company belongs to under PSE's own classification — Financials, Industrial, Holding Firms, Property, Services, Mining & Oil, plus the SME Board and equity ETFs tracked separately from the six main boards.",
    related: [{ href: "/sectors", label: "Browse by sector" }],
  },
  {
    id: "52-week-high-low",
    term: "52-Week High / Low",
    definition:
      "The highest and lowest closing price a stock has recorded over the trailing year. Often used as a quick reference for how far a stock's current price sits from its recent extremes.",
    related: [{ href: "/stocks", label: "All stocks" }],
  },
  {
    id: "trading-value-volume",
    term: "Trading Value (Turnover) & Volume",
    definition:
      "Volume is the number of shares that changed hands today; value (turnover) is the total peso amount those trades were worth. Value is the more useful measure for comparing activity across different stocks, since a low-priced stock can show huge share volume without much real money moving, while a high-priced stock can move a lot of money on modest volume.",
    related: [{ href: "/most-active", label: "Most active stocks" }],
  },
  {
    id: "suspended",
    term: "Suspended (Trading Status)",
    definition:
      "A stock the PSE has temporarily halted from trading — often pending disclosure of material information, a compliance issue, or a corporate action. A suspended stock has no current trade to report, so its price shows as \"N/A\" rather than a stale or zero value.",
  },
  {
    id: "trading-hours",
    term: "PSE Trading Hours",
    definition:
      "The Philippine Stock Exchange trades in two sessions, Manila time (UTC+8), Monday to Friday except PSE holidays: 9:30am-12:00nn, a one-hour lunch recess with no trading, then 1:00pm-3:00pm (plus a short pre-close/no-cancel window right before the 3:00pm close). Prices shown on PSEye are end-of-day or delayed, not live ticks during those sessions.",
  },
];
