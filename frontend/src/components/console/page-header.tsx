import { cn } from "cn";

interface PageHeaderProps {
  title: React.ReactNode;
  /** Muted 13px line under the title. */
  context?: React.ReactNode;
  /** Right-aligned controls (buttons, filters). */
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, context, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-x-4 gap-y-3", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-foreground">{title}</h1>
        {context && <p className="text-[13px] text-muted-foreground">{context}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
