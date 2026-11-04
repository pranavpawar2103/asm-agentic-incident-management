"use client";

import { useState } from "react";
import { DQRule, DQRuleCreateInput, DQRuleUpdateInput, DQOperator, ApplyToScope } from "@/types/dq";
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
  "caller_id",
  "service",
  "priority",
  "state",
  "category",
  "assignment_group",
];

export function RuleFormDialog({
  open,
  onOpenChange,
  ruleToEdit,
  onSubmit,
}: RuleFormDialogProps) {
  const [name, setName] = useState(ruleToEdit?.name || "");
  const [fieldName, setFieldName] = useState(ruleToEdit?.field_name || "short_description");
  const [operator, setOperator] = useState<DQOperator>(ruleToEdit?.operator || "is_empty");
  const [value, setValue] = useState(ruleToEdit?.value || "");
  const [applyTo, setApplyTo] = useState<ApplyToScope>(ruleToEdit?.apply_to || "both");
  const [source, setSource] = useState(ruleToEdit?.source || "");
  const [service, setService] = useState(ruleToEdit?.service || "");
  const [priority, setPriority] = useState<number>(ruleToEdit?.priority || 100);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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
        field_name: fieldName,
        operator,
        value: needsValue ? value.trim() : null,
        apply_to: applyTo,
        source: source.trim() ? source.trim() : null,
        service: service.trim() ? service.trim() : null,
        priority: Number(priority) || 100,
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
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{ruleToEdit ? "Edit DQ Rule" : "Create New DQ Rule"}</DialogTitle>
          </DialogHeader>

          {formError && (
            <div className="p-2.5 text-sm rounded bg-destructive/15 text-destructive border border-destructive/30">
              {formError}
            </div>
          )}

          <div className="space-y-3 text-sm">
            <div>
              <label className="block font-medium mb-1">Rule Name *</label>
              <Input
                placeholder="e.g. Missing Short Description"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Field Name *</label>
                <select
                  value={fieldName}
                  onChange={(e) => setFieldName(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {FIELDS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Operator *</label>
                <select
                  value={operator}
                  onChange={(e) => setOperator(e.target.value as DQOperator)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {OPERATORS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {needsValue && (
              <div>
                <label className="block font-medium mb-1">Value *</label>
                <Input
                  placeholder={
                    operator.startsWith("length_") ? "e.g. 10 (characters)" : "e.g. test or pattern"
                  }
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Apply To Scope</label>
                <select
                  value={applyTo}
                  onChange={(e) => setApplyTo(e.target.value as ApplyToScope)}
                  className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  <option value="both">Both (Existing & New)</option>
                  <option value="existing">Existing Only</option>
                  <option value="new">New Only</option>
                </select>
              </div>

              <div>
                <label className="block font-medium mb-1">Priority (Low = 1st)</label>
                <Input
                  type="number"
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value, 10) || 100)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium mb-1">Source (Optional)</label>
                <Input
                  placeholder="e.g. servicenow"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Service (Optional)</label>
                <Input
                  placeholder="e.g. SAP ERP"
                  value={service}
                  onChange={(e) => setService(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving..." : ruleToEdit ? "Update Rule" : "Create Rule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
