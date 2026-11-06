"use client";

import { DQRule } from "@/types/dq";
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
import { Edit2, Trash2, Power } from "lucide-react";

interface RuleListTableProps {
  rules: DQRule[];
  loading: boolean;
  onEdit: (rule: DQRule) => void;
  onToggle: (id: number, currentStatus: boolean) => void;
  onDelete: (id: number) => void;
}

export function RuleListTable({
  rules,
  loading,
  onEdit,
  onToggle,
  onDelete,
}: RuleListTableProps) {
  if (loading && rules.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm">
        Loading data quality rules...
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground text-sm border rounded-lg border-dashed">
        No DQ rules found. Create your first rule above to get started.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[#e0e1dc] overflow-hidden bg-white shadow-xs">
      <Table>
        <TableHeader className="bg-[#f0f4f4]">
          <TableRow className="border-[#e0e1dc] hover:bg-transparent">
            <TableHead className="w-16 text-center text-xs font-semibold text-[#005656]">ID</TableHead>
            <TableHead className="text-xs font-semibold text-[#005656]">Rule Name</TableHead>
            <TableHead className="text-xs font-semibold text-[#005656]">Condition</TableHead>
            <TableHead className="text-xs font-semibold text-[#005656]">Scope</TableHead>
            <TableHead className="text-xs font-semibold text-[#005656]">Source / Service</TableHead>
            <TableHead className="text-xs font-semibold text-[#005656]">Status</TableHead>
            <TableHead className="text-right text-xs font-semibold text-[#005656]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id} className="border-[#e0e1dc] hover:bg-[#fafaf8] transition-colors">
              <TableCell className="text-xs text-center font-mono font-semibold text-[#5e605d]">
                #{rule.id}
              </TableCell>
              <TableCell className="text-xs">
                <div className="font-semibold text-[#222222]">{rule.name}</div>
                <div className="text-xs text-[#5e605d] font-mono mt-0.5">
                  field: <span className="text-[#a20a29] font-medium">{rule.field}</span>
                </div>
              </TableCell>
              <TableCell className="text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono bg-[#f0f4f4] text-[#005656] font-semibold px-2 py-0.5 rounded text-xs border border-[#bfe5e5]">
                    {rule.operator}
                  </span>
                  {rule.value !== null && rule.value !== undefined && (
                    <span className="text-[#222222] font-mono text-xs bg-[#f4f4f2] px-1.5 py-0.5 rounded border border-[#e0e1dc]">
                      &quot;{rule.value}&quot;
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-xs font-medium text-[#5e605d] border-[#e0e1dc] bg-white">
                  {rule.apply_to}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-[#5e605d]">
                <div className="font-medium text-[#222222]">{rule.source || "All sources"}</div>
                {rule.service && (
                  <div className="text-[#5e605d] font-mono mt-0.5">svc: {rule.service}</div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  className={`text-xs font-semibold px-2.5 py-0.5 border-none ${
                    rule.is_enabled
                      ? "bg-[#005656] text-white hover:bg-[#004444]"
                      : "bg-[#f4f4f2] text-[#5e605d] hover:bg-[#e9e9e6]"
                  }`}
                >
                  {rule.is_enabled ? "Active" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onToggle(rule.id, rule.is_enabled)}
                  className="h-8 w-8 p-0 text-[#5e605d] hover:text-[#005656] hover:bg-[#f0f4f4]"
                  title={rule.is_enabled ? "Disable Rule" : "Enable Rule"}
                >
                  <Power className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onEdit(rule)}
                  className="h-8 w-8 p-0 text-[#5e605d] hover:text-[#a20a29] hover:bg-[#fdf2f4]"
                  title="Edit Rule"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Delete rule "${rule.name}"?`)) {
                      onDelete(rule.id);
                    }
                  }}
                  className="h-8 w-8 p-0 text-[#5e605d] hover:text-[#a20a29] hover:bg-[#fdf2f4]"
                  title="Delete Rule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
