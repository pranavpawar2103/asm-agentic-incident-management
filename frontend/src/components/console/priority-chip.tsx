import { Badge } from "@/components/ui/badge";

/** Map a ServiceNow priority string ("1 - Critical", "P2", ...) to a chip; unknown values render as a dash. */
export function PriorityChip({ priority }: { priority?: string | null }) {
  const n = priority?.match(/[1-4]/)?.[0];
  if (!n) return <Badge variant="p4">—</Badge>;
  return (
    <Badge variant={`p${n}` as "p1" | "p2" | "p3" | "p4"} title={priority ?? undefined}>
      P{n}
    </Badge>
  );
}
