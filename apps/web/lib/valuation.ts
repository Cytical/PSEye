/**
 * Price-relative valuation ratios (P/E, P/B) and dividend yield.
 *
 * Pure and DB-free on purpose, same contract as lib/analytics.ts and
 * lib/dca.ts: every function here takes plain numbers, returns plain numbers
 * or null, and is unit-tested without a database.
 *
 * WHY THIS EXISTS AT ALL. PSE Edge's per-company "Stock Data" tab has its own
 * P/E, EPS, Book Value and P/BV fields, and every one of them is empty in
 * practice for every company checked (investigated separately, recorded in
 * lib/glossary.ts's `pe-ratio` entry). That dead end is real and still stands.
 * What changed is the *Financial Reports* tab, a different endpoint scraped by
 * etl/jobs/backfill-company-financials.ts, which does carry real annual basic
 * EPS and book value per share. Combined with a live price those are enough to
 * derive both ratios ourselves, which is what this module does.
 *
 * Everything here returns null rather than a guess. A null P/E means one of:
 * no price (the stock did not trade), no financials on file for that ticker
 * (the backfill is manual and coverage is partial), the company lost money, or
 * the unit cross-check below failed. Callers render "N/A" or omit the figure;
 * nothing here ever estimates, imputes, or carries a stale figure forward.
 */

/**
 * The three unit regimes a PSE Edge financial statement can be in, expressed
 * as log10 of (statement unit / peso).
 *
 * parseFinancialReports.ts deliberately does NOT normalize `currency_unit`,
 * which varies per company across at least "PhP (in Millions)", "In Thousand
 * Php" and bare "PHP", because silently rescaling risks misreading a figure by
 * 1000x. That decision is correct for the statement panel, which prints the
 * unit label next to the numbers. It is a problem here, because a ratio
 * divides a peso price by a per-share figure and the two must be in the same
 * unit or the answer is wrong by a factor of a million.
 *
 * Per-share lines (EPS, book value per share) are conventionally quoted in raw
 * pesos even when the statement totals around them are in millions. That is a
 * convention, not a guarantee, and it is not worth betting a displayed P/E on.
 */
const VALID_SCALE_EXPONENTS = [0, -3, -6] as const;

/**
 * How far the measured scale may drift from an exact power of 1000 before the
 * check fails, in log10 units. 0.7 is a factor of ~5.
 *
 * It has to be this loose because the two share counts being compared are not
 * the same quantity measured twice. `marketCap / price` is shares outstanding
 * right now; `netIncome / eps` is the weighted average share count over a
 * fiscal year that ended months ago. Buybacks, follow-on offerings, stock
 * dividends and minority interests all move them apart, and a holding company
 * with large non-controlling interests is the worst case. A factor of 5 covers
 * that comfortably while still leaving a 200x gap to the next valid regime, so
 * the check can never confuse millions for thousands.
 */
const SCALE_TOLERANCE_LOG10 = 0.7;

/**
 * Above this, a P/E is far likelier to be a unit artifact or a near-zero
 * earnings denominator than a real valuation. PSE multiples in practice run
 * from roughly 3 to 80, with a thin tail into the low hundreds for a company
 * whose earnings collapsed but whose price has not. 1000 sits well clear of
 * anything genuine.
 *
 * This is a second net, not a redundant one. unitScale below can only verify
 * that the per-share line is *consistent with* the totals it sits next to, so
 * the one failure it is blind to is a statement where both are in the same
 * non-peso unit: EPS quoted in millions alongside millions-denominated income
 * still implies the right share count. That case is caught here instead, by
 * the absurd multiple it produces. Neither check subsumes the other.
 */
const MAX_PLAUSIBLE_PE = 1000;

/** Same reasoning for price-to-book, on a much tighter natural range. */
const MAX_PLAUSIBLE_PB = 100;

/**
 * Currency markers that mean a statement is denominated in Philippine pesos.
 *
 * `company_financials.currency_unit` is free text PSE Edge takes verbatim from
 * each company's own filing, and it is a mess: across 282 companies the live
 * values include "Php", "PHP", "PESOS", "Phil. Peso", "In Thousand Php",
 * "Php in ('000) / ratios", "amounts in million Php", and the typos
 * "Philppine Peso" and "Philippine Curreccy". Matching a peso marker anywhere
 * in the string is the only thing that survives that variety.
 */
const PESO_MARKERS = ["php", "peso", "philippine", "philppine", "phil.", "₱"];

/**
 * Foreign-currency markers. Belt and braces on top of the allowlist above,
 * for a hypothetical string naming both.
 */
const FOREIGN_MARKERS = ["usd", "u.s.", "us dollar", "cad", "c$", "csm", "eur", "€", "$"];

/**
 * Whether a statement is in pesos, and therefore whether its per-share lines
 * can be divided into a peso share price at all.
 *
 * THIS IS NOT PEDANTRY, it is the one check unitScale below structurally
 * cannot make. A handful of PSE issuers file in a foreign currency: Manulife
 * (`"CSM except EPS &amp; BV"`) and Sun Life (`"C$millions except EPS&amp;B"`)
 * report in Canadian dollars, and IMI (`"in US Dollar"`), First Gen
 * (`"USD (in thousands)"`), ION, OGP and OPM report in US dollars. The scale
 * check compares net income against EPS to derive an implied share count, and
 * both sides are in the same foreign currency, so the currency cancels and the
 * check sees a perfectly valid "statement in millions". The resulting P/E is
 * then wrong by the exchange rate: Manulife measured 811 against a true figure
 * near 20, which is exactly the CAD/PHP rate, and it looked entirely plausible
 * as a number. Nothing but the unit string catches this.
 *
 * Fails closed. A null or unrecognized unit yields no ratio, because "we could
 * not tell what currency this is in" is not a basis for publishing a multiple.
 */
export function isPesoDenominated(currencyUnit: string | null): boolean {
  if (!currencyUnit) return false;
  const unit = currencyUnit.toLowerCase();
  if (FOREIGN_MARKERS.some((m) => unit.includes(m))) return false;
  return PESO_MARKERS.some((m) => unit.includes(m));
}

export interface ValuationInputs {
  /** company_financials.currency_unit, verbatim. Gates both ratios: see
   * isPesoDenominated. */
  currencyUnit: string | null;
  /** Quote.price. Null means the stock did not trade, not zero. */
  price: number | null;
  /** Quote.marketCap, in pesos. Total, not float-adjusted. */
  marketCap: number;
  /** company_financials.eps_basic_current. Diluted is deliberately not used:
   * basic is the figure PSE Edge reports most consistently. */
  epsBasic: number | null;
  /** company_financials.book_value_per_share_current. */
  bookValuePerShare: number | null;
  /** Preferred numerator for the EPS unit check: EPS is computed on income
   * attributable to the parent, so a holding company's consolidated
   * net-income-after-tax would overstate the implied share count. */
  netIncomeAttributableToParent: number | null;
  netIncomeAfterTax: number | null;
  /** Same preference for the book-value check. */
  stockholdersEquityParent: number | null;
  stockholdersEquity: number | null;
}

export interface Valuation {
  peRatio: number | null;
  pbRatio: number | null;
  /**
   * True when EPS is present and non-positive, i.e. the company reported a
   * loss. Distinct from `peRatio === null` with this false, which means the
   * figure is simply missing. Callers use it to say "N/A (loss)" instead of
   * dropping the tile, because "this ratio does not exist" is real
   * information and "we don't have it" is not.
   */
  epsNegative: boolean;
  /** Same, for a company with negative book value. Rare but real on
   * distressed PH issuers. */
  bookValueNegative: boolean;
}

export interface ScaleCheck {
  /** impliedShares / realShares. Null when either side is underivable. */
  ratio: number | null;
  /** The nearest valid exponent, when the ratio landed close enough to one. */
  exponent: number | null;
  ok: boolean;
}

/**
 * Derives which unit regime a statement's per-share line is in, by comparing
 * two independent estimates of the same share count:
 *
 *   real shares    = marketCap / price          (both live, both in pesos)
 *   implied shares = netIncome / earningsPerShare   (both from the statement)
 *
 * If the statement totals are in millions and EPS is in pesos, the implied
 * count comes out a million times too small, so the ratio lands on 1e-6. Raw
 * pesos throughout lands on 1. Thousands lands on 1e-3. Anything else means
 * the per-share figure is not in the same unit as the price and there is no
 * honest ratio to print.
 *
 * Exported so etl/scripts can print the distribution across every backfilled
 * ticker, which is how the convention above gets verified against real data
 * rather than assumed.
 */
export function unitScale(
  total: number | null,
  perShare: number | null,
  marketCap: number,
  price: number | null
): ScaleCheck {
  if (
    total == null ||
    perShare == null ||
    price == null ||
    !Number.isFinite(total) ||
    !Number.isFinite(perShare) ||
    !Number.isFinite(marketCap) ||
    !Number.isFinite(price) ||
    price <= 0 ||
    marketCap <= 0 ||
    perShare === 0
  ) {
    return { ratio: null, exponent: null, ok: false };
  }

  const realShares = marketCap / price;
  const impliedShares = total / perShare;
  if (realShares <= 0 || impliedShares <= 0) return { ratio: null, exponent: null, ok: false };

  const ratio = impliedShares / realShares;
  const log = Math.log10(ratio);

  for (const exponent of VALID_SCALE_EXPONENTS) {
    if (Math.abs(log - exponent) <= SCALE_TOLERANCE_LOG10) {
      return { ratio, exponent, ok: true };
    }
  }
  return { ratio, exponent: null, ok: false };
}

/** price / earnings per share. Null unless both sides are real and positive. */
export function priceToEarnings(price: number | null, eps: number | null): number | null {
  if (price == null || eps == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(eps)) return null;
  if (price <= 0 || eps <= 0) return null;

  const pe = price / eps;
  if (!Number.isFinite(pe) || pe > MAX_PLAUSIBLE_PE) return null;
  return pe;
}

/** price / book value per share. Null unless both sides are real and positive. */
export function priceToBook(price: number | null, bookValuePerShare: number | null): number | null {
  if (price == null || bookValuePerShare == null) return null;
  if (!Number.isFinite(price) || !Number.isFinite(bookValuePerShare)) return null;
  if (price <= 0 || bookValuePerShare <= 0) return null;

  const pb = price / bookValuePerShare;
  if (!Number.isFinite(pb) || pb > MAX_PLAUSIBLE_PB) return null;
  return pb;
}

/**
 * Both ratios for one company, gated on the unit cross-check.
 *
 * The cross-check is why this takes net income and equity at all: neither
 * appears in the output, and both exist purely to prove the per-share figure
 * is denominated in pesos before a number derived from it goes on a page.
 * When the check cannot run (no net income on file, for instance) the ratio is
 * withheld rather than published unverified.
 */
export function computeValuation(inputs: ValuationInputs): Valuation {
  const {
    currencyUnit,
    price,
    marketCap,
    epsBasic,
    bookValuePerShare,
    netIncomeAttributableToParent,
    netIncomeAfterTax,
    stockholdersEquityParent,
    stockholdersEquity,
  } = inputs;

  const epsNegative = epsBasic != null && Number.isFinite(epsBasic) && epsBasic <= 0;
  const bookValueNegative =
    bookValuePerShare != null && Number.isFinite(bookValuePerShare) && bookValuePerShare <= 0;

  // Reported in a foreign currency: no ratio against a peso price is possible.
  // epsNegative/bookValueNegative still report honestly, since a loss is a
  // loss in any currency.
  if (!isPesoDenominated(currencyUnit)) {
    return { peRatio: null, pbRatio: null, epsNegative, bookValueNegative };
  }

  const earnings = netIncomeAttributableToParent ?? netIncomeAfterTax;
  const equity = stockholdersEquityParent ?? stockholdersEquity;

  const peScale = unitScale(earnings, epsBasic, marketCap, price);
  const pbScale = unitScale(equity, bookValuePerShare, marketCap, price);

  return {
    peRatio: peScale.ok ? priceToEarnings(price, epsBasic) : null,
    pbRatio: pbScale.ok ? priceToBook(price, bookValuePerShare) : null,
    epsNegative,
    bookValueNegative,
  };
}

/**
 * Trailing-12-month dividend yield as a percentage.
 *
 * The single home for an expression that used to live in two places, verbatim
 * and with the same guard: lib/dividends.ts's screener row builder and the
 * per-stock page's hero rail. Same semantics as before, so buildDividendScreener's
 * existing tests cover it unchanged.
 */
export function dividendYieldPct(ttmDividend: number, price: number | null): number | null {
  if (price == null || !Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(ttmDividend) || ttmDividend <= 0) return null;
  return (ttmDividend / price) * 100;
}
