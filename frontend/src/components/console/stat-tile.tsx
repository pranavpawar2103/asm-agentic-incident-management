import { cn } from "cn";
import { Card } from "@/components/ui/card";

interface StatTileProps {
  label: React.ReactNode;
  value: React.ReactNode;
  /** Window or comparison, e.g. "last 7 days". Omit when the data has none. */
  window?: React.ReactNode;
  variant?: "primary" | "secondary";
  className?: string;
}

export function StatTile({ label, value, window, variant = "secondary", className }: StatTileProps) {
  return (
    <Card size="sm" className={cn("gap-1 px-4", className)}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-semibold tabular-nums text-foreground",
          variant === "primary" ? "text-[30px] leading-9 tracking-[-0.02em]" : "text-xl"
        )}
      >
        {value}
      </span>
      {window && <span className="text-xs text-muted-foreground">{window}</span>}
    </Card>
  );
}
