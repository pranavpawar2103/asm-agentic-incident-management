# OrderHub — Application Support Knowledge Base

| Field | Value |
|---|---|
| Application ID | APP-ORD |
| Business function | Customer order capture, checkout, payment, order status, fulfilment hand-off |
| Business owner | E-Commerce Director |
| Support group | AMS-Commerce |
| Criticality tier | **Tier 1** (direct revenue impact, customer facing) |
| Support hours | 24x7 |
| Users | External customers (~20k orders/day), 60 internal customer-service agents |
| Tech stack | Node.js microservices on Kubernetes, PostgreSQL 15, Kafka, Stripe payment gateway |
| Upstream | Product catalogue, Stripe (payment webhooks) |
| Downstream | StockSense (warehouse orders), BillingEngine (invoices), notification-service (emails) |

> **Info:** Any issue blocking checkout for more than 5% of customers is **P1**. Peak hours: 18:00–23:00 local time and all sale events.

---

## Architecture overview

- **order-api** — checkout and order REST API (HPA: 4–20 pods).
- **payment-service** — Stripe integration; receives payment webhooks at `/webhooks/stripe`.
- **notification-service** — Kafka consumer of `order-events`, sends confirmation emails.
- **order-export** — pushes paid orders to StockSense every 5 minutes.
- **OrderHub Admin** — internal UI for customer service (cancel, refund, resend).

---

## Known issues and resolutions

### KB-ORD-001 — Orders stuck in "Pending Payment"

**Symptoms**
- Customer has been charged (bank/Stripe shows success) but order status stays `PENDING_PAYMENT`.
- payment-service logs: `WEBHOOK_TIMEOUT` or `signature verification failed`.

**Root cause**
Stripe webhooks were not received or were rejected (network blip, rotated webhook secret).

**Resolution steps**
1. Search the order in OrderHub Admin and note the Stripe payment intent ID.
2. In Stripe dashboard → *Developers → Webhooks*, check failed deliveries and click **Resend** for affected events.
3. If many orders are affected, run `node scripts/reconcile-payments.js --since "<timestamp>"`.
4. If logs show signature failures, verify `STRIPE_WEBHOOK_SECRET` matches the dashboard and redeploy payment-service.
5. Confirm order moves to `PAID` and is exported.

**Escalation:** P2 for a handful of orders; P1 if all new orders are affected.

---

### KB-ORD-002 — Order confirmation emails not received

**Symptoms**
- Customers report no confirmation email; orders are otherwise `PAID`.
- Kafka consumer group `notification-service` shows growing lag on `order-events`.

**Root cause**
notification-service consumer hangs after an SMTP provider timeout and stops polling.

**Resolution steps**
1. Check lag: `kafka-consumer-groups --describe --group notification-service`.
2. Restart: `kubectl rollout restart deploy/notification-service -n commerce`.
3. Lag should drain within 10–15 minutes; emails are sent for queued events automatically.
4. For specific customers, use OrderHub Admin → *Resend confirmation*.

**Escalation:** P3 normally. P2 if lag > 2 hours.

---

### KB-ORD-003 — Checkout fails with HTTP 503 / "Something went wrong"

**Symptoms**
- Customers get "Something went wrong, please try again" at the payment step.
- Monitoring alert: `order-api 5xx rate > 5%`; pods restarting with `OOMKilled`.
- Usually during sale events or peak hours.

**Root cause**
order-api pods exceed memory limits under load; HPA max replicas reached.

**Resolution steps**
1. Check pods: `kubectl get pods -n commerce -l app=order-api`.
2. Temporarily scale: `kubectl scale deploy/order-api --replicas=30 -n commerce`.
3. Raise HPA max via emergency change if peak continues.
4. Monitor 5xx rate on the Grafana "Checkout" dashboard until < 0.5% for 15 minutes.
5. Open a problem ticket for capacity review.

**Escalation:** **P1** — customer facing revenue loss. Inform E-Commerce Director and start major incident bridge.

---

### KB-ORD-004 — Duplicate orders created

**Symptoms**
- Customer sees two identical orders and two charges.
- Orders created within a few seconds of each other with the same cart contents.

**Root cause**
Client retries on slow network without the idempotency key (older mobile app versions < 4.2).

**Resolution steps**
1. Confirm both orders are identical (items, amount, timestamp within 10 seconds).
2. Cancel the later order in OrderHub Admin with reason *Duplicate*; this triggers an automatic refund.
3. Inform the customer that the refund takes 5–7 business days.
4. Note the app version in the ticket; if > 4.2, raise a defect to the Commerce Dev team.

**Escalation:** P3.

---

### KB-ORD-005 — Orders not exported to warehouse (ORDX-409)

**Symptoms**
- Paid orders do not appear in StockSense; customer reports order not shipped.
- order-export logs: `ORDX-409: SKU <code> not found in warehouse master`.

**Root cause**
A new product was published in the catalogue before its SKU was created in the StockSense item master.

**Resolution steps**
1. Collect the failing SKU codes from order-export logs.
2. Ask the Supply Chain team to create the SKU in StockSense (or trigger item master sync `STK_ITEM_SYNC`).
3. Reprocess failed exports: OrderHub Admin → *Exports → Retry failed*.
4. Confirm orders are visible in StockSense pick lists.

**Escalation:** P2 (shipping SLA risk). Involve StockSense support group AMS-SupplyChain.

---

## Escalation contacts

| Level | Team | When |
|---|---|---|
| L2 | AMS-Commerce | All issues in this page |
| L3 | Commerce Dev team | Code defects, idempotency issues |
| Vendor | Stripe support | Gateway outages |
| Business | E-Commerce Director | Any P1 |
