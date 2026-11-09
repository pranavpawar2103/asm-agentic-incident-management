"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/console/app-shell";
import { PageHeader } from "@/components/console/page-header";
import { ListRow } from "@/components/console/list-row";
import { PriorityChip } from "@/components/console/priority-chip";
import { StatTile } from "@/components/console/stat-tile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ticketService } from "@/services/ticket-service";
import { ServiceNowTicket } from "@/types/servicenow";

const isUrgent = (t: ServiceNowTicket) => /^\s*(P?[12])\b/i.test(t.priority ?? "");
const SHOWN = 10;

/** Lead view (demo): open tickets across teams, unowned work and load per team. */
export default function TeamPage() {
  const [tickets, setTickets] = useState<ServiceNowTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ticketService
      .getTickets({ limit: 500, is_unresolved: true })
      .then((res) => setTickets(res.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load tickets"));
  }, []);

  const open = tickets ?? [];
  const unowned = open.filter((t) => !t.assignment_group);
  const urgent = open.filter(isUrgent);
  const byGroup = useMemo(() => {
    const m = new Map<string, { total: number; flagged: number }>();
    for (const t of tickets ?? []) {
      if (!t.assignment_group) continue;
      const g = m.get(t.assignment_group) ?? { total: 0, flagged: 0 };
      g.total += 1;
      if (t.dq_flag) g.flagged += 1;
      m.set(t.assignment_group, g);
    }
    return [...m.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [tickets]);
  const max = Math.max(1, ...byGroup.map(([, g]) => g.total));
  const n = (v: number) => (tickets ? v : "—");

  return (
    <AppShell>
      <PageHeader
        title="Team queue"
        context={tickets ? `${open.length} open across ${byGroup.length} ${byGroup.length === 1 ? "team" : "teams"} · ${unowned.length} with no owner` : "Loading…"}
        actions={
          <Button variant="secondary" render={<Link href="/tickets" />} nativeButton={false}>
            All tickets
          </Button>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] [&>*:first-child]:col-span-2 md:[&>*:first-child]:col-span-1">
        <StatTile variant="primary" label="No owner yet" value={n(unowned.length)} window={tickets ? `of ${open.length} open` : undefined} />
        <StatTile label="Open P1 and P2" value={n(urgent.length)} window="open now" />
        <StatTile label="Open" value={n(open.length)} window="all teams" />
      </div>

      <Card className="gap-0 py-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">No owner yet</h2>
          <span className="text-xs text-muted-foreground">
            {unowned.length > SHOWN ? `Oldest ${SHOWN} of ${unowned.length}` : `${unowned.length} tickets`}
          </span>
        </div>
        {!tickets ? (
          <p className="px-4 py-6 text-muted-foreground">Loading tickets…</p>
        ) : unowned.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">Every open ticket has a team.</p>
        ) : (
          <ul role="list">
            {[...unowned]
              .sort((a, b) => (a.opened_at ?? "").localeCompare(b.opened_at ?? ""))
              .slice(0, SHOWN)
              .map((t) => (
                <ListRow
                  key={t.ticket_id}
                  lead={<PriorityChip priority={t.priority} />}
                  itemKey={t.ticket_id}
                  title={t.short_description || "No summary"}
                  meta={[t.service || "No service", t.caller, t.opened_at && `opened ${new Date(t.opened_at).toLocaleDateString()}`]
                    .filter(Boolean)
                    .join(" · ")}
                />
              ))}
          </ul>
        )}
      </Card>

      <Card className="gap-3 px-4">
        <h2 className="text-sm font-semibold">Who has what</h2>
        {byGroup.length === 0 ? (
          <p className="text-muted-foreground">{tickets ? "No team has open tickets." : "Loading…"}</p>
        ) : (
          <ul role="list" className="flex flex-col gap-2">
            {byGroup.map(([name, g]) => (
              <li key={name} className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
                <span className="break-words">{name}</span>
                <span className="flex h-2 overflow-hidden rounded-full bg-accent" aria-hidden="true">
                  <span className="bg-foreground" style={{ width: `${(g.flagged / max) * 100}%` }} />
                  <span className="bg-muted-foreground/50" style={{ width: `${((g.total - g.flagged) / max) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums text-muted-foreground">
                  {g.total} open · {g.flagged} flagged
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">Demo view: teams come from the ServiceNow assignment group.</p>
    </AppShell>
  );
}
