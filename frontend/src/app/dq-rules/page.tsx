"use client";

import { useState } from "react";
import Link from "next/link";
import { AgentWorkflowLayout } from "@/components/layout/agent-workflow-layout";
import { DQBreadcrumbNav } from "@/components/dq/dq-breadcrumb-nav";
import { useDQRules } from "@/hooks/use-dq-rules";
import { RuleListTable } from "@/components/dq/rule-list-table";
import { RuleFormDialog } from "@/components/dq/rule-form-dialog";
import { DQRule, DQRuleCreateInput, DQRuleUpdateInput } from "@/types/dq";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, RefreshCw, AlertCircle, Play, ShieldCheck, ListFilter } from "lucide-react";

export default function ManageDQRulesPage() {
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

  return (
    <AgentWorkflowLayout currentStep={1}>
      {/* Breadcrumbs & Tab Bar */}
      <DQBreadcrumbNav currentTab="manage" />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#a20a29] uppercase tracking-wider">
              Step 01 • Rule Management
            </span>
            <span className="text-xs text-[#5e605d]">|</span>
            <span className="text-xs text-[#5e605d]">Deterministic Gate Configuration</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            Manage Data Quality Rules
          </h1>
          <p className="text-[#5e605d] text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
            Configure validation rules for incoming incident records across ServiceNow and Jira. Define condition criteria, operators, target services, and custom defect reasons.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRules}
            disabled={rulesLoading}
            className="h-9 text-xs gap-1.5 border-[#e0e1dc] text-[#222222] hover:bg-[#f0f4f4]"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-[#005656] ${rulesLoading ? "animate-spin" : ""}`} />
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

          <Link href="/dq-rules/execute">
            <Button
              size="sm"
              variant="outline"
              className="h-9 text-xs gap-1.5 border-[#005656] text-[#005656] hover:bg-[#f0f4f4] font-semibold"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Go to Execute
            </Button>
          </Link>
        </div>
      </div>

      {rulesError && (
        <div className="p-3.5 rounded-md bg-[#fdf2f4] text-[#a20a29] border border-[#f5c2cb] flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-[#a20a29]" />
          <p className="text-xs font-medium">Unable to connect to the backend service: {rulesError}</p>
        </div>
      )}

      {/* Rules Overview Callout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-[#e0e1dc] bg-white shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-[#5e605d] uppercase tracking-wide">Total Active Rules</span>
            <div className="text-2xl font-bold text-[#222222]">{rules.filter((r) => r.is_enabled).length}</div>
            <p className="text-[11px] text-[#5e605d]">Participating in batch evaluation</p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-[#5e605d] uppercase tracking-wide">Rule Precedence</span>
            <div className="text-base font-bold text-[#a20a29] pt-1">First-Match-Wins</div>
            <p className="text-[11px] text-[#5e605d]">Priority order determines assigned flag</p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-2xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[11px] font-semibold text-[#5e605d] uppercase tracking-wide">Supported Operators</span>
            <div className="text-base font-bold text-[#005656] pt-1">10 Deterministic Checks</div>
            <p className="text-[11px] text-[#5e605d]">Empty, regex, len, in, not in, etc.</p>
          </CardContent>
        </Card>
      </div>

      {/* Configured Rule Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#222222]">Configured Validation Rules</h2>
            <p className="text-xs text-[#5e605d]">
              Rules evaluate in strict order. Drag or reorder priority to alter evaluation precedence.
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

      {/* Transition banner to Execution */}
      <div className="rounded-lg border border-[#e0e1dc] bg-white p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-2xs">
        <div className="space-y-1">
          <span className="text-xs font-bold text-[#005656] uppercase tracking-wider">
            Ready to Run Data Quality Check?
          </span>
          <h3 className="text-sm font-bold text-[#222222]">
            Execute Rules Against Ingested Tickets & Review Audit History
          </h3>
          <p className="text-xs text-[#5e605d]">
            Trigger batch evaluation against ServiceNow tickets and manage audit history or one-click rollbacks.
          </p>
        </div>
        <Link href="/dq-rules/execute">
          <Button className="bg-[#005656] hover:bg-[#004242] text-white text-xs h-9 px-4 font-semibold shadow-xs gap-1.5">
            <Play className="h-3 w-3 fill-current" />
            <span>Open Execution & Audit Console →</span>
          </Button>
        </Link>
      </div>

      {/* Modal Dialog for Create/Edit */}
      <RuleFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        ruleToEdit={editingRule}
        onSubmit={handleRuleFormSubmit}
      />
    </AgentWorkflowLayout>
  );
}
