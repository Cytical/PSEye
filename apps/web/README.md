# @pseye/web

The Next.js frontend for PSEye. See the [root README](../../README.md) for the project
overview, feature list, and repo-wide setup instructions.

## Local dev

From the repo root:

```bash
pnpm install
pnpm dev   # or: pnpm --filter @pseye/web dev
```

Runs on [http://localhost:3000](http://localhost:3000). No `DATABASE_URL` is required —
every route falls back to sample data (see `lib/quotes.ts`) when the database isn't
configured or populated.

## This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

To automatically optimize and load [Geist](https://vercel.com/font).
