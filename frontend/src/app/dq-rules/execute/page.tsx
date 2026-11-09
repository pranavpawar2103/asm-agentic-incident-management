"use client";

import Link from "next/link";
import { AgentWorkflowLayout } from "@/components/layout/agent-workflow-layout";
import { DQBreadcrumbNav } from "@/components/dq/dq-breadcrumb-nav";
import { useDQRuns } from "@/hooks/use-dq-runs";
import { useDQRules } from "@/hooks/use-dq-rules";
import { RunPipelineCard } from "@/components/dq/run-pipeline-card";
import { RunHistoryTable } from "@/components/dq/run-history-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RefreshCw, SlidersHorizontal, CheckCircle2, AlertTriangle, Layers } from "lucide-react";

export default function ExecuteDQRulesPage() {
  const {
    runs,
    loading: runsLoading,
    fetchRuns,
    triggerRun,
    revertRun,
    getRunDetail,
  } = useDQRuns();

  const { rules } = useDQRules();

  const handleExecuteRun = async (input: Parameters<typeof triggerRun>[0]) => {
    await triggerRun(input);
  };

  return (
    <AgentWorkflowLayout currentStep={1}>
      {/* Breadcrumbs & Sub-nav Bar */}
      <DQBreadcrumbNav currentTab="execute" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#005656] uppercase tracking-wider">
              Step 01 • Batch Execution & Audit
            </span>
            <span className="text-xs text-[#5e605d]">|</span>
            <span className="text-xs text-[#5e605d]">Pipeline Trigger & Rollback</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            Execute DQ Rules & Audit Runs
          </h1>
          <p className="text-[#5e605d] text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Run configured data quality validation rules against existing ServiceNow tickets or incoming streams. Inspect run results, ticket impact metrics, and perform one-click state rollbacks.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRuns}
            disabled={runsLoading}
            className="h-9 text-xs gap-1.5 border-[#e0e1dc] text-[#222222] hover:bg-[#f0f4f4]"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#005656] ${runsLoading ? "animate-spin" : ""}`} />
            Refresh Runs
          </Button>

          <Link href="/dq-rules">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5 border-[#a20a29] text-[#a20a29] hover:bg-[#fdf2f4] font-semibold"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Manage Rules ({rules.length})
            </Button>
          </Link>
        </div>
      </div>

      {/* Execution Parameter Card */}
      <section>
        <RunPipelineCard onRun={handleExecuteRun} />
      </section>

      {/* Metric Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#e0e1dc] bg-white shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-[#5e605d] uppercase tracking-wide">Total Historical Runs</span>
            <div className="text-2xl font-bold text-[#222222]">{runs.length}</div>
            <p className="text-[11px] text-[#5e605d]">Logged with execution snapshots</p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-[#5e605d] uppercase tracking-wide">Active Rules Applied</span>
            <div className="text-2xl font-bold text-[#005656]">
              {rules.filter((r) => r.is_enabled).length}
            </div>
            <p className="text-[11px] text-[#5e605d]">Ready in deterministic pipeline</p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-[#5e605d] uppercase tracking-wide">Rollback Capability</span>
            <div className="text-base font-bold text-[#a20a29] pt-1">Single-Click Revert</div>
            <p className="text-[11px] text-[#5e605d]">Restores pre-run ticket flag states</p>
          </CardContent>
        </Card>
      </div>

      {/* Execution Run History & Reverts */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#222222]">Execution Run History & Audit</h2>
            <p className="text-xs text-[#5e605d]">
              Complete audit trail of all manual and automated pipeline executions with ticket metrics and rollback capability.
            </p>
          </div>
          <div className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2.5 py-1 rounded">
            {runs.length} {runs.length === 1 ? "execution" : "executions"}
          </div>
        </div>

        <RunHistoryTable
          runs={runs}
          loading={runsLoading}
          onRevert={revertRun}
          onInspect={getRunDetail}
        />
      </section>

      {/* Link to Tickets */}
      <div className="rounded-lg border border-[#e0e1dc] bg-white p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <span className="text-xs font-bold text-[#005656] uppercase tracking-wider">
            Review Incident Impacts
          </span>
          <h3 className="text-sm font-bold text-[#222222]">
            Inspect Updated Flag States in Incident Repository
          </h3>
          <p className="text-xs text-[#5e605d]">
            Browse all 80 ServiceNow incident tickets to view applied DQ flags, defect explanations, and PII masked fields.
          </p>
        </div>
        <Link href="/tickets">
          <Button variant="outline" className="border-[#005656] text-[#005656] hover:bg-[#f0f4f4] text-xs h-9 px-4 font-semibold shadow-xs">
            Browse Tickets Repository →
          </Button>
        </Link>
      </div>
    </AgentWorkflowLayout>
  );
}
