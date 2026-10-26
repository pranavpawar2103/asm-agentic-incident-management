# EmployeePortal — Application Support Knowledge Base

| Field | Value |
|---|---|
| Application ID | APP-EMP |
| Business function | Intranet, single sign-on (SSO) to all apps, leave requests, employee profile |
| Business owner | Digital Workplace Manager |
| Support group | AMS-Workplace |
| Criticality tier | **Tier 2** — but **SSO login is Tier 1** (blocks access to every other application) |
| Support hours | 24x7 for SSO, business hours for other features |
| Users | All ~5,000 employees |
| Tech stack | React front end, .NET API, Azure AD / SAML 2.0 identity provider, Elasticsearch (search), MFA via SMS + authenticator app |
| Downstream | SSO to PayrollPro, SalesConnect CRM, StockSense, BillingEngine, InsightBI |

> **Info:** If SSO is down for multiple users, treat it as **P1** — check other applications for login reports before assuming a single-user problem.

---

## Known issues and resolutions

### KB-EMP-001 — SSO login loop / "SAML response invalid"

**Symptoms**
- User is redirected back to the login page repeatedly after entering credentials.
- Error page: `AADSTS50011` / "SAML response invalid or signature expired".
- Multiple applications fail at the same time.

**Root cause**
Either the SAML signing certificate expired / was rotated without updating the service provider, or the user's device clock is off by more than 5 minutes.

**Resolution steps**
1. Check how many users are affected (service desk dashboard, monitoring).
2. **Many users:** check the SAML certificate expiry in the IdP admin portal. If expired/rotated, upload the new certificate metadata to the affected service providers (emergency change).
3. **Single user:** ask the user to sync the device clock (Windows: *Settings → Time → Sync now*), clear cookies, and retry in a private window.
4. Confirm login works for at least one affected user per application.

**Escalation:** P1 for multi-user outage — Identity team on-call. P4 for single user.

---

### KB-EMP-002 — MFA code (OTP) not received

**Symptoms**
- User does not receive the SMS one-time password; cannot complete login.
- Common for users travelling abroad or after a phone number change.

**Root cause**
SMS provider delivery delays or outdated mobile number in profile.

**Resolution steps**
1. Verify user identity via manager or employee ID + date of joining.
2. In the IdP admin portal, issue a **Temporary Access Pass** (valid 8 hours).
3. Guide the user to register the authenticator app as the primary MFA method.
4. If many users report it, check the SMS provider status page.

**Escalation:** P3 single user; P2 if SMS provider outage affects many users.

---

### KB-EMP-003 — Leave request stuck in "Pending Approval"

**Symptoms**
- Leave request shows "Pending approval" for days; manager says they have nothing to approve.
- Usually after the manager left the company or the employee changed team.

**Root cause**
The workflow is assigned to the old approver; it is orphaned after the reporting line changes.

**Resolution steps**
1. Portal Admin → *Workflows → Search by request ID*.
2. Check the current approver; if inactive or incorrect, click *Reassign* and select the new manager.
3. Notify the new manager to approve.
4. If the leave date has passed, HR can approve retroactively.

**Escalation:** None. P4.

---

### KB-EMP-004 — Portal is slow / search times out

**Symptoms**
- Pages take > 10 seconds to load; search shows "Request timed out".
- Happens mostly on Monday mornings.

**Root cause**
Weekly Elasticsearch index rebuild overruns into business hours.

**Resolution steps**
1. Check the index job status in Portal Admin → *Search → Index status*.
2. If a rebuild is running, let it finish (approx. 30 minutes) or pause it and reschedule to the weekend.
3. Clear the portal cache: Portal Admin → *Maintenance → Flush cache*.
4. Monitor the response time dashboard.

**Escalation:** P3. P2 if the portal is completely unavailable.

---

### KB-EMP-005 — Profile photo upload fails

**Symptoms**
- "Upload failed" when changing profile photo.

**Root cause**
Only JPG/PNG under 2 MB are supported; HEIC (iPhone) images are rejected.

**Resolution steps**
1. Ask the user to convert the image to JPG/PNG and resize under 2 MB.
2. Retry upload; the photo syncs to Teams/Outlook within 24 hours.

**Escalation:** None. Cosmetic issue — **P5 / Planning** regardless of reported priority.

---

## Escalation contacts

| Level | Team | When |
|---|---|---|
| L1 | Service Desk | Single-user login, MFA resets |
| L2 | AMS-Workplace | All issues in this page |
| L3 | Identity team | SAML certificates, IdP configuration |
| Business | Digital Workplace Manager | Multi-user SSO outages |
