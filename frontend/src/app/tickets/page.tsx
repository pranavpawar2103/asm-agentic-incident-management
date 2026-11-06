"use client";

import { useEffect, useState, useMemo } from "react";
import { Header } from "@/components/layout/header";
import { AgentSidebar } from "@/components/layout/agent-sidebar";
import { ticketService } from "@/services/ticket-service";
import { ServiceNowTicket } from "@/types/servicenow";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Layers,
  ArrowUpDown,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Info
} from "lucide-react";
import Link from "next/link";

export default function TicketsPage() {
  const [tickets, setTickets] = useState<ServiceNowTicket[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [dqFilter, setDqFilter] = useState<string>("all"); // 'all', 'flagged', 'clean'
  const [statusFilter, setStatusFilter] = useState<string>("all"); // 'all', 'open', 'closed'
  const [selectedTicket, setSelectedTicket] = useState<ServiceNowTicket | null>(null);

  // Pagination
  const [page, setPage] = useState<number>(1);
  const pageSize = 20;

  async function fetchTickets() {
    setLoading(true);
    setError(null);
    try {
      const data = await ticketService.getTickets({
        limit: 100, // fetch recent batch for client-side fluid filtering
      });
      setTickets(data.items);
      setTotalCount(data.total);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load ServiceNow tickets";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, []);

  // Unique services for filter dropdown
  const uniqueServices = useMemo(() => {
    const set = new Set<string>();
    tickets.forEach((t) => {
      if (t.service) set.add(t.service);
    });
    return Array.from(set).sort();
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        !search ||
        t.ticket_id.toLowerCase().includes(search) ||
        (t.short_description && t.short_description.toLowerCase().includes(search)) ||
        (t.caller && t.caller.toLowerCase().includes(search)) ||
        (t.service && t.service.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      // Service filter
      if (serviceFilter !== "all" && t.service !== serviceFilter) return false;

      // DQ filter
      if (dqFilter === "flagged" && !t.dq_flag) return false;
      if (dqFilter === "clean" && t.dq_flag) return false;

      // Status filter
      if (statusFilter === "open" && t.closed_at !== null) return false;
      if (statusFilter === "closed" && t.closed_at === null) return false;

      return true;
    });
  }, [tickets, searchTerm, serviceFilter, dqFilter, statusFilter]);

  // Paginated slice
  const paginatedTickets = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, page, pageSize]);

  const totalPages = Math.ceil(filteredTickets.length / pageSize) || 1;

  // Counts for KPI summary
  const flaggedCount = useMemo(() => tickets.filter((t) => t.dq_flag).length, [tickets]);
  const cleanCount = useMemo(() => tickets.filter((t) => !t.dq_flag).length, [tickets]);
  const openCount = useMemo(() => tickets.filter((t) => !t.closed_at).length, [tickets]);

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-[#222222] flex flex-col font-sans">
      <Header />

      <div className="flex-1 flex max-w-[96rem] mx-auto w-full">
        {/* Left Navigation Sidebar */}
        <AgentSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 px-8 py-8 w-full max-w-6xl space-y-6">
            {/* Header & Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="border-[#005656] text-[#005656] bg-[#f0f4f4] text-xs font-semibold px-2 py-0.5">
                    Data Store • ServiceNow Repository
                  </Badge>
                  <span className="text-xs text-[#5e605d]">PostgreSQL / Supabase</span>
                </div>
                <h1 className="text-2xl font-bold tracking-tight text-[#222222]">
                  ServiceNow Incident Tickets
                </h1>
                <p className="text-xs text-[#5e605d] mt-1">
                  View, inspect, and track all ingested incidents across the three-agent pipeline with PII redaction audit details.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchTickets}
                  disabled={loading}
                  className="border-[#e0e1dc] text-xs h-9 gap-1.5 hover:bg-[#f0f4f4]"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </Button>
                <Link href="/dq-rules">
                  <Button size="sm" className="bg-[#a20a29] hover:bg-[#850821] text-white text-xs h-9 gap-1.5 shadow-xs font-semibold">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Run Data Quality Rules</span>
                  </Button>
                </Link>
              </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-[#e0e1dc] bg-white shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-semibold text-[#5e605d] uppercase tracking-wide">
                    Total Ingested Tickets
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-[#222222]">
                    {totalCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-[11px] text-[#5e605d]">Stored with Presidio PII Masking</span>
                </CardContent>
              </Card>

              <Card className="border-[#e0e1dc] bg-white shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-semibold text-[#005656] uppercase tracking-wide flex items-center justify-between">
                    <span>Clean Tickets</span>
                    <CheckCircle2 className="h-4 w-4 text-[#005656]" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-[#005656]">
                    {cleanCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-[11px] text-[#5e605d]">Passed DQ validation gates</span>
                </CardContent>
              </Card>

              <Card className="border-[#e0e1dc] bg-white shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-semibold text-[#a20a29] uppercase tracking-wide flex items-center justify-between">
                    <span>Defective (DQ Flagged)</span>
                    <AlertTriangle className="h-4 w-4 text-[#a20a29]" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-[#a20a29]">
                    {flaggedCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-[11px] text-[#5e605d]">Requires reporter clarification</span>
                </CardContent>
              </Card>

              <Card className="border-[#e0e1dc] bg-white shadow-2xs">
                <CardHeader className="p-4 pb-2">
                  <CardDescription className="text-xs font-semibold text-[#5e605d] uppercase tracking-wide flex items-center justify-between">
                    <span>Active / Open</span>
                    <Clock className="h-4 w-4 text-[#5e605d]" />
                  </CardDescription>
                  <CardTitle className="text-2xl font-bold text-[#222222]">
                    {openCount}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <span className="text-[11px] text-[#5e605d]">Pending SLA resolution</span>
                </CardContent>
              </Card>
            </div>

            {/* Filter & Search Bar */}
            <Card className="border-[#e0e1dc] bg-white shadow-2xs">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#5e605d]" />
                    <Input
                      placeholder="Search by ticket ID (e.g. INC0010310), description, caller, or service..."
                      value={searchTerm}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setPage(1);
                      }}
                      className="pl-9 h-9 text-xs border-[#e0e1dc] focus-visible:ring-1 focus-visible:ring-[#a20a29]"
                    />
                  </div>

                  {/* Filter by Service */}
                  <div className="w-full md:w-44">
                    <select
                      value={serviceFilter}
                      onChange={(e) => {
                        setServiceFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#a20a29]"
                    >
                      <option value="all">All Services</option>
                      {uniqueServices.map((svc) => (
                        <option key={svc} value={svc}>
                          {svc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Filter by DQ Flag */}
                  <div className="w-full md:w-40">
                    <select
                      value={dqFilter}
                      onChange={(e) => {
                        setDqFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#a20a29]"
                    >
                      <option value="all">All DQ Statuses</option>
                      <option value="clean">Clean Only</option>
                      <option value="flagged">Flagged Only</option>
                    </select>
                  </div>

                  {/* Filter by Open/Closed */}
                  <div className="w-full md:w-36">
                    <select
                      value={statusFilter}
                      onChange={(e) => {
                        setStatusFilter(e.target.value);
                        setPage(1);
                      }}
                      className="w-full h-9 rounded-md border border-[#e0e1dc] bg-white px-3 text-xs text-[#222222] focus:outline-none focus:ring-1 focus:ring-[#a20a29]"
                    >
                      <option value="all">All Lifecycle</option>
                      <option value="open">Open / Unresolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Banner */}
            {error && (
              <div className="rounded-lg border border-[#f5c2cb] bg-[#fdf2f4] p-4 text-xs text-[#a20a29] flex items-center justify-between">
                <span>{error}</span>
                <Button variant="outline" size="sm" onClick={fetchTickets} className="h-7 text-xs border-[#a20a29] text-[#a20a29]">
                  Retry
                </Button>
              </div>
            )}

            {/* Tickets Table */}
            <Card className="border-[#e0e1dc] bg-white shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#fbfbfb] border-b border-[#e0e1dc]">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-bold text-[#222222] w-28">Ticket ID</TableHead>
                      <TableHead className="text-xs font-bold text-[#222222]">Description</TableHead>
                      <TableHead className="text-xs font-bold text-[#222222] w-28">Service</TableHead>
                      <TableHead className="text-xs font-bold text-[#222222] w-24">Priority</TableHead>
                      <TableHead className="text-xs font-bold text-[#222222] w-32">Caller (Masked)</TableHead>
                      <TableHead className="text-xs font-bold text-[#222222] w-28">DQ Status</TableHead>
                      <TableHead className="text-xs font-bold text-[#222222] w-24 text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-xs text-[#5e605d]">
                          <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-[#005656]" />
                          Loading ServiceNow incidents...
                        </TableCell>
                      </TableRow>
                    ) : paginatedTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-32 text-center text-xs text-[#5e605d]">
                          No incident tickets found matching the filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedTickets.map((ticket) => (
                        <TableRow
                          key={ticket.ticket_id}
                          className="hover:bg-[#f0f4f4]/40 border-b border-[#e0e1dc]/80 transition-colors cursor-pointer"
                          onClick={() => setSelectedTicket(ticket)}
                        >
                          <TableCell className="font-mono text-xs font-bold text-[#a20a29]">
                            {ticket.ticket_id}
                          </TableCell>
                          <TableCell className="max-w-md">
                            <div className="text-xs font-semibold text-[#222222] truncate">
                              {ticket.short_description || "No short description"}
                            </div>
                            <div className="text-[11px] text-[#5e605d] line-clamp-1 mt-0.5">
                              {ticket.description || "No description provided"}
                            </div>
                          </TableCell>
                          <TableCell>
                            {ticket.service ? (
                              <Badge variant="outline" className="text-[11px] font-medium border-[#e0e1dc] text-[#222222] bg-[#fbfbfb]">
                                {ticket.service}
                              </Badge>
                            ) : (
                              <span className="text-[11px] text-[#5e605d] italic">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-xs font-medium text-[#222222]">
                              {ticket.priority || "Unassigned"}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-[11px] text-[#5e605d]">
                            {ticket.caller || "Unknown"}
                          </TableCell>
                          <TableCell>
                            {ticket.dq_flag ? (
                              <Badge className="bg-[#fdf2f4] text-[#a20a29] border border-[#f5c2cb] hover:bg-[#fdf2f4] text-[10px] font-semibold gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Flagged
                              </Badge>
                            ) : (
                              <Badge className="bg-[#f0f4f4] text-[#005656] border border-[#d0dede] hover:bg-[#f0f4f4] text-[10px] font-semibold gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Clean
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-[#005656] hover:bg-[#f0f4f4]"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTicket(ticket);
                              }}
                            >
                              Inspect
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Table Footer with Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-[#e0e1dc] bg-[#fbfbfb]">
                <span className="text-xs text-[#5e605d]">
                  Showing {paginatedTickets.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
                  {Math.min(page * pageSize, filteredTickets.length)} of {filteredTickets.length} tickets
                  {filteredTickets.length !== totalCount && ` (filtered from ${totalCount} total)`}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="h-8 text-xs border-[#e0e1dc] gap-1 hover:bg-[#f0f4f4]"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <span className="text-xs font-semibold px-2 text-[#222222]">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="h-8 text-xs border-[#e0e1dc] gap-1 hover:bg-[#f0f4f4]"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>

            {/* Quick Actions Flow Banner */}
            <div className="rounded-lg border border-[#e0e1dc] bg-white p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-[#005656] uppercase tracking-wider">
                  Next Step in Incident Pipeline
                </span>
                <h3 className="text-sm font-bold text-[#222222]">
                  Apply Automated Data Quality Gates to Ingested Tickets
                </h3>
                <p className="text-xs text-[#5e605d]">
                  Execute rule evaluation or create new validation logic in Step 01 (Data Quality Agent).
                </p>
              </div>
              <Link href="/dq-rules">
                <Button className="bg-[#a20a29] hover:bg-[#850821] text-white text-xs h-9 px-4 font-semibold shadow-xs">
                  Go to Step 01: Data Quality Agent →
                </Button>
              </Link>
            </div>
          </main>
        </div>
      </div>

      {/* Ticket Inspection Modal */}
      {selectedTicket && (
        <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
          <DialogContent className="max-w-2xl bg-white border-[#e0e1dc] text-[#222222]">
            <DialogHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-[#a20a29] text-white text-xs font-mono">
                  {selectedTicket.ticket_id}
                </Badge>
                {selectedTicket.dq_flag ? (
                  <Badge className="bg-[#fdf2f4] text-[#a20a29] border border-[#f5c2cb] text-xs">
                    DQ Defective
                  </Badge>
                ) : (
                  <Badge className="bg-[#f0f4f4] text-[#005656] border border-[#d0dede] text-xs">
                    DQ Verified Clean
                  </Badge>
                )}
                {selectedTicket.service && (
                  <Badge variant="outline" className="border-[#e0e1dc] text-xs">
                    {selectedTicket.service}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-base font-bold text-[#222222]">
                {selectedTicket.short_description || "ServiceNow Incident Detail"}
              </DialogTitle>
              <DialogDescription className="text-xs text-[#5e605d]">
                Opened on {selectedTicket.opened_at ? new Date(selectedTicket.opened_at).toLocaleString() : "Unknown"} • Caller: {selectedTicket.caller || "N/A"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-xs py-2">
              {/* DQ Flag Alert if defective */}
              {selectedTicket.dq_flag && (
                <div className="rounded-md border border-[#f5c2cb] bg-[#fdf2f4] p-3 text-[#a20a29] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4" />
                    Data Quality Defect Reason:
                  </div>
                  <p className="text-xs pl-5.5 leading-relaxed">
                    {selectedTicket.dq_reason || "Flagged by automated DQ rules."}
                  </p>
                </div>
              )}

              {/* Full Description */}
              <div className="space-y-1.5">
                <span className="font-bold text-[#5e605d] uppercase text-[10px] tracking-wide">
                  Full Ticket Description (PII Masked)
                </span>
                <div className="p-3 rounded-md border border-[#e0e1dc] bg-[#fbfbfb] text-xs leading-relaxed whitespace-pre-wrap font-mono">
                  {selectedTicket.description || "No description provided."}
                </div>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-md border border-[#e0e1dc] bg-white text-xs">
                <div>
                  <span className="text-[#5e605d] block text-[11px]">Priority:</span>
                  <span className="font-semibold text-[#222222]">{selectedTicket.priority || "Not specified"}</span>
                </div>
                <div>
                  <span className="text-[#5e605d] block text-[11px]">Assignment Group:</span>
                  <span className="font-semibold text-[#222222]">{selectedTicket.assignment_group || "Unassigned"}</span>
                </div>
                <div>
                  <span className="text-[#5e605d] block text-[11px]">Lifecycle Status:</span>
                  <span className="font-semibold text-[#222222]">
                    {selectedTicket.closed_at ? `Closed (${new Date(selectedTicket.closed_at).toLocaleDateString()})` : "Active / Unresolved"}
                  </span>
                </div>
                <div>
                  <span className="text-[#5e605d] block text-[11px]">PII Protection:</span>
                  <span className="font-semibold text-[#005656]">Presidio Masked at Ingest</span>
                </div>
              </div>

              {/* Resolution Notes if available */}
              {selectedTicket.resolution_notes && (
                <div className="space-y-1.5">
                  <span className="font-bold text-[#5e605d] uppercase text-[10px] tracking-wide">
                    Resolution Notes
                  </span>
                  <div className="p-3 rounded-md border border-[#e0e1dc] bg-[#fbfbfb] text-xs leading-relaxed">
                    {selectedTicket.resolution_notes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-[#e0e1dc]">
              <span className="text-[11px] text-[#5e605d]">
                DB Record: <code className="font-mono text-[#222222]">{selectedTicket.ticket_id}</code>
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTicket(null)}
                className="text-xs h-8 border-[#e0e1dc]"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
