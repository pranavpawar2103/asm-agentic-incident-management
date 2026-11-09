"use client";

import Link from "next/link";
import { Header } from "@/components/layout/header";
import { AgentSidebar } from "@/components/layout/agent-sidebar";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  ShieldAlert,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Check,
  ChevronRight
} from "lucide-react";

interface AgentWorkflowLayoutProps {
  children: React.ReactNode;
  currentStep: 1 | 2 | 3;
}

const STEPS = [
  {
    step: 1,
    title: "Data Quality Agent",
    subtitle: "Validation & Masking",
    href: "/dq-rules",
    icon: CheckCircle2,
  },
  {
    step: 2,
    title: "Triage & Priority Agent",
    subtitle: "Runbook SLA Alignment",
    href: "/triage",
    icon: ShieldAlert,
  },
  {
    step: 3,
    title: "Resolution Agent",
    subtitle: "Knowledge Base Runbooks",
    href: "/resolution",
    icon: BookOpen,
  },
];

export function AgentWorkflowLayout({ children, currentStep }: AgentWorkflowLayoutProps) {
  const prevStep = currentStep > 1 ? STEPS[currentStep - 2] : null;
  const nextStep = currentStep < 3 ? STEPS[currentStep] : null;

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#222222] flex flex-col font-sans">
      <Header />

      <div className="flex-1 flex max-w-[96rem] mx-auto w-full">
        {/* Left Navigation Sidebar */}
        <AgentSidebar currentStep={currentStep} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top Horizontal Stepper Navigation Bar */}
          <div className="border-b border-[#e0e1dc] bg-white px-8 py-3.5 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#5e605d]">Pipeline Stage:</span>
                <span className="text-xs font-bold text-[#222222]">
                  Step 0{currentStep} of 03 — {STEPS[currentStep - 1].title}
                </span>
              </div>

              {/* Step Flow Breadcrumb */}
              <nav className="flex items-center gap-2 overflow-x-auto py-1">
                {STEPS.map((stepItem, idx) => {
                  const Icon = stepItem.icon;
                  const isActive = stepItem.step === currentStep;
                  const isCompleted = stepItem.step < currentStep;

                  return (
                    <div key={stepItem.step} className="flex items-center gap-2">
                      <Link
                        href={stepItem.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                          isActive
                            ? "bg-[#fdf2f4] text-[#a20a29] font-bold border border-[#f5c2cb]"
                            : isCompleted
                            ? "text-[#005656] hover:bg-[#f0f4f4] font-medium"
                            : "text-[#5e605d] hover:text-[#222222] hover:bg-[#f0f4f4]"
                        }`}
                      >
                        <span
                          className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                            isActive
                              ? "bg-[#a20a29] text-white"
                              : isCompleted
                              ? "bg-[#005656] text-white"
                              : "bg-[#e0e1dc] text-[#5e605d]"
                          }`}
                        >
                          {isCompleted ? <Check className="h-3 w-3 stroke-[3]" /> : stepItem.step}
                        </span>
                        <span className="whitespace-nowrap">{stepItem.title}</span>
                      </Link>

                      {idx < STEPS.length - 1 && (
                        <ChevronRight className="h-3.5 w-3.5 text-[#5e605d]/60 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Page Content */}
          <main className="flex-1 px-8 py-8 w-full max-w-6xl space-y-8">
            {children}

            {/* Bottom Stepper Flow Navigation Controls */}
            <div className="border-t border-[#e0e1dc] pt-6 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                {prevStep ? (
                  <Link href={prevStep.href}>
                    <Button
                      variant="outline"
                      className="text-xs h-10 px-4 gap-2 border-[#e0e1dc] text-[#222222] hover:bg-[#f0f4f4]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5 text-[#5e605d]" />
                      <span>Back to Step 0{prevStep.step}: {prevStep.title}</span>
                    </Button>
                  </Link>
                ) : (
                  <Link href="/">
                    <Button
                      variant="outline"
                      className="text-xs h-10 px-4 gap-2 border-[#e0e1dc] text-[#5e605d] hover:bg-[#f0f4f4]"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      <span>Return to Overview</span>
                    </Button>
                  </Link>
                )}
              </div>

              <div>
                {nextStep ? (
                  <Link href={nextStep.href}>
                    <Button className="text-xs h-10 px-5 gap-2 bg-[#a20a29] hover:bg-[#850821] text-white font-semibold shadow-xs">
                      <span>Proceed to Step 0{nextStep.step}: {nextStep.title}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                ) : (
                  <Link href="/">
                    <Button className="text-xs h-10 px-5 gap-2 bg-[#005656] hover:bg-[#004242] text-white font-semibold shadow-xs">
                      <Check className="h-3.5 w-3.5" />
                      <span>Pipeline Completed • Return to Overview</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </main>

          {/* Workflow Footer */}
          <footer className="border-t border-[#e0e1dc] py-4 px-8 bg-white text-xs text-[#5e605d] flex items-center justify-between">
            <span className="font-semibold text-[#222222]">AMS Agentic Incident Management Platform</span>
            <span>Enterprise Multi-Agent Operational Flow</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
