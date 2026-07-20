# Contributing to PSEye

PSEye is a free, community-first Philippine Stock Exchange tracker. Contributions are
welcome — bug fixes, data-accuracy fixes, and small feature additions especially.

## Getting started

```bash
pnpm install
pnpm dev        # starts apps/web on localhost:3000
```

No `DATABASE_URL` is required to run locally — every page falls back to realistic sample
data when the database isn't configured. See the root [README](README.md) for the full
setup, repo structure, and current real-vs-mock data source status.

## Before opening a PR

Run the same checks CI runs (`.github/workflows/ci.yml`):

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

All four must pass. Scope a command to one package with `pnpm --filter <package> <script>`
if you only touched one part of the monorepo.

## Architecture conventions

Read [`CLAUDE.md`](CLAUDE.md) before making non-trivial changes — it documents the patterns
this codebase actually follows, most importantly:

- Every data feature is a small `*Source` interface (`packages/sources/*`) with a `Mock*`
  implementation and, where a real source exists, a real one behind the same interface.
  Callers never instantiate a source directly — see `apps/web/lib/*.ts`'s
  "DB-backed when `DATABASE_URL` is set, otherwise mock, falling back on any DB error too"
  pattern.
- Real data sources scrape public PSE pages/PDFs (not a licensed feed) from scheduled
  GitHub Actions jobs in `etl/`, never per-request from the web app.
- Heavy/native-touching dependencies (PDF parsing, etc.) belong in `etl/lib/` or their own
  narrowly-scoped package, never inside a `packages/sources/*` barrel that `apps/web` imports.

## Reporting data issues

If a number looks wrong (price, dividend date, disclosure), please include the ticker and
which page you saw it on — see the issue templates for the exact fields that help most.

## Code of conduct

Be respectful and constructive. This is a solo-maintained project run in spare time —
response times will vary.
