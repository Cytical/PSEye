import type { WorkflowGroup, WorkflowRunsResult } from "@/lib/workflowRuns";

/**
 * Renders the GitHub Actions fetch history on the /test dev dashboard: per
 * workflow, a run-by-run strip (oldest→newest) colored by outcome, so a week
 * of ETL health reads at a glance and any failure is one hover away. Styled to
 * match the rest of the /test page (plain black/white opacity, not the site's
 * up/down finance colors — these are build-status greens/reds).
 */
export function WorkflowRunsCard({ data }: { data: WorkflowRunsResult }) {
  return (
    <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Data fetch history, last {data.windowDays} days</h2>
        <span className="text-xs text-black/50 dark:text-white/50">
          {data.repo} · Actions · refreshed {fmtManila(data.fetchedAt)}
        </span>
      </div>
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">
        Every scheduled ETL run and its outcome, straight from the GitHub Actions API. The database
        only shows successful writes, so this is where a failed or skipped fetch actually surfaces.
        Times are Manila time; each square links to its run log.
      </p>

      {!data.ok ? (
        <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Couldn&apos;t load run history: {data.error}. (Unauthenticated GitHub API is rate-limited
          to 60/hr per IP. Set GITHUB_TOKEN to raise it.)
        </p>
      ) : (
        <>
          <Legend />
          {data.etlGroups.length === 0 && (
            <p className="mt-4 text-xs text-black/50 dark:text-white/50">
              No ETL runs in the last {data.windowDays} days.
            </p>
          )}
          <div className="mt-3 space-y-4">
            {data.etlGroups.map((g) => (
              <GroupRow key={g.file} group={g} />
            ))}
          </div>

          {data.otherGroups.length > 0 && (
            <details className="mt-5">
              <summary className="cursor-pointer text-xs font-medium text-black/60 dark:text-white/60">
                Other workflows (CI, migrations, backfills): {data.otherGroups.length}
              </summary>
              <div className="mt-3 space-y-4">
                {data.otherGroups.map((g) => (
                  <GroupRow key={g.file} group={g} />
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}

function GroupRow({ group }: { group: WorkflowGroup }) {
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotBg(group.latestConclusion)}`} aria-hidden="true" />
          <span className="text-sm font-medium">{group.name}</span>
          <span className="font-mono text-[11px] text-black/40 dark:text-white/40">{group.file}</span>
        </div>
        <div className="text-[11px] text-black/50 dark:text-white/50">
          {group.runs.length} runs · <span className="text-emerald-600 dark:text-emerald-400">{group.successes} ✓</span>
          {group.failures > 0 && (
            <>
              {" · "}
              <span className="text-red-600 dark:text-red-400">{group.failures} ✗</span>
            </>
          )}
          {group.latestAt && <> · last {fmtManila(group.latestAt)}</>}
        </div>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {group.runs
          .slice()
          .reverse()
          .map((r) => (
            <a
              key={r.id}
              href={r.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              title={`${fmtManila(r.createdAt)} · ${r.conclusion ?? r.status} · ${r.event}`}
              className={`h-4 w-4 rounded-sm ${dotBg(r.conclusion)} transition-transform hover:scale-125`}
            />
          ))}
      </div>
    </div>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["success", "success"],
    ["failure", "failure"],
    ["cancelled", "cancelled/skipped"],
    [null as unknown as string, "running"],
  ];
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-black/50 dark:text-white/50">
      {items.map(([c, label]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`inline-block h-3 w-3 rounded-sm ${dotBg(c ?? null)}`} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

function dotBg(conclusion: string | null): string {
  switch (conclusion) {
    case "success":
      return "bg-emerald-500";
    case "failure":
    case "startup_failure":
      return "bg-red-500";
    case "cancelled":
    case "skipped":
      return "bg-zinc-400 dark:bg-zinc-600";
    case null:
      return "bg-amber-400 animate-pulse";
    default:
      return "bg-zinc-300 dark:bg-zinc-700";
  }
}

function fmtManila(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
