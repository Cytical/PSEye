# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PSEye — a free, community-first tracker for the Philippine Stock Exchange (PSE). pnpm + Turborepo monorepo.

## Commands

Run from the repo root unless noted.

- `pnpm install` — install all workspace deps
- `pnpm dev` — `turbo run dev` (starts `apps/web` on localhost:3000)
- `pnpm build` / `pnpm lint` / `pnpm typecheck` — run across all packages via Turbo (each depends on `^build` first)
- Scope any script to one package: `pnpm --filter @pseye/web <script>` (package names: `@pseye/web`, `@pseye/db`, `@pseye/etl`, `@pseye/source-quotes`, `@pseye/source-news`, `@pseye/treemap-layout`, `@pseye/config`)
- `pnpm db:generate` / `pnpm db:push` — Drizzle Kit generate/push against `packages/db/src/schema.ts`; both require `DATABASE_URL` (Neon Postgres) in the environment
- `pnpm --filter @pseye/etl fetch-quotes` / `fetch-news` — run an ETL job locally; both require `DATABASE_URL`. In production these run on a schedule via GitHub Actions (`.github/workflows/quotes-daily.yml` weekdays after PSE close, `news-hourly.yml` hourly), not on app request.
- There is no test suite in this repo yet.

## Architecture

Turborepo/pnpm workspaces: `apps/*`, `packages/*`, `packages/sources/*`, `etl`.

- **`apps/web`** — Next.js 16 (App Router) + React 19 frontend. Two routes: `/` (`MarketMapPage`, the treemap "market map") and `/news`. Both are async Server Components using ISR (`export const revalidate`) rather than client fetching. `apps/web/AGENTS.md` / `CLAUDE.md` flags that this Next.js version has breaking changes vs. training data — check `node_modules/next/dist/docs/` before writing Next-specific code.
- **`packages/treemap-layout`** (`@pseye/treemap-layout`) — pure layout + color math, no React/DOM dependency (kept that way so it can be reused by a planned static Satori-rendered share image, per its own doc comments). `computeLayout.ts` groups stocks by sector and sizes boxes by market cap with `d3-hierarchy`'s squarified treemap. `color.ts` builds the diverging (red↓ / green↑) `%`-change color scale with `d3-scale`/`d3-interpolate`, separately for light/dark mode, plus a WCAG-contrast helper (`getContrastText`) to pick label ink color.
- **`packages/db`** (`@pseye/db`) — Drizzle ORM schema (`daily_quotes`, `news_items`) + Neon serverless Postgres client (`createDb`). `drizzle.config.ts` reads `DATABASE_URL`. Note: `apps/web` lists `@pseye/db` as a dependency but doesn't query it yet — both web routes currently read straight from the source packages (`MockQuoteSource`, RSS `NewsSource`s), not from the database. The DB is populated by the ETL jobs but nothing yet reads it back on the web side.
- **`packages/sources/quotes`** and **`packages/sources/news`** — pluggable source interfaces (`QuoteSource`, `NewsSource`). Only implementations today: `MockQuoteSource` (fabricated sample quotes — a real, legally-sound price feed is an open question noted in `apps/web/app/page.tsx`) and RSS-backed news sources (`createRssSource`, configured per-outlet in `outlets.ts`, auto-tagged by PSE ticker via `tickerTagger.ts`'s alias dictionary). Swap implementations behind the interface; don't change callers.
- **`etl`** — standalone `tsx` scripts (no build step) invoked by the GitHub Actions workflows above; each upserts source data into Postgres via `@pseye/db` (`fetch-quotes.ts` keyed on ticker+tradeDate, `fetch-news.ts` dedupes on URL).
- **`packages/config`** (`@pseye/config`) — shared base `tsconfig.json` extended by every other package.
