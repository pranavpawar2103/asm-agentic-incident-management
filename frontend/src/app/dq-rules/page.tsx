"use client";

import { useState } from "react";
import { Header } from "@/components/layout/header";
import { useDQRules } from "@/hooks/use-dq-rules";
import { useDQRuns } from "@/hooks/use-dq-runs";
import { RuleListTable } from "@/components/dq/rule-list-table";
import { RuleFormDialog } from "@/components/dq/rule-form-dialog";
import { RunPipelineCard } from "@/components/dq/run-pipeline-card";
import { RunHistoryTable } from "@/components/dq/run-history-table";
import { DQRule, DQRuleCreateInput, DQRuleUpdateInput } from "@/types/dq";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, AlertCircle } from "lucide-react";

export default function DQRulesPage() {
  const {
    rules,
    loading: rulesLoading,
    error: rulesError,
    fetchRules,
    createRule,
    updateRule,
    toggleRule,
    deleteRule,
  } = useDQRules();

  const {
    runs,
    loading: runsLoading,
    fetchRuns,
    triggerRun,
    revertRun,
    getRunDetail,
  } = useDQRuns();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<DQRule | null>(null);

  const handleOpenCreate = () => {
    setEditingRule(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (rule: DQRule) => {
    setEditingRule(rule);
    setDialogOpen(true);
  };

  const handleRuleFormSubmit = async (data: DQRuleCreateInput | DQRuleUpdateInput) => {
    if (editingRule) {
      await updateRule(editingRule.id, data as DQRuleUpdateInput);
    } else {
      await createRule(data as DQRuleCreateInput);
    }
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    try {
      await toggleRule(id, !currentStatus);
    } catch {
      alert("Failed to toggle rule status");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteRule(id);
    } catch {
      alert("Failed to delete rule");
    }
  };

  const handleExecuteRun = async (input: Parameters<typeof triggerRun>[0]) => {
    await triggerRun(input);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Header />

      <main className="flex-1 max-w-6xl mx-auto px-6 py-8 w-full space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Quality Rules & Runs</h1>
          <p className="text-muted-foreground mt-1">
            Configure validation rules to automatically detect incomplete, junk, or non-compliant tickets.
          </p>
        </div>

        {rulesError && (
          <div className="p-4 rounded-md bg-destructive/15 text-destructive border border-destructive/30 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm font-medium">Error connecting to backend: {rulesError}</p>
          </div>
        )}

        {/* Section 1: Execution Control */}
        <section>
          <RunPipelineCard onRun={handleExecuteRun} />
        </section>

        {/* Section 2: Rule Configuration */}
        <section className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">Configured Rules</h2>
              <p className="text-sm text-muted-foreground">
                Evaluated in order of priority (lowest priority number executed first; first match flags the ticket).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => fetchRules()} disabled={rulesLoading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${rulesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={handleOpenCreate}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add DQ Rule
              </Button>
            </div>
          </div>

          <RuleListTable
            rules={rules}
            loading={rulesLoading}
            onEdit={handleOpenEdit}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        </section>

        {/* Section 3: Run History & Revert */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Evaluation Run History</h2>
              <p className="text-sm text-muted-foreground">
                Audit trail of all automated and manual DQ pipeline runs with instant one-click revert.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchRuns()} disabled={runsLoading}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${runsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <RunHistoryTable
            runs={runs}
            loading={runsLoading}
            onRevert={revertRun}
            onInspect={getRunDetail}
          />
        </section>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        AMS Agentic Incident Management System
      </footer>

      <RuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ruleToEdit={editingRule}
        onSubmit={handleRuleFormSubmit}
      />
    </div>
  );
}
