"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  FileCode2,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { cn } from "cn";
import { ThemeToggle } from "@/components/console/theme-toggle";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  step?: number;
  count?: number;
  match: (pathname: string) => boolean;
  children?: { label: string; href: string }[];
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Overview",
    items: [{ label: "Home", href: "/", icon: Home, match: (p) => p === "/" }],
  },
  {
    label: "Tickets",
    items: [
      { label: "All tickets", href: "/tickets", icon: Ticket, match: (p) => p.startsWith("/tickets") },
    ],
  },
  {
    label: "Agents",
    items: [
      {
        label: "Data Quality",
        href: "/dq-rules",
        icon: ShieldCheck,
        step: 1,
        match: (p) => p.startsWith("/dq-rules"),
        children: [
          { label: "Rules", href: "/dq-rules" },
          { label: "Runs", href: "/dq-rules/execute" },
        ],
      },
      { label: "Triage", href: "/triage", icon: ShieldAlert, step: 2, match: (p) => p.startsWith("/triage") },
      { label: "Resolution", href: "/resolution", icon: BookOpen, step: 3, match: (p) => p.startsWith("/resolution") },
    ],
  },
];

const itemBase =
  "relative flex h-8 items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-[80ms] hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none";
const itemActive =
  "bg-selected font-semibold text-foreground hover:bg-selected before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-primary";

interface AppSidebarProps {
  /** Icon-only column between 768px and 1023px, unless expanded. */
  compact?: boolean;
  onToggleCompact?: () => void;
  /** Called after a link is followed (used to close the mobile menu). */
  onNavigate?: () => void;
  className?: string;
}

export function AppSidebar({ compact = false, onToggleCompact, onNavigate, className }: AppSidebarProps) {
  const pathname = usePathname();
  const hide = compact ? "md:max-lg:sr-only" : "";

  return (
    <nav aria-label="Main" className={cn("flex h-full flex-col gap-3 bg-sidebar p-3 text-sidebar-foreground", className)}>
      <div className="flex items-center gap-2 px-1 py-0.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground text-[13px] font-bold text-background">
          A
        </span>
        <span className={cn("text-[13px] font-semibold", hide)}>AMS Agents</span>
      </div>

      {onToggleCompact && (
        <button
          type="button"
          onClick={onToggleCompact}
          aria-expanded={!compact}
          aria-label={compact ? "Expand the sidebar" : "Collapse the sidebar"}
          title={compact ? "Expand the sidebar" : "Collapse the sidebar"}
          className={cn(itemBase, "hidden md:max-lg:flex")}
        >
          {compact ? <PanelLeftOpen className="size-4 shrink-0" /> : <PanelLeftClose className="size-4 shrink-0" />}
          <span className={hide}>Collapse</span>
        </button>
      )}

      <div className="flex flex-1 flex-col gap-4">
        {GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <p className={cn("px-2.5 pb-1 text-xs font-medium text-muted-foreground", hide)}>{group.label}</p>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.match(pathname);
                const exact = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={exact && !item.children ? "page" : undefined}
                      aria-label={item.label}
                      title={item.label}
                      className={cn(itemBase, active && itemActive)}
                    >
                      <Icon className="size-4 shrink-0" />
                      <span className={cn("flex min-w-0 flex-1 items-center gap-1.5", hide)}>
                        {item.step && <span className="text-xs font-normal tabular-nums text-muted-foreground">{item.step}</span>}
                        <span>{item.label}</span>
                      </span>
                      {item.count !== undefined && (
                        <span className={cn("ml-auto text-xs tabular-nums text-muted-foreground", hide)}>{item.count}</span>
                      )}
                    </Link>
                    {item.children && active && (
                      <ul className={cn("mt-0.5 flex flex-col gap-0.5 pl-6", compact && "md:max-lg:hidden")}>
                        {item.children.map((child) => {
                          const childActive = pathname === child.href;
                          return (
                            <li key={child.href}>
                              <Link
                                href={child.href}
                                onClick={onNavigate}
                                aria-current={childActive ? "page" : undefined}
                                className={cn(itemBase, childActive && "font-semibold text-foreground")}
                              >
                                {child.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
        <a
          href="http://localhost:8000/docs"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="API docs"
          title="API docs"
          className={itemBase}
        >
          <FileCode2 className="size-4 shrink-0" />
          <span className={hide}>API docs</span>
        </a>
        <ThemeToggle compact={compact} />
      </div>
    </nav>
  );
}
