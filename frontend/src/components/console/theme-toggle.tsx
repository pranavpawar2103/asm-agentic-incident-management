"use client";

import { useSyncExternalStore } from "react";
import { Moon } from "lucide-react";
import { cn } from "cn";

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

const isDark = () => document.documentElement.classList.contains("dark");

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const dark = useSyncExternalStore(subscribe, isDark, () => false);

  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      // Storage blocked: the theme still applies for this page view.
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title="Dark mode"
      onClick={toggle}
      className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-[13px] font-medium text-muted-foreground transition-colors duration-[80ms] hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
    >
      <Moon className="size-4 shrink-0" aria-hidden="true" />
      <span className={cn("flex-1 text-left", compact && "md:max-lg:sr-only")}>Dark mode</span>
      <span
        aria-hidden="true"
        className={cn(
          "relative h-4 w-7 shrink-0 rounded-full border transition-colors duration-[80ms]",
          dark ? "border-foreground bg-foreground" : "border-input bg-card",
          compact && "md:max-lg:hidden"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 size-2.5 rounded-full transition-[left] duration-[80ms]",
            dark ? "left-3.5 bg-background" : "left-0.5 bg-input"
          )}
        />
      </span>
    </button>
  );
}
