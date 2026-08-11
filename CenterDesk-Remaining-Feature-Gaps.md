# CenterDesk vs. SmartDesk.API — Remaining Feature Gaps

**Purpose:** A fresh audit of `SmartDesk.API` (the single-tenant reference — "does what I expect the backend to do") against the current state of `CentralDesk.API`/`CenterDesk`, after this session's work landed resolution teams, ticket forwarding, sub-tickets, and permission-gated replies. This lists what's **still missing**, grouped by how big a gap it is.

Last updated: 2026-08-11

---

## 1. Already closed this session (for context — not gaps anymore)

These were the headline gaps in the original development spec and are now implemented (see `ACCOMPLISHED_TASKS.md` for the full write-up): resolution teams & subteams (CRUD + membership), ticket forwarding to a named team member, sub-tickets with an internal-only conversation, internal notes distinct from customer replies, and server-enforced permission-gated replies to the customer from a sub-ticket. Not repeated below.

---

## 2. Large gaps — entire feature areas with no equivalent at all

### Shift management & shift-based assignment
SmartDesk.API has `ShiftsController` / `ShiftService` (shift definitions, agent schedules, break tracking) plus two jobs that consume it: `AutoAssignTicketAfterShiftJob` (proactively reflows tickets when a shift ends, handing off anything whose assignee isn't on the incoming shift) and shift-aware round-robin at ticket-creation time (whichever eligible on-shift, not-on-break agent has gone longest since their last assignment).

CentralDesk.API has **none of this** — no `Shift` model, no controller, no service, no job. The permissions already exist and are completely unused: `CanViewShifts` (`0x60`), `CanCreateShift` (`0x61`), `CanUpdateShift` (`0x62`), `CanDeleteShift` (`0x63`), `CanManageShiftSchedules` (`0x64`), `CanUploadShiftSchedule` (`0x65`). Today, ticket assignment in CentralDesk.API is entirely manual (`POST /tickets/{uid}/assign`) — there's no auto-assignment of any kind, shift-aware or otherwise.

### Tenant-level reporting/analytics
SmartDesk.API has `ReportsController` / `ReportService` for agent/ticket performance reporting. CentralDesk.API has an `Admin/ReportsController`, but that's **system-admin-level** reporting (across tenants, for Parkway's own ops), not a tenant-facing "how is my team doing" report. `CanViewReports` (`0xA0`) and `CanExportReports` (`0xA1`) are defined in the tenant permission enum and completely unused — no tenant-scoped reporting endpoint exists at all.

### Partner management
SmartDesk.API has `PartnersController` / `PartnerService`. CentralDesk.API has `CanViewPartners` (`0xC0`) and `CanManagePartners` (`0xC1`) reserved in the permission enum but no model, service, or controller of any kind. (Unclear from the reference alone what a "partner" represents in this domain — worth a quick product clarification before building this one, rather than assuming it's the same concept SmartDesk.API means.)

### Tenant configuration & email-filter management
SmartDesk.API's `ConfigController` manages `EmailFilterConfiguration` (rules for auto-classifying/routing inbound mail — e.g., by sender domain or subject pattern) and general tenant config. CentralDesk.API **does** have an `EmailFilterConfiguration` model already in `TenantDbContext`, so the schema exists — but there's no service or controller to actually create/edit/list filter rules, and `EmailSyncJob` doesn't consult it (per the original spec: category/SLA are still set manually via `Categorise`, never automatically at intake). `CanManageEmailFilters` (`0xB3`) is defined and referenced only once, in the default-permission-seeding list for new tenants — never checked by any endpoint. `CanViewConfiguration` (`0xB0`) / `CanUpdateConfiguration` (`0xB1`) are likewise unused.

### CSAT / customer satisfaction surveys
SmartDesk.API has `SurveyEmailNotificationJob`, which sends a satisfaction-survey email after a ticket closes. CentralDesk.API's `Ticket` model already has `ClientFeedback` and `ClientRemark` fields ready to *receive* a customer's response — but nothing ever *sends* the survey request, so those fields are currently dead. This is a real, self-contained gap: the receiving half of the feature exists, the sending half doesn't.

### Attachment upload (outbound) and retrieval
SmartDesk.API has a `FileController` for serving attachment/inline-image bytes back to the frontend. CentralDesk.API has an `Attachment` model and shows attachment **metadata** (filename, size, content-type) in the message thread — but:
- There is no endpoint to actually download or view an attachment's bytes (the ticket detail page's attachment chips have nowhere to link to).
- There is no way for an agent to attach a file when composing an outbound reply — `ReplyMessageRequest` is text-only. Attachments today can only ever arrive via inbound IMAP mail; nothing lets an agent send one.

---

## 3. Medium gaps — features flagged in the original spec, still open

These were called out in `CenterDesk-MultiTenant-HelpDesk-Development-Spec.md` §4.4/§4.5/§10 (Phases 4–6) and remain untouched:

- **SLA depth.** `ServiceSla.ResponseTimeMinutes` (first-response SLA) still isn't read by `SlaCalculatorJob` — only resolution time is checked. `SlaStatus` is still only ever the literal string `"Breached"` (no "on track"/"at risk"/"paused" states). `SubTicket.SlaStatus` still isn't written to at all — sub-tickets get a hardcoded 24-hour due-date placeholder from this session's forwarding work, not a real SLA clock. No pause/resume behavior while a ticket waits on the customer.
- **Real-time notifications.** SmartDesk.API's SignalR hub (`NotificationHub`/`IHubClient`, per-user + broadcast groups) has no equivalent in CentralDesk.API at all. Ticket/message/sub-ticket updates only reach the frontend via polling.
- **"Awaiting customer" automation.** SmartDesk.API's `CloseAwaitingCustomerTickets` and `AwaitCustomerFeedbackReminderJob` jobs (auto-close or remind on a ticket that's been sitting in `PendingCustomer` with no reply) exist but are explicitly broken in the reference — their actual logic is commented out, and one has a hardcoded 2023 date guard. **Don't port their code**, but the underlying capability — "nudge or auto-close a ticket that's been waiting on the customer for N days" — is a legitimate gap in CentralDesk.API, which has no equivalent job of its own, working or not.
- **Business-hours-aware SLA math.** Both codebases currently compute due dates on naive calendar time (nights/weekends count against the clock). Worth deciding whether to fix this for real rather than carrying it forward, per the original spec's note on this being the common "MVP shortcut."

---

## 4. Frontend surface still missing for all of the above

None of Sections 2–3 have any frontend screen, which is expected since none of the backends exist yet. Once any of the above gets prioritized, the tenant app will need new feature folders for whichever land first (`shifts`, `reports`, `partners`, `config`/email-filter rules, and eventually a CSAT results view). The dedicated `sla` feature folder called out in the original spec (Phase 6) is also still not built — SLA management is still folded into `service-categories` on the frontend.

---

## 5. Quick-reference: permissions defined but still 100% unwired

| Permission bits | Feature area | Wired to anything? |
|---|---|---|
| `0x60–0x65` (`CanViewShifts` … `CanUploadShiftSchedule`) | Shifts | No |
| `0xA0–0xA1` (`CanViewReports`, `CanExportReports`) | Tenant reporting | No (only an admin-level reports controller exists, different scope) |
| `0xB0–0xB1` (`CanViewConfiguration`, `CanUpdateConfiguration`) | Tenant config | No |
| `0xB3` (`CanManageEmailFilters`) | Email filter rules | Referenced once, in default-permission seeding only — never checked |
| `0xC0–0xC1` (`CanViewPartners`, `CanManagePartners`) | Partners | No |

Every one of these already has a real counterpart implemented in `SmartDesk.API` (`ShiftsController`, `ReportsController`, `ConfigController`, `PartnersController`) — so, same as the forwarding/sub-ticket work from this session, these are "shovel-ready" gaps with a working reference to build against, not blank-page design problems.

---

## 6. Suggested next priority, if you want a recommendation

Of everything above, **shift-based assignment** and **SLA depth** are the two most likely to be felt operationally soonest (an agent-facing helpdesk without either quickly becomes "whoever notices the ticket first" and "nobody knows what's actually breaching"). **Real-time notifications** would meaningfully improve the experience of the forwarding workflow just shipped, since right now a resolution-team member only finds out about a new sub-ticket by polling or refreshing. Reports, partners, and email-filter config feel more like "nice to have before general availability" than "blocking anyone's core workflow today" — but that's a product call, not something the code tells you on its own.
