// Vercel Cron -> GitHub workflow_dispatch bridge.
//
// Why this exists: GitHub Actions' *scheduled* (cron) runs are best-effort and
// get dropped under load — for a high-frequency (4x/hour) schedule they were
// dropped >95% of the time, so the quotes/market-snapshot ETL routinely went a
// whole trading day without running (see the two prior cron-tweak commits that
// didn't fix it). GitHub's workflow_dispatch API, by contrast, is reliable. So
// we keep the ETL jobs exactly where they are (full Node env, no function
// time limit, DATABASE_URL already a repo secret) and replace only the flaky
// *trigger*: Vercel Cron (a reliable scheduler) hits this route on schedule,
// and this route dispatches the two workflows via the API.
//
// Auth: Vercel automatically sends `Authorization: Bearer $CRON_SECRET` on cron
// invocations when the CRON_SECRET env var is set — we reject anything else so
// the endpoint can't be triggered by the public. The GitHub PAT lives in
// GH_DISPATCH_TOKEN (fine-grained, repo-scoped, Actions: read/write).

export const dynamic = "force-dynamic";

const REPO = "Cytical/PSEye";
const REF = "master";
const WORKFLOWS = ["quotes-15min.yml", "market-snapshot-15min.yml"] as const;

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return Response.json({ error: "GH_DISPATCH_TOKEN is not set" }, { status: 500 });
  }

  const results = await Promise.all(
    WORKFLOWS.map(async (workflow) => {
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/actions/workflows/${workflow}/dispatches`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ref: REF }),
        },
      );
      // A successful dispatch returns 204 No Content.
      return { workflow, ok: res.ok, status: res.status, body: res.ok ? undefined : await res.text() };
    }),
  );

  const allOk = results.every((r) => r.ok);
  return Response.json({ dispatched: results }, { status: allOk ? 200 : 502 });
}
