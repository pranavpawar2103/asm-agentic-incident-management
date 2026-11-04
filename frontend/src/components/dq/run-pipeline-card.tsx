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
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Play className="h-4 w-4 text-primary" /> Execute Data Quality Evaluation
        </CardTitle>
        <CardDescription>
          Run enabled rules against tickets according to scope and source.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusMsg && (
          <div
            className={`p-3 text-sm rounded border ${
              statusMsg.type === "success"
                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                : "bg-destructive/15 text-destructive border-destructive/30"
            }`}
          >
            {statusMsg.text}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Scope
            </label>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value as ApplyToScope)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="existing">Existing Tickets Only</option>
              <option value="both">Both (Existing & New)</option>
              <option value="new">New Unprocessed Only</option>
            </select>
          </div>

          <div className="flex-1 w-full space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Target Source
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="servicenow">ServiceNow (servicenow_tickets)</option>
              <option value="">All Sources</option>
            </select>
          </div>

          <Button
            onClick={handleExecute}
            disabled={isRunning}
            className="w-full sm:w-auto"
          >
            {isRunning ? "Evaluating..." : "Apply DQ Rules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
