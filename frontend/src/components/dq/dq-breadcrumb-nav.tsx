"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home, ShieldCheck } from "lucide-react";

export interface DQBreadcrumbItem {
  label: string;
  href?: string;
}

interface DQBreadcrumbNavProps {
  currentTab: "manage" | "execute";
  items?: DQBreadcrumbItem[];
}

export function DQBreadcrumbNav({ currentTab, items }: DQBreadcrumbNavProps) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#e0e1dc]">
      {/* Breadcrumb path */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#5e605d]">
        <Link
          href="/"
          className="hover:text-[#222222] flex items-center gap-1 transition-colors"
        >
          <Home className="h-3.5 w-3.5 text-[#5e605d]" />
          <span>Home</span>
        </Link>

        <ChevronRight className="h-3.5 w-3.5 text-[#5e605d]/60 shrink-0" />

        <Link
          href="/dq-rules"
          className="hover:text-[#222222] flex items-center gap-1 font-medium transition-colors"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-[#a20a29]" />
          <span>Data Quality Agent</span>
        </Link>

        <ChevronRight className="h-3.5 w-3.5 text-[#5e605d]/60 shrink-0" />

        <span className="font-semibold text-[#222222]">
          {currentTab === "manage" ? "Manage Rules" : "Execute Evaluation & Runs"}
        </span>

        {items?.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-[#5e605d]/60 shrink-0" />
            {item.href ? (
              <Link href={item.href} className="hover:text-[#222222] transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className="font-semibold text-[#222222]">{item.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Sub-navigation tabs between Manage & Execute */}
      <div className="flex items-center bg-[#f0f4f4] p-0.5 rounded-lg border border-[#e0e1dc]">
        <Link
          href="/dq-rules"
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            currentTab === "manage"
              ? "bg-white text-[#a20a29] shadow-2xs border border-[#e0e1dc]"
              : "text-[#5e605d] hover:text-[#222222]"
          }`}
        >
          Manage Rules
        </Link>
        <Link
          href="/dq-rules/execute"
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
            currentTab === "execute"
              ? "bg-white text-[#005656] shadow-2xs border border-[#e0e1dc]"
              : "text-[#5e605d] hover:text-[#222222]"
          }`}
        >
          Execute & Audit Runs
        </Link>
      </div>
    </div>
  );
}
