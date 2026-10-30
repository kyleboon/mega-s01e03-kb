<script lang="ts">
  import reports from '#lib/data/reports-4471.json';
  import notes from '#lib/data/desk-notes.json';
  import { uniqueById, type Report } from '#lib/kb/causes';
  import { tenantOf } from '#lib/kb/locales';
  import { groupByProblem, type Problem } from '#lib/kb/problems';

  // tickets: problem → link to the ticket filed for it.
  let { ticket, tickets = {} }: { ticket: number; tickets?: Partial<Record<Problem, string>> } = $props();

  const merged = $derived(uniqueById(reports as Report[]).filter((r) => r.mergedInto === ticket));
  const rows = $derived((reports as Report[]).filter((r) => r.mergedInto === ticket).length);
  const groups = $derived(groupByProblem(merged, tenantOf, notes.oneDayMove));
  const list = (n: Record<string, number>) =>
    Object.entries(n)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k} ×${v}`)
      .join(' · ');
  const misTagged = $derived(
    groups.reduce((n, g) => n + g.reports.filter((r) => g.problem !== 'one-day' && r.meta.intakeTag !== g.problem).length, 0),
  );
</script>

<p class="sum">
  <strong>{merged.length}</strong> reports in #{ticket} ({rows - merged.length} repeated rows in the export dropped) ·
  <strong>{groups.length}</strong>
  {groups.length === 1 ? 'problem' : 'problems'}
</p>

<table>
  <thead>
    <tr><th>problem</th><th>reports</th><th>tagged as</th><th>channels</th><th>tenants</th><th>seen</th><th>ticket</th></tr>
  </thead>
  <tbody>
    {#each groups as g (g.problem)}
      <tr>
        <td><code>{g.problem}</code></td>
        <td><strong>{g.reports.length}</strong></td>
        <td class="small">{list(g.taggedAs)}</td>
        <td class="small">{list(g.channels)}</td>
        <td class="small">{g.tenants.length}</td>
        <td class="small">{g.firstSeen} → {g.lastSeen}</td>
        <td>{#if tickets[g.problem]}<a href={tickets[g.problem]}>{tickets[g.problem]?.replace(/^.*\/issues\//, '#')}</a>{:else}<span class="none">none yet</span>{/if}</td>
      </tr>
    {/each}
  </tbody>
</table>

<p class="note">{misTagged} of the parser and hint reports carry the other cause's intake tag.</p>

{#each groups.filter((g) => g.problem === 'one-day') as g (g.problem)}
  <ul class="small">
    {#each g.reports as r (r.id)}<li><code>{r.id}</code> {r.tenant}, {r.channel}: “{r.body}”</li>{/each}
  </ul>
{/each}

<style>
  .sum { font-size: 1.1rem; }
  .small { color: var(--muted); font-size: 0.85em; }
  .note { color: var(--muted); font-size: 0.85em; }
  .none { color: var(--warn); font-weight: 600; }
</style>
