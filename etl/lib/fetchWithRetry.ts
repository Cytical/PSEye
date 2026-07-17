/**
 * pse.com.ph's own server/WAF is intermittently flaky — confirmed live by
 * hitting https://www.pse.com.ph/market-report/ 5 times in immediate
 * succession with identical headers: 2 succeeded (200), 3 failed (500).
 * Not a header/UA/fingerprint issue (a fixed header set succeeds and fails
 * back-to-back), just an unreliable upstream. A single scheduled ETL run
 * that gives up on the first 500 would silently lose most days' data, so
 * every PSE market-report fetch (weekly Market Watch PDF, daily EOD report
 * PDF) should retry through this instead of calling fetch() directly.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  attempts = 4,
  delayMs = 750
): Promise<Response | null> {
  let lastStatus: number | null = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const res = await fetch(url, init);
    if (res.ok) return res;
    lastStatus = res.status;
    if (attempt < attempts) await sleep(delayMs * attempt);
  }
  console.error(`fetchWithRetry: giving up on ${url} after ${attempts} attempts, last HTTP ${lastStatus}`);
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
