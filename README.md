# PSEye

A free, community-first tracker for the Philippine Stock Exchange (PSE) — built to fill
gaps that existing PH tools (PSE EQUIP, Investagrams/Rival, broker platforms, TradingView)
either don't cover or gate behind paywalls. Read-only and informational only: no brokerage
functionality, no real-time intraday claims, no stock picks or buy/sell signals.

Full product/technical planning brief: [`docs/PLANNING.md`](docs/PLANNING.md).

## Features

| Route | What it does |
|---|---|
| `/` | PSEi market map — a treemap heatmap sized by market cap, colored by day's % change, grouped by PSE's 6 sectors |
| `/charts` | Interactive candlestick charts via TradingView's free embed (NASDAQ names only — see "Data sources") |
| `/news` | PH business news headlines, auto-tagged by PSE ticker |
| `/calendar` | Dividend & corporate actions calendar (ex-date/record/payment dates, plain-language explainers) |
| `/block-sales` | Large negotiated "cross" trades from PSE's Monthly Report |
| `/disclosures` | PSE Edge filings distilled into a per-company digest |
| `/offerings` | IPO / follow-on / rights offer tracker with subscription countdowns |
| `/foreign-flow` | Weekly index-level and per-stock net foreign buying/selling |
| `/dca` | Cost-averaging calculator — simulate DCA into a stock or an equal-weighted market proxy |

Several features now run on real data scraped from public PSE Edge pages/PDFs; others
still run on fabricated sample data pending a legally-sound real source — see "Data
sources" below for exactly which is which.

## Stack

- **Frontend**: Next.js 16 (App Router) + React 19, Tailwind CSS. Server Components with
  ISR (`export const revalidate`) rather than client-side fetching, except the DCA
  calculator and Charts page's interactive client components. The DCA calculator fetches
  a real Route Handler (`apps/web/app/api/history/route.ts`) for historical prices rather
  than running its simulation over purely client-generated data.
- **Database**: Postgres via [Neon](https://neon.tech) (serverless) + [Drizzle ORM](https://orm.drizzle.team).
- **ETL**: standalone `tsx` scripts in `etl/`, scheduled via GitHub Actions (see
  `.github/workflows/`) — no long-running server, no app-triggered fetches.
- **Monorepo**: pnpm workspaces + Turborepo.

## Repo structure

```
apps/web              Next.js app (all routes, UI components)
packages/db            Drizzle schema, Neon client, query helpers
packages/sources/*      One pluggable *Source interface + mock implementation per feature
packages/treemap-layout  Pure layout + color math for the market map (no React/DOM)
etl                    Scheduled fetch jobs (tsx, no build step)
docs/PLANNING.md       Original planning brief + running execution log
```

Every data feature follows the same pattern: a `packages/sources/<feature>` package
defines a small interface (e.g. `QuoteSource`, `DisclosureSource`) plus a `Mock*` class
that fabricates realistic sample data; a `packages/db` schema table; an `etl/jobs/*.ts`
script that upserts into Postgres; and a page in `apps/web/app/*`. Swapping a mock for a
real feed means writing a new class against the same interface — no caller changes.

## Getting started

```bash
pnpm install
pnpm dev        # starts apps/web on localhost:3000
```

No `DATABASE_URL` is required to run the app locally — every page falls back to sample
data when the database isn't configured or hasn't been populated yet (see
`apps/web/lib/quotes.ts` for the pattern).

To wire up a real database:

```bash
export DATABASE_URL=postgres://...   # a Neon connection string
pnpm db:generate                     # generate a Drizzle migration from packages/db/src/schema.ts
pnpm db:push                         # apply it
pnpm --filter @pseye/etl fetch-quotes   # populate a table locally, e.g.
```

In production, each `etl/jobs/*.ts` script runs on its own schedule via GitHub Actions
(daily/hourly/weekly/monthly depending on the feature) — see `.github/workflows/`.

Other useful commands:

```bash
pnpm build       # turbo run build across all packages
pnpm lint        # eslint (apps/web)
pnpm typecheck   # tsc --noEmit across all packages
```

## Data sources

Each feature is designed so a `Mock*Source` can be swapped for a real one without
touching any caller (one small `*Source` interface per feature in `packages/sources/*`).
Current status per feature:

| Feature | Status | Source |
|---|---|---|
| Quotes (market map, DCA anchor price) | Real | PSE Edge per-company "Stock Data" pages |
| Historical quotes (DCA) | Real | PSE Edge's own price-chart JSON endpoint |
| News | Real | RSS feeds |
| Disclosures | Real | PSE Edge's announcements search |
| Corporate actions (dividends) | Real | PSE Edge's dividends & rights listing |
| Foreign flow — index-level | Real | PSE's free weekly Market Watch PDF |
| Foreign flow — per-stock rankings | Sample data | no free public source found (needs the full Monthly Report, which isn't freely published) |
| Block sales | Sample data | same reason as above |
| Offerings / IPO tracker | Sample data | the one free feed found is currently empty and lacks the dates this feature needs |
| Charts (TradingView embed) | Real, but NASDAQ only | TradingView's free widgets refuse PSE-listed symbols (verified) |

PSE's published reports (Monthly Report, Market Watch PDF) restrict reproduction/
redistribution, and true real-time market data is a licensed, paid product — every real
source above reads a public page/PDF for delayed/EOD figures, not a licensed feed, and
none of it re-hosts PSE's documents themselves. See `docs/PLANNING.md`'s execution log
for the full reasoning, what was investigated for the still-mock features, and why.

## Non-goals

No brokerage or trading functionality. No real-time intraday data claims (delayed/EOD is
expected). No reproducing full news articles or PSE's PDF reports verbatim. No financial
advice, stock picks, or buy/sell signals.
