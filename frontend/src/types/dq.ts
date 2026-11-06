export type ApplyToScope = "existing" | "new" | "both";
export type DQRunType = "manual" | "scheduled";
export type DQRunStatus = "completed" | "failed" | "reverted";

export type DQOperator =
  | "equals"
  | "not_equals"
  | "contains"
  | "not_contains"
  | "starts_with"
  | "regex"
  | "is_empty"
  | "is_not_empty"
  | "length_lt"
  | "length_gt";

export interface DQRule {
  id: number;
  name: string;
  field: string;
  operator: DQOperator;
  value?: string | null;
  apply_to: ApplyToScope;
  source?: string | null;
  service?: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface DQRuleCreateInput {
  name: string;
  field: string;
  operator: DQOperator;
  value?: string | null;
  apply_to: ApplyToScope;
  source?: string | null;
  service?: string | null;
  is_enabled?: boolean;
}

export interface DQRuleUpdateInput {
  name?: string;
  field?: string;
  operator?: DQOperator;
  value?: string | null;
  apply_to?: ApplyToScope;
  source?: string | null;
  service?: string | null;
  is_enabled?: boolean;
}

export interface DQRun {
  id: number;
  run_type: DQRunType;
  scope: ApplyToScope;
  source?: string | null;
  tickets_scanned: number;
  tickets_flagged: number;
  status: DQRunStatus;
  rules_snapshot: Record<string, unknown>[];
  created_at: string;
  reverted_at?: string | null;
}

export interface DQRunMatchTicket {
  ticket_id: string;
  rule_id: number;
  rule_name: string;
  matched_at: string;
  short_description?: string;
  service?: string;
  priority?: string;
  state?: string;
}

export interface DQRunDetail extends DQRun {
  matches: DQRunMatchTicket[];
}

export interface DQRunCreateInput {
  scope: ApplyToScope;
  source?: string | null;
  run_type?: DQRunType;
}

export interface DQRuleFilterParams {
  source?: string;
  service?: string;
  is_enabled?: boolean;
}
