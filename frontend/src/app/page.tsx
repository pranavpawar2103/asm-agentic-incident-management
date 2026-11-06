import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import {
  CheckCircle2,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Lock,
  Layers,
  Check
} from "lucide-react";

export default function Home() {
  const agentStages = [
    {
      title: "Data Quality Agent",
      stage: "Stage 1",
      description: "Validates incident tickets against deterministic quality rules. Identifies incomplete logs, missing reproduction steps, or invalid fields before escalation.",
      capabilities: [
        "Pre-database Presidio PII masking",
        "Deterministic first-match-wins rule evaluation",
        "Single-click rollback with run-level audit history"
      ],
      icon: CheckCircle2,
      tag: "10 active operators",
      accent: "border-l-4 border-l-[#a20a29]",
    },
    {
      title: "Triage & Priority Agent",
      stage: "Stage 2",
      description: "Re-evaluates business priority and SLA tiers against standard operating procedures, normalizing misclassified ticket urgencies.",
      capabilities: [
        "Runbook taxonomy alignment",
        "Automated priority adjustment",
        "Categorization and routing assignment"
      ],
      icon: ShieldAlert,
      tag: "Runbook triage",
      accent: "border-l-4 border-l-[#005656]",
    },
    {
      title: "Resolution Agent",
      stage: "Stage 3",
      description: "Matches incidents with technical runbooks and knowledge articles to propose verified remediation steps and resolution drafts for engineers.",
      capabilities: [
        "Runbook search across knowledge bases",
        "Root cause analysis synthesis",
        "Remediation draft generation"
      ],
      icon: BookOpen,
      tag: "Knowledge base",
      accent: "border-l-4 border-l-[#b08824]",
    },
  ];

  const pillars = [
    {
      icon: Lock,
      title: "Privacy at rest & in transit",
      description: "Microsoft Presidio and spaCy NER automatically redact names, emails, and phone numbers before storing in PostgreSQL or sending to models.",
    },
    {
      icon: Cpu,
      title: "Asynchronous processing",
      description: "Built on FastAPI and SQLAlchemy asyncpg with connection pooling and batch querying for high-throughput incident processing.",
    },
    {
      icon: Layers,
      title: "Auditability & compliance",
      description: "Complete trace logs for all rule executions, batch runs, and state modifications to satisfy enterprise compliance requirements.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#222222] flex flex-col font-sans">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto px-6 py-10 w-full space-y-12">
        {/* Hero Section */}
        <div className="border border-[#e0e1dc] rounded-lg p-8 sm:p-10 bg-white shadow-xs">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-[#e0e1dc] bg-[#f0f4f4] text-xs font-medium text-[#005656]">
              <span className="h-2 w-2 rounded-full bg-[#005656]" />
              <span>Multi-Source Autonomous Incident Pipeline</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#222222]">
              Incident Management Pipeline
            </h1>

            <p className="text-[#5e605d] text-base leading-relaxed max-w-2xl">
              An intelligent operations platform for ServiceNow, Jira, and support mailboxes. Validate data quality, normalize incident priorities against runbooks, and generate remediation guidance.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link href="/dq-rules">
                <Button className="h-10 px-5 text-xs font-semibold gap-2 bg-[#a20a29] hover:bg-[#850821] text-white shadow-xs">
                  <ShieldCheck className="h-4 w-4" />
                  Configure Data Quality Rules
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" className="h-10 px-4 text-xs font-medium border-[#e0e1dc] text-[#222222] hover:bg-[#f0f4f4]">
                  API Documentation
                </Button>
              </a>
            </div>
          </div>
        </div>

        {/* 3 Agent Pipeline Stages */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-[#222222]">Processing Stages</h2>
              <p className="text-xs text-[#5e605d]">Sequential multi-agent workflow from ingestion to resolution.</p>
            </div>
            <span className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2.5 py-1 rounded">3 sequential agents</span>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {agentStages.map((stage) => {
              const Icon = stage.icon;
              return (
                <Card key={stage.title} className={`border-[#e0e1dc] bg-white flex flex-col justify-between shadow-xs ${stage.accent}`}>
                  <CardHeader className="space-y-3 pb-4">
                    <div className="flex items-center justify-between">
                      <div className="h-9 w-9 rounded-md bg-[#f0f4f4] flex items-center justify-center text-[#005656]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="text-xs font-medium text-[#5e605d] border-[#e0e1dc]">
                        {stage.stage}
                      </Badge>
                    </div>

                    <div>
                      <div className="text-xs font-semibold text-[#005656] mb-1">
                        {stage.tag}
                      </div>
                      <CardTitle className="text-base font-bold text-[#222222]">{stage.title}</CardTitle>
                    </div>

                    <CardDescription className="text-xs leading-relaxed text-[#5e605d]">
                      {stage.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-0 pb-5">
                    <div className="border-t border-[#e0e1dc] pt-3 space-y-1.5">
                      {stage.capabilities.map((cap) => (
                        <div key={cap} className="flex items-start gap-2 text-xs text-[#5e605d]">
                          <Check className="h-3.5 w-3.5 text-[#005656] shrink-0 mt-0.5" />
                          <span>{cap}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Core Pillars */}
        <div className="space-y-4 pt-2">
          <h2 className="text-xl font-bold tracking-tight text-[#222222]">Enterprise Capabilities</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div key={pillar.title} className="p-5 rounded-lg border border-[#e0e1dc] bg-white shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-[#222222] font-semibold text-sm">
                    <Icon className="h-4 w-4 text-[#a20a29]" />
                    <span>{pillar.title}</span>
                  </div>
                  <p className="text-xs text-[#5e605d] leading-relaxed">
                    {pillar.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <footer className="border-t border-[#e0e1dc] py-6 mt-12 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#5e605d]">
          <div className="font-semibold text-[#222222]">AMS Agentic Incident Management</div>
          <div>Enterprise operations platform • Presidio privacy protection</div>
        </div>
      </footer>
    </div>
  );
}
