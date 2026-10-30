// One problem per report: what ticket it belongs in. causes.ts tells parser from hint by tenant;
// the desk's own notes (desk-notes.json) name the reports that are not a flip at all.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

// A date that moves by one day is not the parser: the day and month stay in place.
export type Problem = Cause | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day'];

export function problemOf(r: Report, t: Tenant | undefined, oneDayMove: readonly string[]): Problem {
  if (oneDayMove.includes(r.id)) return 'one-day';
  return causeOf(r, t) ?? 'unplaced';
}

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
};

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const byProblem = new Map<Problem, Report[]>();
  for (const r of uniqueById(reports)) {
    const p = problemOf(r, tenantOf(r), oneDayMove);
    byProblem.set(p, [...(byProblem.get(p) ?? []), r]);
  }
  const count = (rs: Report[], key: (r: Report) => string) =>
    rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});
  return [...byProblem.entries()]
    .map(([problem, rs]) => {
      const days = rs.map((r) => r.receivedAt.slice(0, 10)).sort();
      return {
        problem,
        reports: rs,
        taggedAs: count(rs, (r) => r.meta.intakeTag),
        tenants: [...new Set(rs.map((r) => r.tenant))].sort(),
        channels: count(rs, (r) => r.channel),
        firstSeen: days[0],
        lastSeen: days[days.length - 1],
      };
    })
    .sort((a, b) => b.reports.length - a.reports.length);
}
