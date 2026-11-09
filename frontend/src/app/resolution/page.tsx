"use client";

import { useState } from "react";
import { AgentWorkflowLayout } from "@/components/layout/agent-workflow-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  BookOpen,
  CheckCircle2,
  FileText,
  Search,
  ExternalLink,
  Sparkles,
  Layers,
  HelpCircle,
  Copy,
  Check
} from "lucide-react";

interface KBArticle {
  id: string;
  appId: string;
  appName: string;
  title: string;
  criticality: "Tier 1" | "Tier 2" | "Tier 3";
  rootCause: string;
  resolutionSummary: string;
}

const KB_ARTICLES: KBArticle[] = [
  {
    id: "KB-CRM-001",
    appId: "APP-CRM",
    appName: "SalesConnect CRM",
    title: "User account locked / cannot log in",
    criticality: "Tier 2",
    rootCause: "Platform lockout policy (5 failed attempts, 30-minute lock)",
    resolutionSummary: "Admin console → Users → Unlock. If forgotten password, trigger reset link to corporate email.",
  },
  {
    id: "KB-CRM-002",
    appId: "APP-CRM",
    appName: "SalesConnect CRM",
    title: "Opportunity stage update failed / Validation Error",
    criticality: "Tier 2",
    rootCause: "Missing mandatory fields during end-of-stage gate transition",
    resolutionSummary: "Verify opportunity close date and discount threshold approval flag in MuleSoft sync log.",
  },
  {
    id: "KB-BIL-001",
    appId: "APP-BIL",
    appName: "BillingEngine",
    title: "Payment gateway webhook timeout / settlement failure",
    criticality: "Tier 1",
    rootCause: "Webhook queue consumer backpressure exceeding 300s timeout",
    resolutionSummary: "Restart settlement worker pod pool, flush dead-letter Redis queue, trigger idempotent replay.",
  },
  {
    id: "KB-STK-001",
    appId: "APP-STK",
    appName: "StockSense",
    title: "Warehouse inventory discrepancy on SKU stock count",
    criticality: "Tier 2",
    rootCause: "Stale Kafka partition offset in warehouse event ingestion pipeline",
    resolutionSummary: "Re-index warehouse stock batch via reconciliation CLI tool `stocksense-reconcile --facility=WH-EAST`.",
  },
  {
    id: "KB-PAY-001",
    appId: "APP-PAY",
    appName: "PayrollPro",
    title: "Direct deposit batch transmission lock",
    criticality: "Tier 1",
    rootCause: "NACHA formatted file encryption key expiry on banking SFTP channel",
    resolutionSummary: "Rotate PGP bank transfer key via Key Vault, verify test batch checksum, re-trigger payroll run.",
  },
  {
    id: "KB-BI-001",
    appId: "APP-BI",
    appName: "InsightBI",
    title: "Executive dashboard refresh failure (Nightly ETL)",
    criticality: "Tier 3",
    rootCause: "Snowflake warehouse auto-suspend during long-running dimension join",
    resolutionSummary: "Scale warehouse to Large, execute partition refresh script `dbt run --select marts.sales`.",
  },
  {
    id: "KB-PORTAL-001",
    appId: "APP-PORTAL",
    appName: "EmployeePortal",
    title: "Benefits enrollment single sign-on redirect loop",
    criticality: "Tier 3",
    rootCause: "SAML assertion signature certificate mismatch in identity provider",
    resolutionSummary: "Update IdP metadata XML in Azure AD enterprise application settings.",
  },
];

export default function ResolutionPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedApp, setSelectedApp] = useState("ALL");
  const [selectedArticle, setSelectedArticle] = useState<KBArticle | null>(KB_ARTICLES[0]);
  const [copied, setCopied] = useState(false);

  const filteredArticles = KB_ARTICLES.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.rootCause.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesApp = selectedApp === "ALL" || item.appName === selectedApp;
    return matchesSearch && matchesApp;
  });

  const handleCopyDraft = () => {
    if (!selectedArticle) return;
    const text = `Resolution Plan for ${selectedArticle.id} (${selectedArticle.appName}):\nRoot Cause: ${selectedArticle.rootCause}\nSteps:\n1. ${selectedArticle.resolutionSummary}\n2. Verify incident logs and confirm with reporter.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AgentWorkflowLayout currentStep={3}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e0e1dc] pb-6">
        <div>
          <div className="text-xs font-semibold text-[#005656] uppercase tracking-wider mb-1">
            Knowledge-Assisted Remediation
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#222222]">
            Resolution Agent & Runbook Synthesizer
          </h1>
          <p className="text-[#5e605d] text-sm mt-1 max-w-2xl">
            Stage 3 takes triaged incidents and searches technical knowledge bases and standard operating procedures to synthesize verified resolution plans and drafts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge className="bg-[#b08824] text-white px-3 py-1 text-xs font-medium border-none">
            7 Enterprise Runbooks Indexed
          </Badge>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-[#e0e1dc] bg-white shadow-xs border-l-4 border-l-[#005656]">
          <CardHeader className="pb-2">
            <div className="text-xs font-semibold text-[#005656]">Gate 03 Verification</div>
            <CardTitle className="text-base font-bold text-[#222222]">Validated & Triaged Input</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5e605d] leading-relaxed">
              Receives incidents that have passed deterministic Data Quality checks (Step 1) and have had their operational priority normalized (Step 2).
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-xs border-l-4 border-l-[#b08824]">
          <CardHeader className="pb-2">
            <div className="text-xs font-semibold text-[#b08824]">Knowledge Base Corpus</div>
            <CardTitle className="text-base font-bold text-[#222222]">7 Core Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5e605d] leading-relaxed">
              Indexes standard runbooks across CRM, Billing, Inventory, BI, Payroll, Employee Portal, and Order Hub architectures.
            </p>
          </CardContent>
        </Card>

        <Card className="border-[#e0e1dc] bg-white shadow-xs border-l-4 border-l-[#a20a29]">
          <CardHeader className="pb-2">
            <div className="text-xs font-semibold text-[#a20a29]">Resolution Output</div>
            <CardTitle className="text-base font-bold text-[#222222]">Actionable Work Order</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-[#5e605d] leading-relaxed">
              Synthesizes root causes, exact CLI / Admin console remediation steps, and safe rollback verification for AMS support engineers.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Remediation Workspace */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left column: Runbook Article Search */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-[#222222]">Application Runbooks & Error Patterns</h2>
            <span className="text-xs font-medium text-[#005656] bg-[#f0f4f4] px-2.5 py-1 rounded">
              {filteredArticles.length} Runbook Articles
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="h-3.5 w-3.5 absolute left-3 top-3 text-[#5e605d]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by KB code, symptom, or root cause..."
                className="w-full text-xs h-9 pl-8 pr-3 rounded-md border border-[#e0e1dc] bg-white text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#005656]"
              />
            </div>

            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
              className="text-xs h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#005656]"
            >
              <option value="ALL">All Applications</option>
              <option value="SalesConnect CRM">SalesConnect CRM</option>
              <option value="BillingEngine">BillingEngine</option>
              <option value="StockSense">StockSense</option>
              <option value="InsightBI">InsightBI</option>
              <option value="PayrollPro">PayrollPro</option>
              <option value="EmployeePortal">EmployeePortal</option>
            </select>
          </div>

          <div className="border border-[#e0e1dc] rounded-lg bg-white overflow-hidden shadow-xs divide-y divide-[#e0e1dc]">
            {filteredArticles.map((article) => {
              const isSelected = selectedArticle?.id === article.id;
              return (
                <div
                  key={article.id}
                  onClick={() => setSelectedArticle(article)}
                  className={`p-4 cursor-pointer transition-colors ${
                    isSelected ? "bg-[#fdf2f4] border-l-4 border-l-[#a20a29]" : "hover:bg-[#fbfbfb]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-[#a20a29]">{article.id}</span>
                      <span className="text-xs font-medium text-[#5e605d]">• {article.appName}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] border-[#e0e1dc] text-[#5e605d]">
                      {article.criticality}
                    </Badge>
                  </div>
                  <div className="text-xs font-bold text-[#222222] mb-1">{article.title}</div>
                  <div className="text-[11px] text-[#5e605d] line-clamp-2">
                    <span className="font-semibold text-[#222222]">Root cause:</span> {article.rootCause}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right column: Synthesized Remediation Plan */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold tracking-tight text-[#222222]">Synthesized Resolution Draft</h2>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyDraft}
              className="h-8 text-xs gap-1.5 border-[#e0e1dc] text-[#222222] hover:bg-[#f0f4f4]"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-[#005656]" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy Draft"}
            </Button>
          </div>

          {selectedArticle ? (
            <Card className="border-[#e0e1dc] bg-white shadow-xs">
              <CardHeader className="pb-3 border-b border-[#e0e1dc] bg-[#fbfbfb]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[#005656]">{selectedArticle.id}</span>
                  <Badge className="bg-[#005656] text-white text-[10px]">{selectedArticle.appId}</Badge>
                </div>
                <CardTitle className="text-sm font-bold text-[#222222]">{selectedArticle.title}</CardTitle>
                <CardDescription className="text-xs text-[#5e605d]">
                  Target System: {selectedArticle.appName} • {selectedArticle.criticality}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                <div>
                  <h4 className="font-bold text-[#222222] mb-1">Identified Root Cause</h4>
                  <p className="text-[#5e605d] bg-[#f0f4f4] p-2.5 rounded-md leading-relaxed">
                    {selectedArticle.rootCause}
                  </p>
                </div>

                <div>
                  <h4 className="font-bold text-[#222222] mb-1.5">Prescribed Remediation Steps</h4>
                  <div className="border border-[#e0e1dc] rounded-md p-3 space-y-2 bg-white">
                    <div className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-[#f0f4f4] text-[#005656] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                      <span className="text-[#222222]">{selectedArticle.resolutionSummary}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-[#f0f4f4] text-[#005656] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                      <span className="text-[#5e605d]">Verify service health logs and validate caller confirmation.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-[#f0f4f4] text-[#005656] text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                      <span className="text-[#5e605d]">Mark incident resolved with Presidio-masked caller audit trail.</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e0e1dc] pt-3 text-[11px] text-[#5e605d] flex items-center justify-between">
                  <span>Standard Operating Runbook Verified</span>
                  <span className="text-[#005656] font-semibold">Ready for Deployment</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="p-8 text-center border border-[#e0e1dc] rounded-lg bg-white text-[#5e605d] text-xs">
              Select an article on the left to inspect its synthesized resolution plan.
            </div>
          )}
        </div>
      </div>
    </AgentWorkflowLayout>
  );
}
