import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/console/app-shell";
import { PageHeader } from "@/components/console/page-header";
import { ListRow } from "@/components/console/list-row";
import { ArrowRight, CircleCheck } from "lucide-react";

const agentStages = [
  {
    step: 1,
    title: "Data Quality",
    href: "/dq-rules",
    description: "Checks tickets against quality rules, masks PII and flags defective tickets.",
  },
  {
    step: 2,
    title: "Triage",
    href: "/triage",
    description: "Re-evaluates priority and SLA tier against the runbooks.",
  },
  {
    step: 3,
    title: "Resolution",
    href: "/resolution",
    description: "Matches incidents to runbooks and drafts remediation steps.",
  },
];

export default function Home() {
  return (
    <AppShell>
      <PageHeader
        title="Overview"
        context="Tickets from ServiceNow, Jira and the support mailbox pass through three agents in order."
        actions={
          <>
            <Button
              variant="secondary"
              render={<a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer" />}
              nativeButton={false}
            >
              API docs
            </Button>
            <Button render={<Link href="/dq-rules" />} nativeButton={false}>
              Start with Data Quality
              <ArrowRight />
            </Button>
          </>
        }
      />

      <Card className="gap-0 py-0">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Pipeline</h2>
        </div>
        <ul role="list">
          {agentStages.map((stage) => (
            <ListRow
              key={stage.step}
              lead={
                <span className="grid size-8 place-items-center rounded-full bg-selected text-xs font-semibold tabular-nums">
                  {stage.step}
                </span>
              }
              title={stage.title}
              meta={stage.description}
              trailing={
                <span className="inline-flex items-center gap-1.5">
                  <CircleCheck className="size-4" aria-hidden="true" />
                  Available
                </span>
              }
              actions={
                <Button variant="secondary" render={<Link href={stage.href} />} nativeButton={false}>
                  Open
                  <span className="sr-only"> {stage.title}</span>
                </Button>
              }
            />
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
