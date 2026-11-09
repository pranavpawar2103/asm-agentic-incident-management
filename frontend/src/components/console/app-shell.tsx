"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "cn";
import { AppSidebar } from "@/components/console/app-sidebar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function AppShell({ children, className }: { children: React.ReactNode; className?: string }) {
  const [compact, setCompact] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* >=1024px: 240px. 768-1023px: 56px icon column unless expanded. <768px: menu dialog. */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 border-r border-sidebar-border md:block lg:w-60",
          compact ? "md:w-14" : "md:w-60"
        )}
      >
        <AppSidebar compact={compact} onToggleCompact={() => setCompact((c) => !c)} />
      </aside>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="top-0 left-0 h-full w-60 max-w-60 translate-x-0 translate-y-0 rounded-none border-y-0 border-l-0 p-0 sm:max-w-60">
          <DialogTitle className="sr-only">Menu</DialogTitle>
          <AppSidebar onNavigate={() => setMenuOpen(false)} />
        </DialogContent>
      </Dialog>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-2 md:hidden">
          <Button variant="ghost" size="icon" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu />
          </Button>
          <span className="text-[13px] font-semibold">AMS Agents</span>
        </div>
        <main className={cn("flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-6 md:px-10 md:py-8", className)}>
          {children}
        </main>
      </div>
    </div>
  );
}
