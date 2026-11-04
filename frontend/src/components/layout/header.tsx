import Link from "next/link";
import { Activity, ShieldCheck, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function Header() {
  return (
    <header className="border-b bg-card">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <Activity className="h-5 w-5 text-primary" />
            <span>AMS Incident Agent</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link
              href="/dq-rules"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              DQ Rules
            </Link>
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
            >
              <FileText className="h-4 w-4" />
              API Docs
            </a>
          </nav>
        </div>

        <Badge variant="outline">Pipeline Ready</Badge>
      </div>
    </header>
  );
}
