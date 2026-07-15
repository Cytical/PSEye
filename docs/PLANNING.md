# PSEye — Product & Technical Planning Brief

> This is the original planning-mode brief the project was scoped from. Kept verbatim
> as durable context for future work sessions — see `CLAUDE.md` for the current
> as-built architecture, which supersedes this doc wherever the two disagree.

## Project summary
Build **PSEye**, a free, community-first web app that tracks the Philippine Stock Exchange (PSE/PSEi). It exists to fill gaps that existing PH tools (PSE EQUIP, Investagrams/Rival, broker platforms, TradingView) either don't cover or gate behind paywalls — most importantly a shareable market map, a foreign fund flow tracker, and a news aggregator built specifically for PSE.

## What I want from this planning session
This is a **planning-mode pass only** — do not write implementation code yet. I want back:
1. A recommended tech stack (frontend, backend/ETL, database, hosting) with reasoning.
2. A data pipeline design per feature below — source, fetch cadence, parsing approach, storage shape.
3. A suggested repo/project structure.
4. A phased roadmap: realistic v1 (MVP, solo, spare-time build), v2, and v3/stretch. The map + basic price data should anchor v1.
5. Open questions or decisions you need from me before implementation starts.

## Builder context (weight the plan toward this)
- Solo builder. Data Quality Analyst by trade, comfortable with Python (pandas, SQL) and JavaScript/TypeScript, Git. Less experienced with production backend/infra ops — prefer boring, well-documented choices over cutting-edge ones.
- Goal is users and usefulness, not revenue. No ads or paywall planned. Prefer free-tier/low-cost hosting and static-first architecture wherever it doesn't compromise the product.
- This will likely double as a public portfolio piece, so clean structure, documentation, and sensible commit history matter.

## Target users
Filipino retail investors — especially the large recent wave of new PSE accounts opened via GInvest/Maya-type on-ramps who have an account but little context for reading the market. Secondary audience: more experienced investors who want a fast, ad-light utility worth screenshotting and sharing.

## Explicit non-goals for v1
- No brokerage or trading functionality — read-only and informational only.
- No claims of true real-time intraday data. Delayed (15–30 min) or end-of-day data is expected and fine.
- No reproducing full news articles or PSE's PDF reports verbatim — aggregation, linking, and derived/recalculated data only.
- No financial advice framing, stock picks, or buy/sell signals.

## Feature backlog (treat as backlog to phase, not a v1 requirement list)

1. **PSEi/stock market map (treemap heatmap)** — flagship, most shareable feature.
   - Boxes sized by market cap, colored by day's % change.
   - Grouped by PSE's own 6-sector classification: Financials, Industrial, Holding Firms, Property, Services, Mining & Oil.
   - Should render well as a static, shareable image (social-media-friendly aspect ratio export).

2. **News aggregator**
   - Pull headlines + short snippets (never full article text) from PH business news RSS feeds (e.g. BusinessWorld, Inquirer Business, Philstar Business, Manila Bulletin Business, GMA News Business) plus the PSE Edge disclosure feed.
   - Auto-tag each item by the PSE ticker(s) it mentions so users can filter to a personal watchlist.

3. **Foreign fund flow tracker**
   - Source: PSE's free weekly "Market Watch" PDF and Monthly Report PDF (published at documents.pse.com.ph). These contain index-level foreign buying/selling/net figures, plus per-stock "Net Foreign Buying" / "Net Foreign Selling" rankings.
   - Pipeline: scheduled fetch → parse PDF tables (e.g. pdfplumber/camelot) → store the extracted numbers in our own database → visualize with our own chart. Do not re-host or reformat PSE's PDF/report itself — these carry a "no reproduction without consent" notice, so treat the underlying figures as the asset, not the document.
   - v1 scope: weekly/monthly granularity only. True daily/intraday per-stock foreign flow requires a licensed data feed (what powers COL Financial/Investagrams) — out of scope for now.

4. **Dividend & corporate actions calendar**
   - Ex-date/record date/payment date tracking, plus plain-language explainers distinguishing stock rights offerings, follow-on offerings, and property dividends for beginners.

5. **Block sales tracker**
   - Surface the "Block Sales" section from PSE's Monthly Report (large negotiated trades outside the normal order book) — currently buried in PDFs, not visualized anywhere.

6. **Insider disclosure digest**
   - Structured feed built on PSE Edge filings, grouped by company, distilled into a readable "who's filing what" view instead of the raw real-time stream PSE Edge shows today.

7. **IPO / follow-on offering tracker**
   - Subscription period countdowns plus plain-language context for first-time investors deciding whether to participate.

8. **DCA / dividend-reinvestment calculator**
   - Historical "what if you cost-averaged into the PSEi or [stock] since [date]" calculator.

9. **Portfolio tracker + watchlist alerts**
   - Lowest priority — most commoditized feature elsewhere. Build last, only if earlier features have traction.

## Data source & legal constraints to bake into the architecture
- PSE's published reports restrict reproduction/redistribution; true real-time market data is a licensed, paid product (see PSE EQUIP's premium tier).
- Default the whole system to delayed/EOD data from legally accessible sources (public PDFs, RSS feeds, free delayed quote sources). Flag clearly in the plan anywhere a paid data license would be required to go further (e.g. true intraday foreign flow).
- Design the data layer so a source can be swapped later without a rewrite, in case a licensed feed becomes available or a free source disappears.

## Branding
Working name: **PSEye**. Note in the plan anywhere branding affects structure (repo name, domain, asset naming), but naming isn't the focus of this pass.

---

## Execution log

Started an unattended, multi-session build-out against the feature backlog above on
2026-07-16. Progress, decisions, and deviations from this brief get appended below
(newest first) so future sessions — human or Claude — can pick up context fast.

### 2026-07-16
- Repo scaffold (Turborepo + pnpm, `apps/web`, `packages/db`, `packages/sources/*`,
  `packages/treemap-layout`, `etl`) already existed from the planning pass but had
  never been committed. Made the initial commit, then began working the backlog in
  roughly the phased order above, following the established pattern: pluggable
  `*Source` interface + mock implementation + Drizzle schema + ETL job + page.
- In one unattended session, built out backlog items #8, #4, #5, #6, #7, and #3 (DCA
  calculator, dividend/corporate actions calendar, block sales tracker, insider
  disclosure digest, IPO/follow-on offering tracker, foreign fund flow tracker) — every
  feature except #9 (portfolio tracker + watchlist alerts), which the brief itself flags
  as lowest priority and "build last, only if earlier features have traction." Each
  followed the same pattern established by the existing quotes/news packages: a
  `packages/sources/<feature>` package (interface + `Mock*Source` + doc comment naming
  the real feed/scraper it stands in for), a `packages/db` schema table, an
  `etl/jobs/*.ts` script + matching GitHub Actions workflow at that feature's real-world
  publish cadence, and an `apps/web/app/<route>` page. Verified with `pnpm typecheck`,
  `pnpm --filter @pseye/web lint`, and a production build after every feature; also
  smoke-tested each route against the already-running local dev server.
  - Also closed the "`apps/web` doesn't query the DB yet" gap CLAUDE.md flagged: added
    `apps/web/lib/quotes.ts` (`getDailyQuotes()`), which reads from Postgres when
    `DATABASE_URL` is configured and populated, falling back to `MockQuoteSource`
    otherwise or on any DB error. Both the market map and DCA pages now go through it.
    This surfaced a real gap in the existing schema (`daily_quotes` had no
    `company_name` column) and a latent bug the wiring would have introduced
    (`MockHistoricalQuoteSource` anchored to a fixed internal sample list rather than
    whatever quotes the caller actually has) — both fixed as part of the same change.
  - **Not done / no live DB to verify against**: `DATABASE_URL` was never set in this
    sandbox, so `pnpm db:generate`/`pnpm db:push` have never been run and
    `packages/db/drizzle/` (migrations) doesn't exist yet. The DB-backed read path and
    every new ETL job are typechecked and logically reviewed but **not** run against a
    real Postgres instance. Do that once `DATABASE_URL` is available, before trusting
    the DB path in production.
  - Nav grew to 8 links; extracted `apps/web/components/NavLinks.tsx` (client component,
    `usePathname`-based active-link highlighting) since `layout.tsx` needs to stay a
    Server Component for its `metadata` export. Nav wraps on narrow viewports rather
    than overflowing.
  - Added a root `README.md` (there wasn't one) covering the feature list, stack, repo
    structure, and how to run with/without a database.
- Kept going past the original backlog with polish passes, each verified with
  `pnpm typecheck` + `pnpm --filter @pseye/web lint` + a production build + fetching the
  affected route(s) from the running dev server:
  - Per-route `<title>`/description via a root title template + `metadataBase`; a shared
    `SiteFooter` for the standing "not financial advice / delayed data / not a brokerage"
    disclaimer; `sitemap.xml` + `robots.txt`.
  - `apps/web/app/opengraph-image.tsx`: a dynamic social-share image of the market map via
    `next/og` (Satori), reusing `packages/treemap-layout`'s pure functions exactly as that
    package's doc comments said it was kept dependency-free to allow. This is backlog
    item #1's "shareable, social-media-friendly aspect ratio export." Needed two real
    fixes to actually render: Satori requires an explicit `display` on any element with
    >1 child (the absolutely-positioned box container had none), and the ticker/%-change
    two-line label was rendering on one line until the `<>` fragment was replaced with a
    real wrapping `<div>`.
  - Added a `<details>`-based table view under the foreign-flow bar chart (the dataviz
    skill's accessibility rule: a chart needs a textual/tabular equivalent — the DCA
    chart already has this via its stat tiles, foreign-flow didn't).
  - Fixed a real, pre-existing bug found by inspection: `TreemapChart` hardcoded
    `pctChangeToColor(pctChange, "light")` at both call sites, so dark-mode viewers saw
    light-mode box colors even though `color.ts` has always had a dark palette. Fixed
    with a `useColorMode()` hook — deliberately `useSyncExternalStore`, not
    `useState`+`useEffect`, since the latter either violates the
    `react-hooks/set-state-in-effect` lint rule or (if the state's initial value reads
    `matchMedia` directly) creates a hydration mismatch between server and first client
    render.
- Cross-checked at the end that all 7 ETL jobs, their `etl/package.json` scripts, their
  GitHub Actions workflows, and their DB schema tables/dedupe keys are mutually
  consistent — no drift found.
