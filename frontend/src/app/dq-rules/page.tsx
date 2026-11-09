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
    <div className="min-h-screen bg-[#fbfbfb] text-[#222222] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e0e1dc] pb-6">
          <div>
            <div className="text-xs font-semibold text-[#005656] uppercase tracking-wider mb-1">
              Quality Assurance Pipeline
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
              Data Quality Rules & Evaluation
            </h1>
            <p className="text-[#5e605d] text-sm mt-1 max-w-2xl">
              Deterministic validation engine for incoming ServiceNow and Jira incidents. Detect incomplete descriptions, evaluate required fields, and prevent defective records from reaching operations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchRules();
                fetchRuns();
              }}
              className="h-9 text-xs gap-1.5 border-[#e0e1dc] text-[#222222] hover:bg-[#f0f4f4]"
            >
              <RefreshCw className="h-3.5 w-3.5 text-[#005656]" />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={handleOpenCreate}
              className="h-9 text-xs gap-1.5 bg-[#a20a29] hover:bg-[#850821] text-white shadow-xs font-semibold"
            >
              <Plus className="h-3.5 w-3.5" />
              New Rule
            </Button>
          </div>
        </div>

        {rulesError && (
          <div className="p-3.5 rounded-md bg-[#fdf2f4] text-[#a20a29] border border-[#f5c2cb] flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#a20a29]" />
            <p className="text-xs font-medium">Unable to connect to the backend service: {rulesError}</p>
          </div>
        )}

        {/* Section 1: Execution Control */}
        <section>
          <RunPipelineCard onRun={handleExecuteRun} />
        </section>

        {/* Section 2: Configured Rule Engine */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#222222]">Configured Validation Rules</h2>
              <p className="text-xs text-[#5e605d]">
                Rules execute in priority order. The first matching rule applies its defect flag and reason.
              </p>
            </div>
            <div className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2.5 py-1 rounded">
              {rules.length} {rules.length === 1 ? "rule" : "rules"} configured
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

        {/* Section 3: Execution Run History & Reverts */}
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold tracking-tight text-[#222222]">Evaluation History & Audit</h2>
              <p className="text-xs text-[#5e605d]">
                Audit trail of manual and automated pipeline executions with ticket metrics and rollback capability.
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

        {/* Modal Dialog for Create/Edit */}
        <RuleFormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          ruleToEdit={editingRule}
          onSubmit={handleRuleFormSubmit}
        />
      </main>

      <footer className="border-t border-[#e0e1dc] py-5 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between text-xs text-[#5e605d]">
          <span className="font-semibold text-[#222222]">First-match-wins evaluation logic</span>
          <span>10 deterministic operators</span>
        </div>
      </footer>
    </div>
  );
}
