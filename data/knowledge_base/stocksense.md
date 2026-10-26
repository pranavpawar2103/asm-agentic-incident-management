# StockSense — Application Support Knowledge Base

| Field | Value |
|---|---|
| Application ID | APP-STK |
| Business function | Warehouse management: goods receipt, stock levels, picking, packing, shipping labels |
| Business owner | Head of Supply Chain |
| Support group | AMS-SupplyChain |
| Criticality tier | **Tier 1** (warehouse operations stop if unavailable) |
| Support hours | 24x7 (warehouses run 3 shifts) |
| Users | ~350 warehouse staff across 3 sites (Pune, Chennai, Nagpur), 900 handheld scanners |
| Tech stack | .NET 8, SQL Server 2022, Android handheld scanners (MDM managed), Zebra label printers via print server |
| Upstream | OrderHub (orders to fulfil), Procurement (purchase orders) |
| Downstream | Carrier APIs (shipments), BillingEngine (shipped orders) |

> **Info:** If an entire warehouse site cannot pick, pack or ship, treat as **P1**. Single device issues are P3/P4.

---

## Known issues and resolutions

### KB-STK-001 — Handheld scanner cannot sync (SYNC-ERR-12)

**Symptoms**
- Scanner shows `SYNC-ERR-12: device not registered` and cannot download pick lists.
- Usually after an Android OS update pushed by MDM.

**Root cause**
The OS update resets the device certificate; the device is no longer trusted by the StockSense sync service.

**Resolution steps**
1. Get the device ID (sticker on the back, format `HHD-<site>-<number>`).
2. In the MDM console, find the device and click *Re-enroll / Push certificate*.
3. On the device, open StockSense → *Settings → Re-register*.
4. Confirm the pick list downloads.
5. If many devices at one site are affected, pause the MDM OS update ring for that site.

**Escalation:** P3 per device; P1 if most devices at a site are affected.

---

### KB-STK-002 — Stock mismatch between StockSense and OrderHub

**Symptoms**
- Website shows item in stock but warehouse has none (or vice versa).
- Overselling complaints from customer service.

**Root cause**
Nightly reconciliation job `STK_RECON_NIGHTLY` failed (usually a deadlock on the `stock_ledger` table) so stock levels were not published to OrderHub.

**Resolution steps**
1. Check SQL Agent job history for `STK_RECON_NIGHTLY`.
2. Re-run the job manually outside picking peak (avoid 06:00–09:00).
3. Run the `stock-publish` endpoint to push levels to OrderHub: `POST /api/stock/publish?full=true`.
4. Spot-check 5 SKUs reported by customer service.

**Escalation:** P2 (overselling risk). Inform AMS-Commerce.

---

### KB-STK-003 — Shipping labels not printing

**Symptoms**
- Packing station shows "Label sent to printer" but nothing prints.
- Print server queue for the station shows jobs stuck in `Spooling`.

**Root cause**
Print spooler hangs on the print server, or the Zebra printer has a paper/ribbon error.

**Resolution steps**
1. Ask the station user to check the printer for paper/ribbon lights.
2. On the print server, clear the stuck queue and restart the *Print Spooler* service.
3. Reprint from StockSense → *Packing → Reprint label*.
4. If one printer keeps failing, reassign the station to the backup printer.

**Escalation:** P3 per station; P2 if the whole packing area is blocked.

---

### KB-STK-004 — Goods receipt cannot be posted ("PO locked by another user")

**Symptoms**
- Receiving clerk gets "Purchase order <PO number> is locked by user <name>" when posting goods receipt.
- The named user is not working on it (logged off / shift ended).

**Root cause**
Stale record lock left behind when the scanner session dropped mid-transaction.

**Resolution steps**
1. Confirm with the named user (or shift lead) that they are not editing the PO.
2. StockSense Admin → *Locks → Search by PO* → release the lock.
3. Ask the clerk to retry posting.

**Escalation:** None. P3 (P2 if a truck is waiting at the dock).

---

### KB-STK-005 — Inventory report export times out

**Symptoms**
- Exporting the inventory movement report to Excel shows "Request timeout" for large date ranges.

**Root cause**
Synchronous export is limited to 60 seconds; ranges over ~31 days exceed it.

**Resolution steps**
1. Advise the user to use *Export → Schedule (async)*; the file is emailed when ready.
2. Alternatively, split the date range into monthly exports.
3. For regular large extracts, suggest the InsightBI inventory dashboard.

**Escalation:** None. P4.

---

## Escalation contacts

| Level | Team | When |
|---|---|---|
| L2 | AMS-SupplyChain | All issues in this page |
| L3 | WMS Dev team | Code defects, DB deadlocks |
| Partner | End-User Computing (MDM) | Device enrollment, OS updates |
| Business | Head of Supply Chain / Site managers | Site-level outages |
