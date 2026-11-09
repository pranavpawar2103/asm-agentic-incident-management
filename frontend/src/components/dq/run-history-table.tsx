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
      <div className="rounded-lg border border-[#e0e1dc] overflow-hidden bg-white shadow-xs">
        <Table>
          <TableHeader className="bg-[#f0f4f4]">
            <TableRow className="border-[#e0e1dc] hover:bg-transparent">
              <TableHead className="w-16 text-xs font-semibold text-[#005656]">ID</TableHead>
              <TableHead className="text-xs font-semibold text-[#005656]">Execution Time</TableHead>
              <TableHead className="text-xs font-semibold text-[#005656]">Type</TableHead>
              <TableHead className="text-xs font-semibold text-[#005656]">Scope</TableHead>
              <TableHead className="text-xs font-semibold text-[#005656]">Flagged / Scanned</TableHead>
              <TableHead className="text-xs font-semibold text-[#005656]">Status</TableHead>
              <TableHead className="text-right text-xs font-semibold text-[#005656]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.map((run) => (
              <TableRow key={run.id} className="border-[#e0e1dc] hover:bg-[#fafaf8] transition-colors">
                <TableCell className="font-mono text-xs font-bold text-[#222222]">
                  #{run.id}
                </TableCell>
                <TableCell className="text-xs text-[#5e605d]">
                  {new Date(run.created_at).toLocaleString()}
                </TableCell>
                <TableCell className="text-xs">
                  <Badge variant="outline" className="capitalize text-xs font-medium text-[#5e605d] border-[#e0e1dc]">
                    {run.run_type}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize text-xs font-medium text-[#5e605d] border-[#e0e1dc]">
                    {run.scope}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs">
                  <div className="flex items-center gap-1.5 font-mono">
                    <span className={`font-bold ${run.tickets_flagged ? "text-[#a20a29]" : "text-[#5e605d]"}`}>
                      {run.tickets_flagged ?? 0}
                    </span>
                    <span className="text-[#93948e]">/</span>
                    <span className="text-[#5e605d]">{run.tickets_scanned ?? 0}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={`text-xs font-semibold px-2.5 py-0.5 border-none ${
                      run.status === "completed"
                        ? "bg-[#005656] text-white hover:bg-[#004444]"
                        : run.status === "reverted"
                        ? "bg-[#b08824] text-white hover:bg-[#97731a]"
                        : "bg-[#a20a29] text-white"
                    }`}
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
                    className="h-8 w-8 p-0 text-[#5e605d] hover:text-[#005656] hover:bg-[#f0f4f4]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {run.status === "completed" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Revert Run"
                      disabled={revertingId === run.id}
                      onClick={() => handleRevert(run.id)}
                      className="h-8 w-8 p-0 text-[#5e605d] hover:text-[#b08824] hover:bg-[#faf4e6]"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
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
