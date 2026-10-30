// One row per problem, counted the desk's way: a report is counted under the cause its tenant gives
// it (causes.ts). The reports the desk read as a one-day move (desk-notes.json) are a problem of
// their own, counted where they are filed and footnoted there.
import { causeOf, uniqueById, type Cause, type Report, type Tenant } from '#lib/kb/causes';

export type Problem = Cause | 'one-day' | 'unplaced';
export const PROBLEMS: readonly Problem[] = ['parser', 'hint', 'one-day'];

export type ProblemGroup = {
  problem: Problem;
  reports: Report[];
  // What intake tagged these reports as: tag → count.
  taggedAs: Record<string, number>;
  tenants: string[];
  channels: Record<string, number>;
  firstSeen: string;
  lastSeen: string;
  // For one-day: the cause each report is filed under. For a cause: how many of its reports are one-day moves.
  filedUnder?: Record<string, number>;
  oneDay?: number;
};

const count = (rs: Report[], key: (r: Report) => string) =>
  rs.reduce<Record<string, number>>((n, r) => ({ ...n, [key(r)]: (n[key(r)] ?? 0) + 1 }), {});

function group(problem: Problem, rs: Report[]): ProblemGroup {
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
}

export function groupByProblem(
  reports: Report[],
  tenantOf: (r: Report) => Tenant | undefined,
  oneDayMove: readonly string[],
): ProblemGroup[] {
  const unique = uniqueById(reports);
  const causeFor = (r: Report): Problem => causeOf(r, tenantOf(r)) ?? 'unplaced';
  const byCause = new Map<Problem, Report[]>();
  for (const r of unique) byCause.set(causeFor(r), [...(byCause.get(causeFor(r)) ?? []), r]);
  const causes = [...byCause.entries()]
    .map(([p, rs]) => ({ ...group(p, rs), oneDay: rs.filter((r) => oneDayMove.includes(r.id)).length }))
    .sort((a, b) => b.reports.length - a.reports.length);
  const moved = unique.filter((r) => oneDayMove.includes(r.id));
  return moved.length ? [...causes, { ...group('one-day', moved), filedUnder: count(moved, causeFor) }] : causes;
}
