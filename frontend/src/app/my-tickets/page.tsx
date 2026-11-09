"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/console/app-shell";
import { PageHeader } from "@/components/console/page-header";
import { ListRow } from "@/components/console/list-row";
import { PriorityChip } from "@/components/console/priority-chip";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ticketService } from "@/services/ticket-service";
import { ServiceNowTicket } from "@/types/servicenow";
import { CircleCheck, TriangleAlert } from "lucide-react";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

type Tab = "flagged" | "open";

/** Engineer view (demo): open tickets of the engineer's assignment group. */
export default function MyTicketsPage() {
  const [tickets, setTickets] = useState<ServiceNowTicket[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<string>("");
  const [tab, setTab] = useState<Tab>("flagged");

  useEffect(() => {
    ticketService
      .getTickets({ limit: 500, is_unresolved: true })
      .then((res) => setTickets(res.items))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Couldn't load tickets"));
  }, []);

  // Groups ordered by open-ticket count; the busiest one stands in for "my team".
  const groups = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tickets ?? []) if (t.assignment_group) counts.set(t.assignment_group, (counts.get(t.assignment_group) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g);
  }, [tickets]);
  const myGroup = group || groups[0] || "";

  const mine = (tickets ?? []).filter((t) => t.assignment_group === myGroup);
  const flagged = mine.filter((t) => t.dq_flag);
  const shown = tab === "flagged" ? flagged : mine;

  return (
    <AppShell>
      <PageHeader
        title="My tickets"
        context={
          tickets
            ? `${myGroup || "No team"} · ${mine.length} open · ${flagged.length} ${flagged.length === 1 ? "needs" : "need"} details from the reporter`
            : "Loading…"
        }
        actions={
          groups.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Team
              <select value={myGroup} onChange={(e) => setGroup(e.target.value)} className={selectClass}>
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </label>
          )
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div role="tablist" aria-label="Queues" className="flex flex-wrap gap-1">
        {(
          [
            ["flagged", "Needs details", flagged.length],
            ["open", "All open", mine.length],
          ] as const
        ).map(([value, label, count]) => (
          <Button
            key={value}
            role="tab"
            aria-selected={tab === value}
            variant={tab === value ? "secondary" : "ghost"}
            onClick={() => setTab(value)}
          >
            {label} <span className="tabular-nums text-muted-foreground">{count}</span>
          </Button>
        ))}
      </div>

      <Card className="gap-0 py-0" role="tabpanel">
        {!tickets ? (
          <p className="px-4 py-6 text-muted-foreground">Loading tickets…</p>
        ) : shown.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">
            {tab === "flagged" ? "Nothing needs details. Every open ticket passed data quality." : "No open tickets for this team."}
          </p>
        ) : (
          <ul role="list">
            {shown.map((t) => (
              <ListRow
                key={t.ticket_id}
                lead={<PriorityChip priority={t.priority} />}
                itemKey={t.ticket_id}
                title={t.short_description || "No summary"}
                meta={[t.service || "No service", t.caller, t.dq_reason].filter(Boolean).join(" · ")}
                trailing={
                  t.dq_flag ? (
                    <span className="inline-flex items-center gap-1.5 text-foreground">
                      <TriangleAlert className="size-4" aria-hidden="true" />
                      Flagged
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <CircleCheck className="size-4" aria-hidden="true" />
                      Clean
                    </span>
                  )
                }
              />
            ))}
          </ul>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">
        Demo view: tickets are matched by assignment group until engineers sign in and Jira assignments decide what they see.
      </p>
    </AppShell>
  );
}
