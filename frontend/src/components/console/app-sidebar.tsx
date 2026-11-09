"use client";

import { useId } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  FileCode2,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Ticket,
  UserRound,
  Users,
} from "lucide-react";
import { cn } from "cn";
import { ThemeToggle } from "@/components/console/theme-toggle";
import { ROLES, ViewRole, setViewAs, useViewAs } from "@/lib/view-as";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  step?: number;
  count?: number;
  match: (pathname: string) => boolean;
  children?: { label: string; href: string }[];
};

const ADMIN_GROUPS: { label: string; items: NavItem[] }[] = [
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
  {
    label: "Settings",
    items: [{ label: "Jira", href: "/settings/jira", icon: PlugZap, match: (p) => p.startsWith("/settings/jira") }],
  },
];

const ALL_TICKETS: NavItem = { label: "All tickets", href: "/tickets", icon: Ticket, match: (p) => p.startsWith("/tickets") };

const GROUPS_BY_ROLE: Record<ViewRole, { label: string; items: NavItem[] }[]> = {
  admin: ADMIN_GROUPS,
  lead: [
    { label: "Team", items: [{ label: "Team queue", href: "/team", icon: Users, match: (p) => p.startsWith("/team") }] },
    { label: "Tickets", items: [ALL_TICKETS] },
  ],
  engineer: [
    { label: "My work", items: [{ label: "My tickets", href: "/my-tickets", icon: UserRound, match: (p) => p.startsWith("/my-tickets") }] },
    { label: "Tickets", items: [ALL_TICKETS] },
  ],
};

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
  const router = useRouter();
  const role = useViewAs();
  const viewAsId = useId();
  const roleInfo = ROLES.find((r) => r.value === role)!;
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
        {GROUPS_BY_ROLE[role].map((group) => (
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
        <div className={cn("flex flex-col gap-1 px-2.5 pb-2", compact && "md:max-lg:hidden")}>
          <span className="text-[13px] font-semibold text-foreground">{roleInfo.person}</span>
          <label htmlFor={viewAsId} className="text-xs text-muted-foreground">
            Viewing as (demo, no sign-in)
          </label>
          <select
            id={viewAsId}
            value={role}
            onChange={(e) => {
              const next = ROLES.find((r) => r.value === e.target.value)!;
              setViewAs(next.value);
              router.push(next.home);
              onNavigate?.();
            }}
            className="h-8 w-full rounded-lg border border-input bg-background px-2 text-[13px] text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
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
