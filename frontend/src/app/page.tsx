import Link from "next/link";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ShieldAlert, BookOpen, ArrowRight, Activity } from "lucide-react";

export default function Home() {
  const agentStages = [
    {
      title: "Data Quality Agent",
      description: "Validates ticket completeness and requests missing details before processing.",
      icon: CheckCircle2,
      tag: "Stage 1",
    },
    {
      title: "Triage Agent",
      description: "Re-evaluates business urgency and priority according to standard operating rulebooks.",
      icon: ShieldAlert,
      tag: "Stage 2",
    },
    {
      title: "Resolution Agent",
      description: "Searches knowledge base documentation and suggests actionable remediation steps.",
      icon: BookOpen,
      tag: "Stage 3",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <Activity className="h-5 w-5 text-primary" />
            <span>AMS Incident Agent</span>
          </div>
          <Badge variant="outline">Pipeline Ready</Badge>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="max-w-2xl space-y-4 mb-10">
          <Badge variant="secondary">Automated Incident Operations</Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Application Management Services Agent
          </h1>
          <p className="text-muted-foreground text-lg">
            Multi-agent pipeline automating incident triage, data quality verification, and resolution recommendations across ServiceNow, JIRA, and support mailboxes.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-10">
          {agentStages.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.title}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Icon className="h-6 w-6 text-primary" />
                    <Badge variant="outline">{stage.tag}</Badge>
                  </div>
                  <CardTitle className="text-xl">{stage.title}</CardTitle>
                  <CardDescription>{stage.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Link href="#tickets">
            <Button size="lg" className="flex items-center gap-2">
              View Incident Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a
            href="http://localhost:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="lg">
              API Documentation
            </Button>
          </a>
        </div>
      </main>

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        AMS Agentic Incident Management System
      </footer>
    </div>
  );
}
