/**
 * Server-only. Pulls recent GitHub Actions workflow-run history for the repo so
 * the /test dev dashboard can show WHEN each ETL job last ran and whether it
 * succeeded or failed — the DB only reflects successful writes, so a failed
 * fetch is otherwise invisible. Public-repo runs are readable from the REST API
 * unauthenticated (rate-limited to 60/hr per IP); a GITHUB_TOKEN in the env,
 * when present, raises that and is used automatically.
 *
 * The ETL workflows are the "data was fetched" jobs; CI / db-push / backfill are
 * categorized separately so the dashboard can foreground the data pipelines.
 */

const REPO = process.env.GITHUB_REPO ?? "Cytical/PSEye";
const WINDOW_DAYS = 7;
const MAX_PAGES = 3; // up to 300 runs — comfortably covers a week at current cadence

/** Workflow file basenames that fetch/ingest data (vs. CI, migrations, one-off backfills). */
const ETL_WORKFLOWS = new Set([
  "quotes-hourly.yml",
  "market-snapshot-hourly.yml",
  "fetch-daily.yml",
  "block-sales-daily.yml",
  "foreign-flow-weekly.yml",
]);

export interface WorkflowRun {
  id: number;
  name: string;
  file: string;
  event: string;
  status: string;
  /** "success" | "failure" | "cancelled" | "skipped" | "startup_failure" | null (still running) */
  conclusion: string | null;
  createdAt: string;
  htmlUrl: string;
  isEtl: boolean;
}

export interface WorkflowGroup {
  name: string;
  file: string;
  isEtl: boolean;
  runs: WorkflowRun[];
  successes: number;
  failures: number;
  /** Most recent run's conclusion — the "is it healthy right now" signal. */
  latestConclusion: string | null;
  latestAt: string | null;
}

export interface WorkflowRunsResult {
  ok: boolean;
  error: string | null;
  repo: string;
  windowDays: number;
  fetchedAt: string;
  etlGroups: WorkflowGroup[];
  otherGroups: WorkflowGroup[];
}

interface RawRun {
  id: number;
  name: string;
  path: string;
  event: string;
  status: string;
  conclusion: string | null;
  created_at: string;
  html_url: string;
}

export async function getWorkflowRuns(): Promise<WorkflowRunsResult> {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - WINDOW_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  const fetchedAt = new Date().toISOString();

  const base: WorkflowRunsResult = {
    ok: false,
    error: null,
    repo: REPO,
    windowDays: WINDOW_DAYS,
    fetchedAt,
    etlGroups: [],
    otherGroups: [],
  };

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "PSEye-dev-dashboard",
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const raw: RawRun[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `https://api.github.com/repos/${REPO}/actions/runs?per_page=100&page=${page}&created=%3E%3D${cutoffIso}`;
      const res = await fetch(url, { headers, next: { revalidate: 300 } });
      if (!res.ok) {
        return { ...base, error: `GitHub API ${res.status} ${res.statusText}` };
      }
      const json = (await res.json()) as { total_count: number; workflow_runs: RawRun[] };
      raw.push(...json.workflow_runs);
      if (json.workflow_runs.length < 100 || raw.length >= json.total_count) break;
    }
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : "network error" };
  }

  const runs: WorkflowRun[] = raw
    .filter((r) => r.created_at.slice(0, 10) >= cutoffIso)
    .map((r) => {
      const file = r.path.split("/").pop() ?? r.path;
      return {
        id: r.id,
        name: r.name,
        file,
        event: r.event,
        status: r.status,
        conclusion: r.conclusion,
        createdAt: r.created_at,
        htmlUrl: r.html_url,
        isEtl: ETL_WORKFLOWS.has(file),
      };
    });

  const byFile = new Map<string, WorkflowRun[]>();
  for (const run of runs) {
    let list = byFile.get(run.file);
    if (!list) {
      list = [];
      byFile.set(run.file, list);
    }
    list.push(run);
  }

  const groups: WorkflowGroup[] = [...byFile.values()].map((groupRuns) => {
    // Newest first for the "latest" signal; the strip renders oldest→newest below.
    const sorted = [...groupRuns].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    const latest = sorted[0];
    return {
      name: latest.name,
      file: latest.file,
      isEtl: latest.isEtl,
      runs: sorted,
      successes: sorted.filter((r) => r.conclusion === "success").length,
      failures: sorted.filter((r) => r.conclusion === "failure" || r.conclusion === "startup_failure").length,
      latestConclusion: latest.conclusion,
      latestAt: latest.createdAt,
    };
  });

  const byRecency = (a: WorkflowGroup, b: WorkflowGroup) =>
    (a.latestAt ?? "") < (b.latestAt ?? "") ? 1 : -1;

  return {
    ...base,
    ok: true,
    etlGroups: groups.filter((g) => g.isEtl).sort(byRecency),
    otherGroups: groups.filter((g) => !g.isEtl).sort(byRecency),
  };
}
