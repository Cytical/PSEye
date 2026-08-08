import {
  createDb,
  getLatestDailyIndexForeignFlow,
  getLatestIndexForeignFlow as getLatestIndexForeignFlowQuery,
} from "@pseye/db";
import { MockForeignFlowSource } from "@pseye/source-foreign-flow";

export interface LatestForeignFlow {
  /** YYYY-MM-DD — a real trade date once daily_index_foreign_flow has a row (see fetch-block-sales.ts), a weekly Friday/month-end if only the older weekly source has data yet. */
  periodEnd: string;
  netValue: number;
}

/**
 * DB-backed when DATABASE_URL is configured, preferring the real *daily*
 * total (daily_index_foreign_flow, populated by fetch-block-sales.ts — see
 * apps/web/lib/foreignFlow.ts for the full daily/weekly/mock fallback story)
 * over the older weekly figure (index_foreign_flow), over
 * MockForeignFlowSource's latest period. Falls back on any DB error too —
 * same contract as getDailyQuotes.
 */
export async function getLatestForeignFlow(): Promise<LatestForeignFlow> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return fromMock();

  try {
    const db = createDb(databaseUrl);
    const daily = await getLatestDailyIndexForeignFlow(db);
    if (daily) return { periodEnd: daily.periodEnd, netValue: daily.netValue };

    const weekly = await getLatestIndexForeignFlowQuery(db);
    if (!weekly) return fromMock();

    return { periodEnd: weekly.periodEnd, netValue: weekly.netValue };
  } catch (err) {
    console.error("getLatestForeignFlow: DB read failed, falling back to mock data", err);
    return fromMock();
  }
}

async function fromMock(): Promise<LatestForeignFlow> {
  const periods = await new MockForeignFlowSource().getIndexFlow();
  const latest = periods[periods.length - 1];
  return { periodEnd: latest.periodEnd, netValue: latest.netValue };
}
