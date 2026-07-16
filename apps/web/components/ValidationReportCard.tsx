import type { ValidationReport } from "@/lib/dataValidation";

export function ValidationReportCard({
  title,
  report,
}: {
  title: string;
  report: ValidationReport;
}) {
  const errorCount = report.issues.filter((i) => i.severity === "error").length;
  const warningCount = report.issues.filter((i) => i.severity === "warning").length;
  const passed = errorCount === 0;

  return (
    <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        <span
          className={
            passed
              ? "rounded-full bg-green-600/10 px-2.5 py-1 text-xs font-medium text-green-700 dark:text-green-400"
              : "rounded-full bg-red-600/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400"
          }
        >
          {passed ? "PASS" : `FAIL (${errorCount} error${errorCount === 1 ? "" : "s"})`}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3 md:grid-cols-6">
        <Stat label="Total" value={report.totalCount} />
        <Stat label="With price" value={report.withPriceCount} />
        <Stat label="N/A" value={report.naCount} />
        <Stat label="Up" value={report.positiveCount} className="text-green-700 dark:text-green-400" />
        <Stat label="Down" value={report.negativeCount} className="text-red-700 dark:text-red-400" />
        <Stat label="Flat" value={report.flatCount} />
      </dl>

      {report.issues.length > 0 && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/10 dark:text-white/50">
                <th className="py-1.5 pr-3">Severity</th>
                <th className="py-1.5 pr-3">Ticker</th>
                <th className="py-1.5 pr-3">Company</th>
                <th className="py-1.5">Issue</th>
              </tr>
            </thead>
            <tbody>
              {report.issues.map((issue, i) => (
                <tr key={`${issue.ticker}-${i}`} className="border-b border-black/5 dark:border-white/5">
                  <td className="py-1.5 pr-3">
                    <span
                      className={
                        issue.severity === "error"
                          ? "text-red-700 dark:text-red-400"
                          : "text-amber-700 dark:text-amber-400"
                      }
                    >
                      {issue.severity}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3 font-mono">{issue.ticker || "—"}</td>
                  <td className="py-1.5 pr-3">{issue.companyName || "—"}</td>
                  <td className="py-1.5">{issue.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {report.issues.length === 0 && (
        <p className="mt-4 text-sm text-black/50 dark:text-white/50">
          No issues found — {warningCount} warnings, {errorCount} errors.
        </p>
      )}
    </section>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-black/50 dark:text-white/50">{label}</dt>
      <dd className={`text-lg font-semibold ${className ?? ""}`}>{value}</dd>
    </div>
  );
}
