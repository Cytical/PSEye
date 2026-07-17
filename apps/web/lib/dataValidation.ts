export interface ValidatableStock {
  ticker: string;
  companyName: string;
  sector: string;
  /** null means "no trade to report" — a valid state, not an error. */
  price: number | null;
  pctChange: number | null;
  marketCap: number;
}

export type IssueSeverity = "error" | "warning";

export interface ValidationIssue {
  ticker: string;
  companyName: string;
  severity: IssueSeverity;
  message: string;
}

export interface ValidationReport {
  totalCount: number;
  withPriceCount: number;
  naCount: number;
  positiveCount: number;
  negativeCount: number;
  flatCount: number;
  issues: ValidationIssue[];
}

/**
 * Structural + business-rule checks over a quote list, independent of source
 * (PSE Edge-backed DB rows or the Nasdaq 100 mock data both satisfy
 * ValidatableStock). Mirrors the invariants callers already rely on: price
 * null means N/A (not 0), price null forces pctChange null too, tickers are
 * unique. Not a replacement for the parser unit tests — this validates the
 * shape of whatever getDailyQuotes()/NASDAQ_100_STOCKS actually returned.
 */
export function validateStocks(stocks: ValidatableStock[]): ValidationReport {
  const issues: ValidationIssue[] = [];
  const seenTickers = new Map<string, number>();

  let withPriceCount = 0;
  let positiveCount = 0;
  let negativeCount = 0;
  let flatCount = 0;

  for (const stock of stocks) {
    const { ticker, companyName } = stock;
    const flag = (severity: IssueSeverity, message: string) =>
      issues.push({ ticker, companyName, severity, message });

    seenTickers.set(ticker, (seenTickers.get(ticker) ?? 0) + 1);

    if (!ticker.trim()) flag("error", "Empty ticker");
    if (!companyName.trim()) flag("error", "Empty company name");
    if (!stock.sector.trim()) flag("error", "Empty sector");

    if (stock.price !== null) {
      withPriceCount++;
      if (!Number.isFinite(stock.price)) flag("error", "Price is not a finite number");
      else if (stock.price <= 0) flag("error", `Price is non-positive (${stock.price})`);

      if (stock.pctChange !== null) {
        if (!Number.isFinite(stock.pctChange)) flag("error", "% change is not a finite number");
        else {
          if (stock.pctChange > 0) positiveCount++;
          else if (stock.pctChange < 0) negativeCount++;
          else flatCount++;

          if (Math.abs(stock.pctChange) > 50) {
            flag("warning", `% change looks implausible (${stock.pctChange.toFixed(2)}%)`);
          }
        }
      }
    } else if (stock.pctChange !== null) {
      // Business rule: no price means nothing to report a change against.
      flag("error", "% change is set but price is N/A — should also be null");
    }

    if (!Number.isFinite(stock.marketCap) || stock.marketCap < 0) {
      flag("error", `Market cap is invalid (${stock.marketCap})`);
    } else if (stock.marketCap === 0) {
      flag("warning", "Market cap is 0 — likely missing/defaulted rather than a real value");
    }
  }

  for (const [ticker, count] of seenTickers) {
    if (count > 1) {
      const companyName = stocks.find((s) => s.ticker === ticker)?.companyName ?? "";
      issues.push({
        ticker,
        companyName,
        severity: "error",
        message: `Ticker appears ${count} times (expected unique)`,
      });
    }
  }

  return {
    totalCount: stocks.length,
    withPriceCount,
    naCount: stocks.length - withPriceCount,
    positiveCount,
    negativeCount,
    flatCount,
    issues,
  };
}
