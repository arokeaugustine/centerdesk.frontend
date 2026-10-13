# CenterDesk — Remaining Feature Gaps

**Purpose:** A fresh, code-verified audit of `CentralDesk.API` + `CenterDesk` (tenant app), done by staging and reading the actual current source (not by re-reading older docs). The prior version of this document (dated 2026-08-11) was written before shifts, partners, email filters, reports, teams/sub-tickets, and real-time notifications were built, and had gone stale — several items it listed as "not built at all" are now done. This replaces it.

Last verified: 2026-08-18, against the live source on the user's machine.

---

## 1. The core requested workflow — done

Email intake → categorise → SLA attaches → forward to a resolution-team member (who may belong to a subteam) → a sub-ticket is created → permission-gated reply to the external customer, distinct from internal collaboration. Verified in code: `TicketsController.Forward`, `SubTicketService` (forward/reply/close/return/reply-to-customer), `ResolutionTeamsController` (full CRUD + membership), `Message.IsInternal`, and the closure-cascade rule (`ReplyToCustomerAsync` cascades to closing the parent ticket; the plain `CloseAsync` deliberately does not — this is explicit and commented in code, not an accidental side effect).

## 2. Previously-flagged "entire feature area missing" items — also done

Shift management (`ShiftsController`/`ShiftService`/`ShiftReflowJob`, plus bulk CSV upload), tenant-facing reporting (`ReportsController` at `api/reports`, distinct from the system-admin one), partner management (`PartnersController`/`PartnerService`), email filter configuration (`EmailFiltersController`/`EmailFilterService`, consulted live by `EmailSyncJob`), and a real-time SignalR notification layer (`NotificationHub`, per-user groups) are all implemented and wired to permissions correctly. CSAT is also fully built end-to-end — this was previously flagged as "receiving half exists, sending half doesn't"; that gap is closed: `CsatSurveyJob` sends a one-click star-rating email 15 minutes after a ticket closes, and `CsatController` (anonymous, public) receives the rating via `GET` (one-click) or `POST` (richer form).

Attachment handling is also further along than previously documented: `AttachmentsController` has both a `GET /attachments/{uid}` download/stream endpoint and a `POST /tickets/{ticketUid}/messages/{messageUid}/attachments` upload endpoint (gated by `CanReplyTicket`), so agents can attach files to outbound replies, not just receive them from inbound mail. (The ticket-detail-page frontend wiring for the upload control specifically could not be re-verified this pass — see §5.)

## 3. Confirmed still-open gaps

These were checked directly against current source, not carried forward from assumption:

- **Email-filter auto-categorisation never sets the sub-category.** `EmailSyncJob.EvaluateFiltersAsync`'s `FilterResult` only carries `ServiceCategoryId`; the `SetCategory:{uid}` action resolves and sets only the top-level category. Since SLA timeframes now live on `ServiceSubCategory` (this session's simplification), a ticket auto-categorised by an email filter still never gets an SLA — only the manual "Categorise" action on the ticket detail page sets both ids. This is a one-line-of-intent bug: the fix is to let the filter's `SetCategory:{uid}` action optionally target a sub-category uid too.
- **SLA due-date math is still naive calendar time.** `SlaCalculatorJob` computes `elapsedMinutes` as plain `now - ticket.CreatedAt` (minus paused time) — nights and weekends still count against the clock. No business-hours calendar exists anywhere in the codebase.
- **No "awaiting customer" nudge/auto-close automation.** There is no job that reminds an agent or auto-closes a ticket that's been sitting in `PendingCustomer` for N days — confirmed by the job list (`CsatSurveyJob`, `EmailSyncJob`, `ShiftReflowJob`, `SlaCalculatorJob`, `SubscriptionRenewalJob` — no fifth "reminder" job exists).
- **Sub-ticket SLA is still a flat due-date check, not a real per-team clock.** `SlaCalculatorJob.ProcessSubTicketsAsync` just compares `now` against `SubTicket.DueDate` (set once at forward-time) — there's no `OnTrack`/`AtRisk` nuance beyond a single 80%-elapsed threshold, and no per-team-configurable escalation SLA (§11 decision 3 in the original dev spec was never explicitly resolved — the reference behavior of "inherit/share a flat placeholder" was implicitly chosen by default rather than a distinct team SLA being built).
- **No tenant-level configuration screen or API at all.** `AppConfiguration` rows (e.g. the `sla_enabled` flag `SlaCalculatorJob` reads) are seeded once at tenant provisioning (`ITenantProvisionService`) and then **never exposed to read or update again** — there's no `ConfigController`, no service, and the frontend's `settings` feature folder is still a literal stub page (28 bytes of HTML). A tenant admin cannot toggle SLA tracking on/off, or manage any other tenant-level setting, through the app today. `CanViewConfiguration` is at least reused to gate viewing email filters; `CanUpdateConfiguration` gates nothing at all.
- **No report export.** `CanExportReports` is seeded as a permission but checked by no endpoint — `ReportsController` (tenant) has exactly one route, `GET /overview`. There's no CSV/PDF export of the report data despite the permission existing for it.
- **Real-time notifications are per-user only, not per-team.** `NotificationHub.OnConnectedAsync` only ever joins a `tenant-{id}-user-{id}` group. The original dev spec (§7.7) called out adding a per-team group as a specific improvement over the reference system, so a whole subteam could see an unclaimed sub-ticket land — that was never built; only the already-assigned member gets notified.
- **`CanEscalateTicket` is a fully dead permission bit.** It's seeded for new tenants and defined in both the backend and frontend enums, but no controller, service, or UI action anywhere implements a distinct "escalate" concept — `Forward` (`CanForwardTicket`) is the only mechanism that exists. Likely superseded by the forward/sub-ticket workflow and safe to leave as reserved, but worth knowing it does nothing if someone assigns it expecting an effect.
- **The four SLA permission bits (`CanViewSla`/`CanCreateSla`/`CanUpdateSla`/`CanDeleteSla`) are dead**, left over from this session's collapse of the standalone SLA page into two fields on `ServiceSubCategory` — documented already in `ACCOMPLISHED_TASKS.md`.
- **Business-hours-aware SLA math being absent** and **no escalation-specific SLA field** were both flagged as open decisions in the original dev spec's §11 and were never explicitly revisited — they're carried forward here rather than newly discovered, but confirmed still true against current code.

## 4. Known code-quality inconsistencies (not missing features, but worth a cleanup pass)

- Several endpoints bypass the app's `SuccessResult<T>`/`ApiResult<T>` envelope and return raw ASP.NET results instead — `MessagesController.MarkAsRead`/`MarkAllRead` return `NoContent()` directly, matching the same pattern already noted elsewhere (category/shift deactivate endpoints). Harmless functionally, but inconsistent for frontend error handling.
- `SubTicket`/`Ticket` SLA status is a free-form `string` (`"OnTrack"`/`"AtRisk"`/`"Breached"`/`"FirstResponseBreached"`/`"Paused"`) rather than an enum — works, but nothing stops a typo'd status string from silently failing to match frontend display logic.

## 5. What could not be re-verified this pass

The device's on-machine bash workspace was unavailable for most of this review (it failed to boot, then the device briefly disconnected entirely), and the file-staging tool intermittently failed for a handful of specific frontend files (`ticket-detail-page.ts`, `report-page.ts`, `dashboard-page.ts`) even after retries, while succeeding for every backend file and one frontend file (`auth.models.ts`). Backend coverage in this document is high-confidence — every controller, every service interface, every job, and the full permission enum were read directly from current source. Frontend coverage relied on a full recursive directory listing (file names, sizes, and modified-times, which confirms which pages are still stub-sized vs. built) plus this session's own prior direct edits, but a few individual frontend files couldn't be freshly re-read to double-check their exact current contents:

- `ticket-detail-page.ts` — believed to fully implement Categorise, internal notes, forward, and the sub-tickets panel (all built and delivered directly in this conversation), but the attachment-upload control specifically wasn't re-confirmed as wired to the new `AttachmentsController.Upload` endpoint.
- `report-page.ts` / `dashboard-page.ts` — directory-listing file sizes (3.4KB/5.5KB for reports, well-formed; 958 bytes for dashboard) are consistent with "reports is a real page, dashboard is still minimal," matching the original dev spec's note that the dashboard was a stub, but this wasn't confirmed by reading the file contents directly this pass.

Re-run this check once the device connection is stable if you want those closed out with full confidence.
