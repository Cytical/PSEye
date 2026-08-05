export interface GlossaryTerm {
  id: string;
  term: string;
  /** "What is X?" phrasing used as the H1/title on the term's own /glossary/[term]
   * page — written per-term (not derived from `term`) so grammar (a/an, singular
   * vs. plural, "does X mean" vs "is X") comes out right for every entry. */
  question: string;
  definition: string;
  /** Optional links to the PSEye page(s) where this term is actually used/computed. */
  related?: { href: string; label: string }[];
  /** Optional ids of other GLOSSARY_TERMS entries to cross-link from this one's
   * own page — internal "see also" links between definitions, same spirit as
   * `related` but glossary-to-glossary instead of glossary-to-feature-page. */
  seeAlso?: string[];
}

/**
 * Every entry describes a term this site actually computes or displays
 * somewhere — no generic finance-textbook filler for concepts PSEye doesn't
 * touch (e.g. no options/futures terms, no P/B or ROE — see pe-ratio's own
 * entry for why a field being unavailable is itself worth documenting rather
 * than silently omitting). Ordering is alphabetical-ish by id so anchor links
 * stay stable as entries are added; each also gets its own indexable page at
 * /glossary/[term] (see app/glossary/[term]/page.tsx) — one URL per term is
 * the same "biggest indexable-page-count lever" pattern as /stocks/[ticker]
 * and /sectors/[sector], since a single shared page can only ever rank for
 * one query, not fourteen-plus distinct "what is X" searches.
 */
export const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: "block-sale",
    term: "Block Sale",
    question: "What Is a Block Sale?",
    definition:
      "A large trade in a stock (usually institutional) negotiated off the regular order book at a single agreed price, then reported separately from normal trading. PSE publishes these in its daily Quotation Report.",
    related: [{ href: "/block-sales", label: "Block sales" }],
    seeAlso: ["trading-value-volume"],
  },
  {
    id: "board-lot",
    term: "Board Lot",
    question: "What Is a Board Lot?",
    definition:
      "The minimum number of shares you can trade in one order for a given stock on the PSE, set by the exchange's board lot table based on the stock's price range — lower-priced stocks generally have a larger board lot, higher-priced stocks a smaller one. You can't buy or sell a fraction of a board lot through a regular order.",
  },
  {
    id: "dividend-yield",
    term: "Dividend Yield",
    question: "What Is Dividend Yield?",
    definition:
      "Trailing-twelve-month cash dividends per share, divided by the current price, shown as a percentage. It's backward-looking — it tells you what a share paid out over the last year, not a guaranteed future payout.",
    related: [{ href: "/dividends", label: "Dividend screener" }],
    seeAlso: ["ex-dividend-date"],
  },
  {
    id: "ex-dividend-date",
    term: "Ex-Dividend Date (Ex-Date)",
    question: "What Is the Ex-Dividend Date?",
    definition:
      "The first day a stock trades without the right to its next declared dividend. You must own the stock before this date to receive that payout — buying on or after the ex-date means the next dividend goes to the seller instead.",
    related: [{ href: "/calendar", label: "Dividend & corporate action calendar" }],
    seeAlso: ["dividend-yield"],
  },
  {
    id: "foreign-buying-selling",
    term: "Net Foreign Buying / Selling",
    question: "What Is Net Foreign Buying/Selling?",
    definition:
      "The peso value of shares bought by foreign investors minus the peso value sold, over a given period. Positive means foreign investors were net buyers (foreign money flowing in); negative means net sellers (flowing out). Tracked both index-wide and per-stock.",
    related: [{ href: "/foreign-flow", label: "Foreign flow" }],
  },
  {
    id: "free-float",
    term: "Free Float (Free Float Level)",
    question: "What Is Free Float?",
    definition:
      "The percentage of a company's total outstanding shares that are actually available for public trading, excluding shares locked up by controlling owners, the government, or other strategic holders. A company can have a huge market cap but a tiny free float if almost all its shares are held privately.",
    seeAlso: ["market-capitalization"],
  },
  {
    id: "market-capitalization",
    term: "Market Capitalization (Market Cap)",
    question: "What Is Market Capitalization?",
    definition:
      "A company's total value on the exchange: its last traded share price multiplied by its total outstanding shares. It's the standard measure of company size used to rank and compare listed companies against each other.",
    related: [
      { href: "/rankings", label: "Company rankings" },
      { href: "/sectors", label: "Sectors" },
    ],
    seeAlso: ["free-float", "sector"],
  },
  {
    id: "pe-ratio",
    term: "P/E Ratio (Price-to-Earnings)",
    question: "What Is the P/E Ratio?",
    definition:
      "Share price divided by earnings per share — a common measure of how expensive a stock is relative to its profit. PSEye doesn't display this: the exchange's own company pages have a P/E Ratio field, but it's left blank in practice for every company checked, and no other free, reliable source publishes it for PSE-listed stocks. Rather than estimate or guess a number, this site leaves it out.",
  },
  {
    id: "psei",
    term: "PSEi (PSE Composite Index)",
    question: "What Is the PSEi?",
    definition:
      "The Philippine Stock Exchange's main benchmark index — a weighted average of roughly 30 of the largest, most-traded companies on the exchange, used as the standard gauge of \"the market\" going up or down.",
    seeAlso: ["market-regime"],
  },
  {
    id: "sector",
    term: "Sector",
    question: "What Is a PSE Sector?",
    definition:
      "The industry group a listed company belongs to under PSE's own classification — Financials, Industrial, Holding Firms, Property, Services, Mining & Oil, plus equity ETFs tracked separately from the six main boards. (PSE's SME Board listing tier is excluded from sector browsing for now.)",
    related: [{ href: "/sectors", label: "Browse by sector" }],
    seeAlso: ["stock-cluster"],
  },
  {
    id: "52-week-high-low",
    term: "52-Week High / Low",
    question: "What Is the 52-Week High/Low?",
    definition:
      "The highest and lowest closing price a stock has recorded over the trailing year. Often used as a quick reference for how far a stock's current price sits from its recent extremes.",
    related: [{ href: "/stocks", label: "All stocks" }],
    seeAlso: ["volatility"],
  },
  {
    id: "trading-value-volume",
    term: "Trading Value (Turnover) & Volume",
    question: "What Are Trading Value and Volume?",
    definition:
      "Volume is the number of shares that changed hands today; value (turnover) is the total peso amount those trades were worth. Value is the more useful measure for comparing activity across different stocks, since a low-priced stock can show huge share volume without much real money moving, while a high-priced stock can move a lot of money on modest volume.",
    related: [{ href: "/most-active", label: "Most active stocks" }],
  },
  {
    id: "suspended",
    term: "Suspended (Trading Status)",
    question: "What Does \"Suspended\" Mean for a Stock?",
    definition:
      "A stock the PSE has temporarily halted from trading — often pending disclosure of material information, a compliance issue, or a corporate action. A suspended stock has no current trade to report, so its price shows as \"N/A\" rather than a stale or zero value.",
  },
  {
    id: "trading-hours",
    term: "PSE Trading Hours",
    question: "What Are PSE Trading Hours?",
    definition:
      "The Philippine Stock Exchange trades in two sessions, Manila time (UTC+8), Monday to Friday except PSE holidays: 9:30am-12:00nn, a one-hour lunch recess with no trading, then 1:00pm-3:00pm (plus a short pre-close/no-cancel window right before the 3:00pm close). Prices shown on PSEye are end-of-day or delayed, not live ticks during those sessions.",
  },
  {
    id: "beta",
    term: "Beta",
    question: "What Is Beta?",
    definition:
      "How sensitive a stock's returns are to the overall market's — calculated as the covariance of the stock's returns with a benchmark (PSEye's reconstructed composite index), divided by the benchmark's variance. A beta above 1 means the stock tends to swing more than the market in the same direction; below 1, less; negative is rare but means it tends to move opposite the market.",
    related: [{ href: "/analytics", label: "Market analytics" }],
    seeAlso: ["volatility", "correlation", "stock-cluster"],
  },
  {
    id: "volatility",
    term: "Volatility (Annualized Volatility)",
    question: "What Is Volatility?",
    definition:
      "How much a stock's daily returns swing around their average, expressed as an annualized percentage — the standard deviation of daily log returns, scaled up to a yearly figure. Higher volatility means bigger day-to-day price swings in either direction; it says nothing by itself about whether those swings are up or down.",
    related: [{ href: "/analytics", label: "Market analytics" }],
    seeAlso: ["beta", "max-drawdown", "stock-cluster"],
  },
  {
    id: "correlation",
    term: "Correlation",
    question: "What Is Correlation?",
    definition:
      "How closely two stocks' (or a stock and a sector's) returns move together, on a scale from -1 (perfectly opposite) to +1 (perfectly in sync). Two stocks with high correlation tend to rise and fall together even when they're in different PSE sectors — which is exactly what PSEye's stock clusters group by, instead of by sector label.",
    related: [{ href: "/analytics", label: "Market analytics" }],
    seeAlso: ["beta", "stock-cluster"],
  },
  {
    id: "sharpe-ratio",
    term: "Sharpe Ratio",
    question: "What Is the Sharpe Ratio?",
    definition:
      "Return earned per unit of total volatility (risk) taken, after subtracting a risk-free rate. Higher is better — it measures whether a stock's returns are compensating you enough for how much it swings, up or down alike.",
    related: [{ href: "/stocks", label: "Per-stock risk stats" }],
    seeAlso: ["sortino-ratio", "volatility"],
  },
  {
    id: "sortino-ratio",
    term: "Sortino Ratio",
    question: "What Is the Sortino Ratio?",
    definition:
      "Like the Sharpe ratio, but only penalizes downside volatility (losses), not upside price swings — a stock that only ever surprises to the upside scores better here than on Sharpe.",
    related: [{ href: "/stocks", label: "Per-stock risk stats" }],
    seeAlso: ["sharpe-ratio"],
  },
  {
    id: "max-drawdown",
    term: "Max Drawdown",
    question: "What Is Max Drawdown?",
    definition:
      "The largest peak-to-trough decline in a stock's price over the period shown — how much you'd have lost, at worst, buying at the top and holding through the bottom before any recovery.",
    related: [{ href: "/stocks", label: "Per-stock risk stats" }],
    seeAlso: ["volatility", "value-at-risk"],
  },
  {
    id: "value-at-risk",
    term: "Value at Risk (VaR)",
    question: "What Is Value at Risk (VaR)?",
    definition:
      "An estimate of the worst loss a stock stayed within on a given share of trading days, based on its own historical returns rather than a theoretical model — 95% VaR means daily returns were worse than this figure on roughly 1 in 20 trading days historically.",
    related: [{ href: "/stocks", label: "Per-stock risk stats" }],
    seeAlso: ["max-drawdown"],
  },
  {
    id: "rsi",
    term: "RSI (Relative Strength Index)",
    question: "What Is RSI?",
    definition:
      "A 0-100 momentum gauge comparing the size of a stock's recent gains to its recent losses over the last 14 trading days. Conventionally, above 70 is considered overbought and below 30 oversold — though neither guarantees a reversal is coming.",
    related: [{ href: "/stocks", label: "Per-stock risk stats" }],
    seeAlso: ["macd"],
  },
  {
    id: "macd",
    term: "MACD (Moving Average Convergence/Divergence)",
    question: "What Is MACD?",
    definition:
      "A trend-momentum indicator: the 12-day exponential moving average minus the 26-day EMA, itself smoothed by a 9-day signal line. The histogram (the gap between the two) is the usual way to read it — positive and above zero suggests bullish momentum, negative suggests bearish, and a bar flipping from one side of zero to the other is called a crossover.",
    related: [{ href: "/stocks", label: "Per-stock risk stats" }],
    seeAlso: ["rsi"],
  },
  {
    id: "market-regime",
    term: "Market Regime (Risk-On / Risk-Off)",
    question: "What Is a Risk-On/Risk-Off Regime?",
    definition:
      "PSEye's own rule-based classification of whether the market is trending up with low volatility and shallow drawdowns (risk-on), trending down with high volatility and deep drawdowns (risk-off), or neither clearly (neutral) — derived from a reconstructed composite index, not an official PSE designation.",
    related: [{ href: "/regime", label: "Market regime" }],
    seeAlso: ["psei", "volatility", "max-drawdown"],
  },
  {
    id: "stock-cluster",
    term: "Stock Cluster (k-means)",
    question: "What Are Stock Clusters?",
    definition:
      "Groups of PSE stocks with similar volatility, beta, momentum, and market correlation, found algorithmically (k-means clustering) rather than assigned by PSE's own sector labels — two stocks in different sectors can end up in the same cluster if they actually move alike.",
    related: [{ href: "/clusters", label: "Stock clusters" }],
    seeAlso: ["beta", "volatility", "correlation", "sector"],
  },
  {
    id: "book-value-per-share",
    term: "Book Value Per Share",
    question: "What Is Book Value Per Share?",
    definition:
      "Stockholders' equity attributable to the parent company, divided by shares outstanding — what each share would be worth on paper if the company were liquidated at exactly its balance-sheet value. Sourced from PSE Edge's own Annual Financial Reports, not derived or estimated.",
    related: [{ href: "/stocks", label: "Per-stock balance sheet" }],
    seeAlso: ["earnings-per-share"],
  },
  {
    id: "earnings-per-share",
    term: "EPS (Earnings Per Share)",
    question: "What Is Earnings Per Share (EPS)?",
    definition:
      "Net income attributable to the parent company for the fiscal year, divided by weighted-average shares outstanding — profit earned per share. PSE Edge reports both a basic figure (actual shares outstanding) and a diluted one (as if every convertible security were exercised), sourced from the company's own Annual Financial Reports.",
    related: [{ href: "/stocks", label: "Per-stock income statement" }],
    seeAlso: ["book-value-per-share", "pe-ratio"],
  },
  {
    id: "dca",
    term: "Dollar-Cost Averaging (DCA / Peso-Cost Averaging)",
    question: "What Is Dollar-Cost Averaging (DCA)?",
    definition:
      "Investing a fixed peso amount at regular intervals (e.g. monthly) regardless of price, rather than a lump sum — buys more shares when the price is low and fewer when it's high, averaging out your entry price over time instead of betting on a single day.",
    related: [{ href: "/dca", label: "DCA calculator" }],
  },
];
