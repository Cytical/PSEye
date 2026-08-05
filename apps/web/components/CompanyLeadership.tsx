import type { CompanyPersonRow } from "@/lib/companyProfiles";
import { SubHead } from "./StockAnalytics";

/**
 * Static server-rendered Board of Directors / Management Officers rosters —
 * panel body only, same "chrome belongs to the Panel wrapper" convention as
 * CompanyFinancials. Source is PSE Edge's own "Directors and Management" tab
 * (see parseDirectorsAndManagement.ts). Rendered as two side-by-side lists
 * rather than a numeric table (no figures here, just position/name pairs),
 * matching PSE Edge's own boxLeft/boxRight layout for that page.
 */
export function CompanyLeadership({
  boardOfDirectors,
  managementOfficers,
}: {
  boardOfDirectors: CompanyPersonRow[];
  managementOfficers: CompanyPersonRow[];
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <PersonList title="Board of Directors" people={boardOfDirectors} />
      <PersonList title="Management officers" people={managementOfficers} />
    </div>
  );
}

function PersonList({ title, people }: { title: string; people: CompanyPersonRow[] }) {
  return (
    <div>
      <SubHead>{title}</SubHead>
      <ul className="mt-1.5 divide-y divide-panel-border">
        {people.map((person, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3 py-1.5 text-xs">
            <span className="text-panel-fg/60">{person.position}</span>
            <span className="text-right font-medium text-panel-fg">{person.name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** True when at least one roster has an entry — the gate the caller uses to
 * decide whether the panel is worth rendering at all. */
export function hasAnyLeadershipData(boardOfDirectors: CompanyPersonRow[], managementOfficers: CompanyPersonRow[]) {
  return boardOfDirectors.length > 0 || managementOfficers.length > 0;
}
