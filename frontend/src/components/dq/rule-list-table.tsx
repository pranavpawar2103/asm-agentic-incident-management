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
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">Pri</TableHead>
            <TableHead>Rule Name</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Source / Service</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-mono text-xs text-center text-muted-foreground">
                {rule.priority ?? 100}
              </TableCell>
              <TableCell className="font-medium">
                <div>{rule.name}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  field: {rule.field_name}
                </div>
              </TableCell>
              <TableCell className="text-sm">
                <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-xs mr-1">
                  {rule.operator}
                </span>
                {rule.value !== null && rule.value !== undefined && (
                  <span className="text-muted-foreground font-mono text-xs">
                    &quot;{rule.value}&quot;
                  </span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="capitalize text-xs">
                  {rule.apply_to}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                <div>{rule.source || "all sources"}</div>
                {rule.service && <div>svc: {rule.service}</div>}
              </TableCell>
              <TableCell>
                <Badge variant={rule.is_enabled ? "default" : "secondary"}>
                  {rule.is_enabled ? "Enabled" : "Disabled"}
                </Badge>
              </TableCell>
              <TableCell className="text-right space-x-1">
                <Button
                  size="sm"
                  variant="ghost"
                  title={rule.is_enabled ? "Disable" : "Enable"}
                  onClick={() => onToggle(rule.id, rule.is_enabled)}
                >
                  <Power
                    className={`h-4 w-4 ${
                      rule.is_enabled ? "text-emerald-600" : "text-muted-foreground"
                    }`}
                  />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Edit"
                  onClick={() => onEdit(rule)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  title="Delete"
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete rule "${rule.name}"?`)) {
                      onDelete(rule.id);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
