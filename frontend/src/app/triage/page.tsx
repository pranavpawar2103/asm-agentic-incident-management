"use client";

import { useState } from "react";
import { AgentWorkflowLayout } from "@/components/layout/agent-workflow-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ShieldAlert,
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Scale,
  Clock,
  CheckCircle2,
  Filter
} from "lucide-react";

interface PriorityRule {
  id: string;
  condition: string;
  reported: string;
  normalized: string;
  impactTier: string;
  rationale: string;
  status: "Active" | "Enforced";
}

const TRIAGE_RULES: PriorityRule[] = [
  {
    id: "TR-001",
    condition: "Avatar / Profile photo / UI theme preference bug",
    reported: "1 - Critical",
    normalized: "5 - Planning",
    impactTier: "Tier 4 (Cosmetic)",
    rationale: "Cosmetic presentation issue with zero business transaction disruption.",
    status: "Enforced",
  },
  {
    id: "TR-002",
    condition: "SalesConnect CRM opportunity locked during quarter-end",
    reported: "3 - Moderate",
    normalized: "2 - High",
    impactTier: "Tier 1 (Revenue)",
    rationale: "Quarter-end policy triggers automatic +1 priority escalation for opportunity updates.",
    status: "Enforced",
  },
  {
    id: "TR-003",
    condition: "BillingEngine payment gateway / settlement timeout",
    reported: "2 - High",
    normalized: "1 - Critical",
    impactTier: "Tier 1 (Core Financials)",
    rationale: "Core transactional failure affecting active payment settlement pipeline.",
    status: "Enforced",
  },
  {
    id: "TR-004",
    condition: "Single user Active Directory / SSO lockout",
    reported: "1 - Critical",
    normalized: "4 - Low",
    impactTier: "Tier 3 (Isolated)",
    rationale: "Isolated individual impact with self-service unlock runbook available.",
    status: "Enforced",
  },
  {
    id: "TR-005",
    condition: "Complete SSO Gateway / Okta authentication outage",
    reported: "2 - High",
    normalized: "1 - Critical",
    impactTier: "Tier 1 (Enterprise Wide)",
    rationale: "Multi-tenant authentication barrier blocking all staff logins.",
    status: "Enforced",
  },
];

const SLA_MATRIX = [
  { priority: "P1 - Critical", targetResponse: "15 mins", targetResolution: "4 hours", color: "text-[#a20a29]", bg: "bg-[#fdf2f4]" },
  { priority: "P2 - High", targetResponse: "30 mins", targetResolution: "8 hours", color: "text-[#b08824]", bg: "bg-[#fbf7ee]" },
  { priority: "P3 - Moderate", targetResponse: "2 hours", targetResolution: "24 hours", color: "text-[#005656]", bg: "bg-[#f0f4f4]" },
  { priority: "P4 - Low", targetResponse: "4 hours", targetResolution: "72 hours", color: "text-[#5e605d]", bg: "bg-[#fbfbfb]" },
  { priority: "P5 - Planning", targetResponse: "24 hours", targetResolution: "Next Sprint", color: "text-[#5e605d]", bg: "bg-[#fbfbfb]" },
];

export default function TriagePage() {
  const [selectedApp, setSelectedApp] = useState("SalesConnect CRM");
  const [reportedPriority, setReportedPriority] = useState("1 - Critical");
  const [ticketSummary, setTicketSummary] = useState("User profile photo failed to sync in customer dashboard");
  const [simulatedResult, setSimulatedResult] = useState<{
    normalized: string;
    action: string;
    justification: string;
    sla: string;
  } | null>(null);

  const handleSimulateTriage = () => {
    const lower = ticketSummary.toLowerCase();
    if (lower.includes("photo") || lower.includes("avatar") || lower.includes("theme") || lower.includes("color")) {
      setSimulatedResult({
        normalized: "5 - Planning",
        action: "Demoted from P1 to P5",
        justification: "Rule TR-001: Cosmetic UI issue without transactional disruption.",
        sla: "Resolution Target: Next Sprint",
      });
    } else if (lower.includes("billing") || lower.includes("payment") || lower.includes("settlement")) {
      setSimulatedResult({
        normalized: "1 - Critical",
        action: "Promoted to P1 Critical",
        justification: "Rule TR-003: Core financial transaction bottleneck.",
        sla: "Resolution Target: 4 Hours (15 min response)",
      });
    } else {
      setSimulatedResult({
        normalized: "3 - Moderate",
        action: "Standard Operating Alignment",
        justification: "Aligned with AMS Runbook standard business impact taxonomy.",
        sla: "Resolution Target: 24 Hours",
      });
    }
  };

  return (
    <AgentWorkflowLayout currentStep={2}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e0e1dc] pb-6">
        <div>
          <div className="text-xs font-semibold text-[#005656] uppercase tracking-wider mb-1">
            Priority & SLA Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            Triage & Priority Normalization Agent
          </h1>
          <p className="text-[#5e605d] text-sm mt-1 max-w-2xl">
            Stage 2 receives validated tickets from the Data Quality Agent. It objectively evaluates urgency and business impact against organizational runbooks, overriding reporter inflation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-[#005656] text-white px-3 py-1 text-xs font-medium border-none">
            Runbook Taxonomy Active
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#e0e1dc] bg-white shadow-xs border-l-4 border-l-[#005656]">
          <CardHeader className="pb-2">
            <div className="text-xs font-semibold text-[#005656]">Gate 02 Verification</div>
            <CardTitle className="text-base font-bold text-[#222222]">Input from Step 1</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5e605d] leading-relaxed">
              Consumes only clean tickets where Data Quality flag is valid (<span className="font-mono text-[#005656]">dq_flag = false</span>) and personal caller data has been masked via Presidio.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-xs border-l-4 border-l-[#a20a29]">
          <CardHeader className="pb-2">
            <div className="text-xs font-semibold text-[#a20a29]">Inflation Deflation</div>
            <CardTitle className="text-base font-bold text-[#222222]">Objective Reclassification</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5e605d] leading-relaxed">
              Prevents queue saturation caused by subjective user submissions. Maps true operational criticality to contracted SLA response windows.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-xs border-l-4 border-l-[#b08824]">
          <CardHeader className="pb-2">
            <div className="text-xs font-semibold text-[#b08824]">Next Stage</div>
            <CardTitle className="text-base font-bold text-[#222222]">Hand-off to Step 3</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5e605d] leading-relaxed">
              Triaged and prioritized incidents are passed to the Resolution Agent for automated runbook lookup and remediation drafting.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Triage Simulator */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#222222]">Interactive Triage Evaluation Simulator</h2>
            <p className="text-xs text-[#5e605d]">
              Test how the Triage Agent analyzes incident claims and adjusts priority according to runbook taxonomies.
            </p>
          </div>
          <span className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2.5 py-1 rounded">
            Real-Time Engine Testbench
          </span>
        </div>

        <Card className="border-[#e0e1dc] bg-white shadow-xs">
          <CardContent className="p-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-[#222222] block mb-1.5">Target Application</label>
                <select
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#005656]"
                >
                  <option value="SalesConnect CRM">SalesConnect CRM (Tier 2)</option>
                  <option value="BillingEngine">BillingEngine (Tier 1)</option>
                  <option value="StockSense">StockSense (Tier 2)</option>
                  <option value="InsightBI">InsightBI (Tier 3)</option>
                  <option value="PayrollPro">PayrollPro (Tier 1)</option>
                  <option value="EmployeePortal">EmployeePortal (Tier 3)</option>
                  <option value="OrderHub">OrderHub (Tier 2)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#222222] block mb-1.5">Reporter Claimed Priority</label>
                <select
                  value={reportedPriority}
                  onChange={(e) => setReportedPriority(e.target.value)}
                  className="w-full text-xs h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#005656]"
                >
                  <option value="1 - Critical">1 - Critical (Claims Emergency)</option>
                  <option value="2 - High">2 - High</option>
                  <option value="3 - Moderate">3 - Moderate</option>
                  <option value="4 - Low">4 - Low</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#222222] block mb-1.5">Action</label>
                <Button
                  onClick={handleSimulateTriage}
                  className="w-full h-9 text-xs bg-[#005656] hover:bg-[#004242] text-white font-semibold gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Evaluate Priority
                </Button>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#222222] block mb-1.5">Incident Short Description</label>
              <input
                type="text"
                value={ticketSummary}
                onChange={(e) => setTicketSummary(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#005656]"
                placeholder="Describe the reported issue..."
              />
            </div>

            {simulatedResult && (
              <div className="p-4 rounded-lg border border-[#e0e1dc] bg-[#fbfbfb] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-[#005656]" />
                    <span className="text-xs font-bold text-[#222222]">Triage Verdict: {simulatedResult.action}</span>
                  </div>
                  <Badge className="bg-[#a20a29] text-white text-xs">
                    Normalized: {simulatedResult.normalized}
                  </Badge>
                </div>
                <p className="text-xs text-[#5e605d]">
                  <strong className="text-[#222222]">Policy Justification:</strong> {simulatedResult.justification}
                </p>
                <div className="text-xs font-medium text-[#005656] pt-1">
                  ⏱️ {simulatedResult.sla}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Enforced Enterprise Triage Policies */}
      <section className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-[#222222]">Enforced Priority Reclassification Policies</h2>
            <p className="text-xs text-[#5e605d]">
              Predefined organizational policies that automatically normalize ticket urgency based on business impact.
            </p>
          </div>
          <span className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2.5 py-1 rounded">
            5 Active Policies
          </span>
        </div>

        <div className="border border-[#e0e1dc] rounded-lg bg-white overflow-hidden shadow-xs">
          <Table>
            <TableHeader className="bg-[#f0f4f4]/60">
              <TableRow className="border-b border-[#e0e1dc]">
                <TableHead className="text-xs font-semibold text-[#005656]">Policy ID</TableHead>
                <TableHead className="text-xs font-semibold text-[#005656]">Condition Trigger</TableHead>
                <TableHead className="text-xs font-semibold text-[#005656]">Reported</TableHead>
                <TableHead className="text-xs font-semibold text-[#005656]">Normalized Result</TableHead>
                <TableHead className="text-xs font-semibold text-[#005656]">Impact Tier</TableHead>
                <TableHead className="text-xs font-semibold text-[#005656]">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {TRIAGE_RULES.map((rule) => (
                <TableRow key={rule.id} className="border-b border-[#e0e1dc] hover:bg-[#fbfbfb]">
                  <TableCell className="text-xs font-mono font-medium text-[#222222]">{rule.id}</TableCell>
                  <TableCell className="text-xs text-[#222222]">
                    <div className="font-medium">{rule.condition}</div>
                    <div className="text-[11px] text-[#5e605d]">{rule.rationale}</div>
                  </TableCell>
                  <TableCell className="text-xs text-[#a20a29] font-medium">{rule.reported}</TableCell>
                  <TableCell className="text-xs font-semibold text-[#005656]">{rule.normalized}</TableCell>
                  <TableCell className="text-xs text-[#5e605d]">{rule.impactTier}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="border-[#005656] text-[#005656] text-[10px]">
                      {rule.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Target SLA Windows */}
      <section className="space-y-3 pt-2">
        <h2 className="text-lg font-bold tracking-tight text-[#222222]">Contracted SLA Resolution Targets</h2>
        <div className="grid gap-3 sm:grid-cols-5">
          {SLA_MATRIX.map((tier) => (
            <div key={tier.priority} className={`p-4 rounded-lg border border-[#e0e1dc] ${tier.bg} space-y-1.5`}>
              <div className={`text-xs font-bold ${tier.color}`}>{tier.priority}</div>
              <div className="text-xs text-[#222222]">
                <span className="text-[#5e605d]">Response: </span>
                <span className="font-semibold">{tier.targetResponse}</span>
              </div>
              <div className="text-xs text-[#222222]">
                <span className="text-[#5e605d]">Resolution: </span>
                <span className="font-semibold">{tier.targetResolution}</span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </AgentWorkflowLayout>
  );
}
