"use client";

import { useState } from "react";
import { ApplyToScope, DQRunCreateInput } from "@/types/dq";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";

interface RunPipelineCardProps {
  onRun: (input: DQRunCreateInput) => Promise<void>;
}

export function RunPipelineCard({ onRun }: RunPipelineCardProps) {
  const [scope, setScope] = useState<ApplyToScope>("existing");
  const [source, setSource] = useState<string>("servicenow");
  const [isRunning, setIsRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const handleExecute = async () => {
    setIsRunning(true);
    setStatusMsg(null);
    try {
      await onRun({
        scope,
        source: source.trim() || undefined,
        run_type: "manual",
      });
      setStatusMsg({ type: "success", text: "DQ pipeline executed successfully!" });
    } catch (err: unknown) {
      setStatusMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Run failed",
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card className="border-[#e0e1dc] bg-white shadow-xs">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-[#222222] flex items-center gap-2">
            <Play className="h-4 w-4 text-[#a20a29]" /> Execute Rule Evaluation
          </CardTitle>
          <span className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2 py-0.5 rounded">Deterministic Batch Engine</span>
        </div>
        <CardDescription className="text-xs text-[#5e605d]">
          Run enabled validation rules against incident records according to target scope and source.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {statusMsg && (
          <div
            className={`p-3 text-xs rounded-md border font-medium ${
              statusMsg.type === "success"
                ? "bg-[#eef8f8] text-[#005656] border-[#bfe5e5]"
                : "bg-[#fdf2f4] text-[#a20a29] border-[#f5c2cb]"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5 space-y-1.5">
            <label className="text-xs font-semibold text-[#222222]">
              Evaluation Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ApplyToScope)}
              className="w-full h-9 rounded-md border border-[#e0e1dc] bg-white px-3 py-1.5 text-xs text-[#222222] shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a20a29]"
            >
              <option value="existing">Existing Tickets Only</option>
              <option value="both">Both (Existing & Ingestion Stream)</option>
              <option value="new">New Unprocessed Only</option>
            </select>
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <label className="text-xs font-semibold text-[#222222]">
              Target Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full h-9 rounded-md border border-[#e0e1dc] bg-white px-3 py-1.5 text-xs text-[#222222] shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a20a29]"
            >
              <option value="servicenow">ServiceNow (servicenow_tickets)</option>
              <option value="">All Sources</option>
            </select>
          </div>

          <div className="sm:col-span-3">
            <Button
              onClick={handleExecute}
              disabled={isRunning}
              className="w-full h-9 text-xs font-semibold gap-2 bg-[#a20a29] hover:bg-[#850821] text-white shadow-xs"
            >
              <Play className="h-3 w-3 fill-current" />
              {isRunning ? "Evaluating..." : "Apply Rules"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
