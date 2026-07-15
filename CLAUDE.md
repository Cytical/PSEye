# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PSEye — a free, community-first tracker for the Philippine Stock Exchange (PSE). pnpm + Turborepo monorepo.

## Commands

Run from the repo root unless noted.

- `pnpm install` — install all workspace deps
- `pnpm dev` — `turbo run dev` (starts `apps/web` on localhost:3000)
- `pnpm build` / `pnpm lint` / `pnpm typecheck` — run across all packages via Turbo (each depends on `^build` first)
- Scope any script to one package: `pnpm --filter @pseye/web <script>` (package names: `@pseye/web`, `@pseye/db`, `@pseye/etl`, `@pseye/source-quotes`, `@pseye/source-news`, `@pseye/source-corporate-actions`, `@pseye/source-block-sales`, `@pseye/source-disclosures`, `@pseye/source-offerings`, `@pseye/source-foreign-flow`, `@pseye/treemap-layout`, `@pseye/config`)
- `pnpm db:generate` / `pnpm db:push` — Drizzle Kit generate/push against `packages/db/src/schema.ts`; both require `DATABASE_URL` (Neon Postgres) in the environment. No migrations have been generated/pushed yet — do that before relying on the DB-backed read path below.
- `pnpm --filter @pseye/etl fetch-quotes` / `fetch-news` / `fetch-corporate-actions` / `fetch-block-sales` / `fetch-disclosures` / `fetch-offerings` / `fetch-foreign-flow` — run an ETL job locally; all require `DATABASE_URL`. In production these run on a schedule via GitHub Actions (`.github/workflows/*.yml` — daily/hourly/weekly/monthly depending on the job), not on app request.
- There is no test suite in this repo yet.

## Architecture

Turborepo/pnpm workspaces: `apps/*`, `packages/*`, `packages/sources/*`, `etl`.

- **`apps/web`** — Next.js 16 (App Router) + React 19 frontend. Routes: `/` (`MarketMapPage`, the treemap "market map"), `/news`, `/calendar` (dividend & corporate actions), `/block-sales`, `/disclosures`, `/offerings` (IPO/follow-on tracker), `/foreign-flow`, and `/dca` (cost-averaging calculator). All are async Server Components using ISR (`export const revalidate`) rather than client fetching, except the DCA calculator's interactive core (`DcaCalculator`/`DcaChart`, client components — the simulation runs in-browser over a synthetic price series, no API route). `apps/web/AGENTS.md` / `CLAUDE.md` flags that this Next.js version has breaking changes vs. training data — check `node_modules/next/dist/docs/` before writing Next-specific code.
- **`apps/web/lib/quotes.ts`** — `getDailyQuotes()` is the one place that picks a `QuoteSource`: DB-backed (via `@pseye/db`'s `getLatestDailyQuotes`) when `DATABASE_URL` is set and populated, falling back to `MockQuoteSource` otherwise (including on any DB error). Both `/` and `/dca` call this instead of instantiating a source directly — keep it that way so there's one fallback path, not several.
- **`packages/treemap-layout`** (`@pseye/treemap-layout`) — pure layout + color math, no React/DOM dependency (kept that way so it can be reused by a planned static Satori-rendered share image, per its own doc comments). `computeLayout.ts` groups stocks by sector and sizes boxes by market cap with `d3-hierarchy`'s squarified treemap. `color.ts` builds the diverging (red↓ / green↑) `%`-change color scale with `d3-scale`/`d3-interpolate`, separately for light/dark mode, plus a WCAG-contrast helper (`getContrastText`) to pick label ink color. `ForeignFlowChart` reuses the same green/red finance convention for its own polarity metric (net buying/selling).
- **`packages/db`** (`@pseye/db`) — Drizzle ORM schema (`daily_quotes`, `news_items`, `corporate_actions`, `block_sales`, `disclosures`, `offerings`, `index_foreign_flow`, `stock_foreign_flow`) + Neon serverless Postgres client (`createDb`) + hand-written query helpers (`queries.ts`, e.g. `getLatestDailyQuotes`). `drizzle.config.ts` reads `DATABASE_URL`. No migrations have been generated yet (`packages/db/drizzle/` doesn't exist) — run `pnpm db:generate` then `pnpm db:push` once a real `DATABASE_URL` is available, before the ETL jobs or the DB-backed read path in `apps/web/lib/quotes.ts` will do anything.
- **`packages/sources/*`** — one pluggable source interface + mock implementation per feature: `quotes` (`QuoteSource`, `HistoricalQuoteSource`), `news` (`NewsSource`), `corporate-actions` (`CorporateActionSource`), `block-sales` (`BlockSaleSource`), `disclosures` (`DisclosureSource`), `offerings` (`OfferingSource`), `foreign-flow` (`ForeignFlowSource`). Every mock class is a deliberate placeholder for a real feed/scraper that doesn't exist yet (each has a doc comment naming what would replace it — e.g. a PSE Edge poller, a PDF-table-extraction pipeline for PSE's Monthly Report/Market Watch PDFs); RSS news (`createRssSource`) and `MockHistoricalQuoteSource`'s deterministic pseudo-random price walk are the only two with any real logic behind them today. Swap implementations behind the interface; don't change callers. `MockHistoricalQuoteSource` takes the *current* quotes as a constructor param (not a fixed internal list) specifically so its anchor price always matches whatever `QuoteSource` the caller is actually using (DB or mock) — see `apps/web/components/DcaCalculator.tsx`.
- **`etl`** — standalone `tsx` scripts (no build step) invoked by the GitHub Actions workflows in `.github/workflows/` (one per job; cadence matches each real-world source's publish schedule — daily for quotes/corporate-actions/offerings, hourly for news/disclosures, weekly for foreign-flow, monthly for block-sales); each upserts source data into Postgres via `@pseye/db`, deduping on a natural key per table (ticker+date, URL, reference number, etc. — see each job for its `onConflictDoNothing`/`onConflictDoUpdate` target).
- **`packages/config`** (`@pseye/config`) — shared base `tsconfig.json` extended by every other package.
