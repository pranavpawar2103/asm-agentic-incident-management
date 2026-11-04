"use client";

import { useState } from "react";
import { DQRun, DQRunDetail } from "@/types/dq";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RotateCcw, Eye } from "lucide-react";

interface RunHistoryTableProps {
  runs: DQRun[];
  loading: boolean;
  onRevert: (id: number) => Promise<unknown>;
  onInspect: (id: number) => Promise<DQRunDetail>;
}

export function RunHistoryTable({
  runs,
  loading,
  onRevert,
  onInspect,
}: RunHistoryTableProps) {
  const [selectedRunDetail, setSelectedRunDetail] = useState<DQRunDetail | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [inspectingId, setInspectingId] = useState<number | null>(null);
  const [revertingId, setRevertingId] = useState<number | null>(null);

  const handleOpenDetail = async (id: number) => {
    setInspectingId(id);
    try {
      const detail = await onInspect(id);
      setSelectedRunDetail(detail);
      setDetailModalOpen(true);
    } catch {
      alert("Failed to load run details");
    } finally {
      setInspectingId(null);
    }
  };

  const handleRevert = async (id: number) => {
    if (!confirm(`Revert DQ Run #${id}? All tickets flagged exclusively by this run will be unflagged.`)) {
      return;
    }
    setRevertingId(id);
    try {
      await onRevert(id);
    } catch {
      alert("Failed to revert run");
    } finally {
      setRevertingId(null);
    }
  };

  if (loading && runs.length === 0) {
    return <div className="p-8 text-center text-muted-foreground text-sm">Loading execution runs...</div>;
  }

  if (runs.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
        No DQ runs executed yet. Trigger a run above to test enabled rules.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Run #</TableHead>
              <TableHead>Execution Time</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Scanned / Flagged</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id}>
                <TableCell className="font-mono text-sm font-semibold">#{run.id}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {new Date(run.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="capitalize text-xs">{run.run_type}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize text-xs">
                    {run.scope}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <span className="font-semibold">{run.tickets_flagged}</span> / {run.tickets_scanned}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      run.status === "completed"
                        ? "default"
                        : run.status === "reverted"
                        ? "secondary"
                        : "destructive"
                    }
                    className="capitalize text-xs"
                  >
                    {run.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    title="View Matches"
                    disabled={inspectingId === run.id}
                    onClick={() => handleOpenDetail(run.id)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {run.status === "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Revert Run"
                      disabled={revertingId === run.id}
                      onClick={() => handleRevert(run.id)}
                    >
                      <RotateCcw className="h-4 w-4 text-amber-600" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Inspect matches modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Run #{selectedRunDetail?.id} Flagged Tickets</DialogTitle>
          </DialogHeader>

          {selectedRunDetail?.matches?.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No tickets were flagged in this run.
            </div>
          ) : (
            <div className="rounded-md border mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket ID</TableHead>
                    <TableHead>Matched Rule</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedRunDetail?.matches?.map((m) => (
                    <TableRow key={m.ticket_id}>
                      <TableCell className="font-mono text-xs font-semibold">
                        {m.ticket_id}
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="font-medium">{m.rule_name}</span>
                        <div className="text-[10px] text-muted-foreground">rule #{m.rule_id}</div>
                      </TableCell>
                      <TableCell className="text-xs max-w-xs truncate">
                        {m.short_description || "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {m.service || "—"}
                      </TableCell>
                      <TableCell className="text-xs">{m.priority || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
