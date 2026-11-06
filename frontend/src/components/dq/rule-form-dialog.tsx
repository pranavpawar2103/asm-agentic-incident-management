"use client";

import { useState, useEffect } from "react";
import { DQRule, DQRuleCreateInput, DQRuleUpdateInput, DQOperator, ApplyToScope } from "@/types/dq";
import { dqService } from "@/services/dq-service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ruleToEdit?: DQRule | null;
  onSubmit: (data: DQRuleCreateInput | DQRuleUpdateInput) => Promise<void>;
}

const OPERATORS: { label: string; value: DQOperator; needsValue: boolean }[] = [
  { label: "Equals", value: "equals", needsValue: true },
  { label: "Not Equals", value: "not_equals", needsValue: true },
  { label: "Contains", value: "contains", needsValue: true },
  { label: "Not Contains", value: "not_contains", needsValue: true },
  { label: "Starts With", value: "starts_with", needsValue: true },
  { label: "Regex Match", value: "regex", needsValue: true },
  { label: "Is Empty", value: "is_empty", needsValue: false },
  { label: "Is Not Empty", value: "is_not_empty", needsValue: false },
  { label: "Length Less Than (<)", value: "length_lt", needsValue: true },
  { label: "Length Greater Than (>)", value: "length_gt", needsValue: true },
];

const FIELDS = [
  "short_description",
  "description",
  "caller",
  "service",
  "priority",
  "assignment_group",
  "resolution_notes",
];

export function RuleFormDialog({
  open,
  onOpenChange,
  ruleToEdit,
  onSubmit,
}: RuleFormDialogProps) {
  const [name, setName] = useState(ruleToEdit?.name || "");
  const [description, setDescription] = useState(ruleToEdit?.description || "");
  const [field, setField] = useState(ruleToEdit?.field || "short_description");
  const [operator, setOperator] = useState<DQOperator>(ruleToEdit?.operator || "is_empty");
  const [value, setValue] = useState(ruleToEdit?.value || "");
  const [applyTo, setApplyTo] = useState<ApplyToScope>(ruleToEdit?.apply_to || "both");
  const [source, setSource] = useState(ruleToEdit?.source || "");
  const [service, setService] = useState(ruleToEdit?.service || "");
  const [sourcesList, setSourcesList] = useState<{ code: string; name: string }[]>([
    { code: "servicenow", name: "ServiceNow" },
    { code: "jira", name: "Jira" },
    { code: "mailbox", name: "Support Mailbox" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    dqService
      .getSources()
      .then((items) => {
        if (active && items?.length) {
          setSourcesList(items.map((i) => ({ code: i.code, name: i.name })));
        }
      })
      .catch(() => {
        // Fallback already pre-set to standard sources
      });
    return () => {
      active = false;
    };
  }, []);

  const selectedOp = OPERATORS.find((o) => o.value === operator);
  const needsValue = selectedOp?.needsValue ?? true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError("Rule name is required");
      return;
    }

    if (needsValue && !value.trim()) {
      setFormError(`Value is required for operator "${operator}"`);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() ? description.trim() : null,
        field,
        operator,
        value: needsValue ? value.trim() : null,
        apply_to: applyTo,
        source: source.trim() ? source.trim() : null,
        service: service.trim() ? service.trim() : null,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to save rule");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl bg-white border-[#e0e1dc] text-[#222222] p-6 shadow-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <DialogHeader className="pb-2 border-b border-[#e0e1dc]">
            <DialogTitle className="text-lg font-bold text-[#222222]">
              {ruleToEdit ? "Edit Data Quality Rule" : "Create New Data Quality Rule"}
            </DialogTitle>
            <p className="text-xs text-[#5e605d]">
              Define deterministic quality checks, field matching operators, and evaluation scopes.
            </p>
          </DialogHeader>

          {formError && (
            <div className="p-3 text-xs rounded-md bg-[#fdf2f4] text-[#a20a29] border border-[#f5c2cb] font-medium">
              {formError}
            </div>
          )}

          <div className="space-y-4 text-xs">
            {/* Rule Name */}
            <div>
              <label className="block font-semibold text-[#222222] mb-1.5">Rule Name *</label>
              <Input
                placeholder="e.g. Missing Short Description"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 text-xs border-[#e0e1dc] focus-visible:ring-1 focus-visible:ring-[#a20a29]"
              />
            </div>

            {/* Rule Description */}
            <div>
              <label className="block font-semibold text-[#222222] mb-1.5">Rule Description (Optional)</label>
              <Input
                placeholder="e.g. Flags tickets where summary does not meet minimum quality criteria"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 text-xs border-[#e0e1dc] focus-visible:ring-1 focus-visible:ring-[#a20a29]"
              />
              <span className="text-[11px] text-[#5e605d] block mt-1">
                Detailed business context or defect rationale for operations.
              </span>
            </div>

            {/* Target Field & Operator */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">Target Field *</label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a20a29]"
                >
                  {FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#5e605d] block mt-1">
                  Ticket column to validate.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">Operator *</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as DQOperator)}
                  className="w-full h-10 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a20a29]"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#5e605d] block mt-1">
                  Deterministic check logic.
                </span>
              </div>
            </div>

            {/* Value if operator needs value */}
            {needsValue && (
              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">Comparison Value *</label>
                <Input
                  placeholder={
                    operator.startsWith("length_") ? "e.g. 10 (characters)" : "e.g. test or pattern"
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="h-10 text-xs border-[#e0e1dc] focus-visible:ring-1 focus-visible:ring-[#a20a29]"
                />
              </div>
            )}

            {/* Lifecycle Scope */}
            <div>
              <label className="block font-semibold text-[#222222] mb-1.5">Lifecycle Scope (Apply To)</label>
              <select
                value={applyTo}
                onChange={(e) => setApplyTo(e.target.value as ApplyToScope)}
                className="w-full h-10 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a20a29]"
              >
                <option value="both">Both (Existing Stored & Ingestion Stream)</option>
                <option value="existing">Existing Tickets Only</option>
                <option value="new">New Ingestion Tickets Only</option>
              </select>
            </div>

            {/* Apply To Source & Service */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">Apply To Source</label>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full h-10 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] shadow-2xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#a20a29]"
                >
                  <option value="">Global (All Sources)</option>
                  {sourcesList.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <span className="text-[11px] text-[#5e605d] block mt-1">
                  Leave as Global to run across all feeds, or select a source.
                </span>
              </div>

              <div>
                <label className="block font-semibold text-[#222222] mb-1.5">Apply To Service (Optional)</label>
                <Input
                  placeholder="e.g. PayrollPro"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                  className="h-10 text-xs border-[#e0e1dc] focus-visible:ring-1 focus-visible:ring-[#a20a29]"
                />
                <span className="text-[11px] text-[#5e605d] block mt-1">
                  Leave empty for all application services.
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-[#e0e1dc] gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 px-4 text-xs border-[#e0e1dc] hover:bg-[#f0f4f4]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 px-5 text-xs font-semibold bg-[#a20a29] hover:bg-[#850821] text-white shadow-xs"
            >
              {submitting ? "Saving..." : ruleToEdit ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
