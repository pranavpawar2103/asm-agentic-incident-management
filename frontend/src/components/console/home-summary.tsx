"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/console/stat-tile";
import { ticketService } from "@/services/ticket-service";
import { dqService } from "@/services/dq-service";
import { DQRun } from "@/types/dq";

interface Summary {
  total: number;
  open: number;
  flagged: number;
  latestRun: DQRun | null;
}

/** Live ticket counts and the latest data quality run for the overview page. */
export function HomeSummary() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      // limit=1: only the totals are needed
      const [all, open, flagged, runs] = await Promise.all([
        ticketService.getTickets({ limit: 1 }),
        ticketService.getTickets({ limit: 1, is_unresolved: true }),
        ticketService.getTickets({ limit: 1, dq_flag: true }),
        dqService.getRuns(1),
      ]);
      setSummary({ total: all.total, open: open.total, flagged: flagged.total, latestRun: runs[0] ?? null });
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch, same pattern as the DQ hooks
    load();
  }, [load]);

  if (failed) {
    return (
      <Card className="flex-row items-center justify-between gap-4 px-4">
        <span className="text-muted-foreground">Couldn&apos;t load ticket numbers from the backend.</span>
        <Button variant="secondary" onClick={load}>
          Try again
        </Button>
      </Card>
    );
  }

  const n = (v?: number) => (summary ? v : "—");
  const run = summary?.latestRun;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)] [&>*:first-child]:col-span-2 md:[&>*:first-child]:col-span-1">
        <StatTile
          variant="primary"
          label="Flagged by data quality"
          value={n(summary?.flagged)}
          window={summary ? `of ${summary.total} tickets` : undefined}
        />
        <StatTile label="Open tickets" value={n(summary?.open)} window={summary ? `of ${summary.total}` : undefined} />
        <StatTile label="All tickets" value={n(summary?.total)} window="ServiceNow" />
      </div>

      <Card className="gap-2 px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">Latest data quality run</h2>
          <Button variant="secondary" render={<Link href="/dq-rules/execute" />} nativeButton={false}>
            All runs
          </Button>
        </div>
        {!summary ? (
          <span className="text-muted-foreground">Loading…</span>
        ) : run ? (
          <p className="text-muted-foreground">
            <span className="font-mono">#{run.id}</span> · <span className="capitalize">{run.trigger}</span> ·{" "}
            <span className="font-mono">{new Date(run.started_at).toLocaleString()}</span> ·{" "}
            <span className="tabular-nums text-foreground">{run.tickets_flagged}</span> flagged of{" "}
            <span className="tabular-nums">{run.tickets_evaluated}</span> checked · <span className="capitalize">{run.status}</span>
          </p>
        ) : (
          <span className="text-muted-foreground">No runs yet. Run the rules from the Runs page.</span>
        )}
      </Card>
    </>
  );
}
