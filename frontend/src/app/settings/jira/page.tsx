"use client";

import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/console/app-shell";
import { PageHeader } from "@/components/console/page-header";
import { ListRow } from "@/components/console/list-row";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { jiraService } from "@/services/jira-service";
import { JiraConnection, JiraProject, JiraSync } from "@/types/jira";
import { CircleCheck, RefreshCw, TriangleAlert } from "lucide-react";

const message = (e: unknown, fallback: string) => (e instanceof Error ? e.message : fallback);

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const Icon = ok ? CircleCheck : TriangleAlert;
  return (
    <span className="inline-flex items-center gap-1.5 text-foreground">
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

function SectionHead({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {children}
    </div>
  );
}

/** Admin: Jira connection, which projects to pull, and sync history. Read-only towards Jira. */
export default function JiraSettingsPage() {
  const [conn, setConn] = useState<JiraConnection | null>(null);
  const [testing, setTesting] = useState(false);
  const [projects, setProjects] = useState<JiraProject[] | null>(null);
  const [projectsError, setProjectsError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncs, setSyncs] = useState<JiraSync[] | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const testConnection = useCallback(async () => {
    setTesting(true);
    try {
      setConn(await jiraService.getConnection());
    } catch (e) {
      setConn({ site: "", email_set: false, token_set: false, connected: false, error: message(e, "Couldn't reach the backend"), sync_minutes: 0 });
    } finally {
      setTesting(false);
    }
  }, []);

  const loadSyncs = useCallback(async () => {
    try {
      setSyncs(await jiraService.getSyncs());
    } catch (e) {
      setSyncError(message(e, "Couldn't load sync history"));
    }
  }, []);

  useEffect(() => {
    jiraService
      .getConnection()
      .then(setConn)
      .catch((e: unknown) =>
        setConn({ site: "", email_set: false, token_set: false, connected: false, error: message(e, "Couldn't reach the backend"), sync_minutes: 0 }),
      );
    jiraService
      .getProjects()
      .then(setProjects)
      .catch((e: unknown) => setProjectsError(message(e, "Couldn't load Jira projects")));
    jiraService
      .getSyncs()
      .then(setSyncs)
      .catch((e: unknown) => setSyncError(message(e, "Couldn't load sync history")));
  }, []);

  const edit = (key: string, change: Partial<JiraProject>) => {
    setProjects((ps) => ps && ps.map((p) => (p.key === key ? { ...p, ...change } : p)));
    setDirty(true);
    setSaved(false);
  };

  const save = async () => {
    if (!projects) return;
    setSaving(true);
    setProjectsError(null);
    try {
      await jiraService.saveProjects(projects.filter((p) => p.selected).map(({ key, name, team }) => ({ key, name, team })));
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setProjectsError(message(e, "Couldn't save projects"));
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      const run = await jiraService.syncNow();
      if (run.error) setSyncError(run.error);
    } catch (e) {
      setSyncError(message(e, "Sync failed"));
    } finally {
      setSyncing(false);
      void loadSyncs();
    }
  };

  const selectedCount = projects?.filter((p) => p.selected).length ?? 0;

  return (
    <AppShell>
      <PageHeader
        title="Jira"
        context="Pull tickets from Jira into the ticket list. Nothing is written back to Jira."
        actions={
          <Button variant="secondary" onClick={testConnection} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
          </Button>
        }
      />

      <Card className="gap-0 py-0">
        <SectionHead title="Connection">
          {conn && <Status ok={conn.connected}>{conn.connected ? "Connected" : "Not connected"}</Status>}
        </SectionHead>
        {!conn ? (
          <p className="px-4 py-6 text-muted-foreground">Testing the connection…</p>
        ) : (
          <dl className="grid grid-cols-[minmax(0,8rem)_minmax(0,1fr)] gap-x-4 gap-y-2 px-4 py-3 text-[13px]">
            <dt className="text-muted-foreground">Site</dt>
            <dd className="break-all">{conn.site || "Not set"}</dd>
            <dt className="text-muted-foreground">Signed in as</dt>
            <dd>{conn.account_name ?? "—"}</dd>
            <dt className="text-muted-foreground">API token</dt>
            <dd>
              <Status ok={conn.email_set && conn.token_set}>
                {conn.email_set && conn.token_set ? "Set in backend/.env" : "Missing in backend/.env"}
              </Status>
            </dd>
            {conn.error && (
              <>
                <dt className="text-muted-foreground">Problem</dt>
                <dd>{conn.error}</dd>
              </>
            )}
          </dl>
        )}
      </Card>

      <Card className="gap-0 py-0">
        <SectionHead title="Projects">
          <span className="text-xs text-muted-foreground">
            {saved && !dirty ? "Saved" : dirty ? "Unsaved changes" : `${selectedCount} selected`}
          </span>
        </SectionHead>
        {projectsError && (
          <Alert variant="destructive" className="m-4 w-auto">
            <AlertDescription>{projectsError}</AlertDescription>
          </Alert>
        )}
        {!projects ? (
          !projectsError && <p className="px-4 py-6 text-muted-foreground">Loading Jira projects…</p>
        ) : projects.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">This Jira site has no projects you can see.</p>
        ) : (
          <ul role="list">
            {projects.map((p) => (
              <li key={p.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 last:border-b-0">
                <label className="flex min-w-0 flex-[1_1_14rem] items-center gap-3 text-[13px]">
                  <input
                    type="checkbox"
                    checked={p.selected}
                    onChange={(e) => edit(p.key, { selected: e.target.checked })}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="font-medium">{p.name}</span>
                    <span className="ml-2 text-muted-foreground">{p.key}</span>
                  </span>
                </label>
                <label className="flex flex-[1_1_14rem] items-center gap-2 text-xs text-muted-foreground">
                  Team
                  <Input
                    value={p.team ?? ""}
                    placeholder={p.name}
                    disabled={!p.selected}
                    maxLength={64}
                    onChange={(e) => edit(p.key, { team: e.target.value })}
                    aria-label={`Team for ${p.name}`}
                  />
                </label>
              </li>
            ))}
          </ul>
        )}
        {projects && projects.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-4 py-3">
            <p className="text-xs text-muted-foreground">Tickets from a project go to its team. Leave Team empty to use the project name.</p>
            <Button onClick={save} disabled={!dirty || saving}>
              {saving ? "Saving…" : "Save projects"}
            </Button>
          </div>
        )}
      </Card>

      <Card className="gap-0 py-0">
        <SectionHead title="Sync">
          <Button onClick={syncNow} disabled={syncing || dirty || selectedCount === 0 || !conn?.connected}>
            <RefreshCw className={syncing ? "animate-spin motion-reduce:animate-none" : undefined} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </SectionHead>
        <p className="border-b border-border px-4 py-3 text-xs text-muted-foreground">
          {conn?.sync_minutes
            ? `Also syncs automatically every ${conn.sync_minutes} minutes.`
            : "Automatic sync is off. Set JIRA_SYNC_MINUTES in backend/.env to turn it on."}
          {dirty && " Save your project changes before syncing."}
        </p>
        {syncError && (
          <Alert variant="destructive" className="m-4 w-auto">
            <AlertDescription>{syncError}</AlertDescription>
          </Alert>
        )}
        {!syncs ? (
          <p className="px-4 py-6 text-muted-foreground">Loading sync history…</p>
        ) : syncs.length === 0 ? (
          <p className="px-4 py-6 text-muted-foreground">No syncs yet. Pick your projects, save, then select Sync now.</p>
        ) : (
          <ul role="list">
            {syncs.map((s) => (
              <ListRow
                key={s.id}
                lead={s.error ? <TriangleAlert className="size-4" aria-hidden="true" /> : <CircleCheck className="size-4" aria-hidden="true" />}
                itemKey={`#${s.id}`}
                title={s.error ? `Failed: ${s.error}` : `Pulled ${s.pulled} · ${s.created} new · ${s.updated} updated`}
                meta={[
                  s.trigger === "manual" ? "Manual" : "Scheduled",
                  s.projects || "No projects",
                  new Date(s.started_at).toLocaleString(),
                  s.finished_at && `took ${Math.max(0, Math.round((+new Date(s.finished_at) - +new Date(s.started_at)) / 1000))}s`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              />
            ))}
          </ul>
        )}
      </Card>
    </AppShell>
  );
}
