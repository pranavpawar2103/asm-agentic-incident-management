export interface JiraConnection {
  site: string;
  email_set: boolean;
  token_set: boolean;
  connected: boolean;
  account_name?: string | null;
  error?: string | null;
  sync_minutes: number;
}

export interface JiraProject {
  key: string;
  name: string;
  selected: boolean;
  team?: string | null;
}

export interface JiraSync {
  id: number;
  trigger: "manual" | "schedule";
  projects: string;
  started_at: string;
  finished_at?: string | null;
  pulled: number;
  created: number;
  updated: number;
  error?: string | null;
}
