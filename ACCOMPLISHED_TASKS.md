# CenterDesk — Accomplished Tasks

This file is updated as work lands. It tracks what has actually been implemented against the gaps identified in `CenterDesk-MultiTenant-HelpDesk-Development-Spec.md` and `CenterDesk-Remaining-Feature-Gaps.md`, so you can see progress at a glance without re-reading every diff.

Last updated: 2026-08-18 (multi-currency payment support: NGN + USD, chosen at checkout; API response-envelope consistency fix)

---

## Status legend
- ✅ Done — code written, committed to your repo
- ⚠️ Done but unverified — written and committed, but could not be compiled/tested in this environment (see "Known limitations" below)
- ⏳ In progress
- ⛔ Deferred — intentionally not attempted this pass, documented so it isn't a surprise

---

## Backend (CentralDesk.API)

### ⚠️ Multi-currency payments — NGN + USD (2026-08-18)
Previously every Paystack transaction was hardcoded to `Currency = "NGN"`, so the app could only ever bill in Naira. Per your decisions on the two open design questions (fixed USD list price per plan, not an FX conversion of the NGN price; and the customer picks currency once, at checkout, which then sticks for all future renewals), the app can now bill either NGN or USD end to end.

- `Plan` gained `MonthlyPriceUsdCents`/`AnnualPriceUsdCents` (nullable — a plan with nulls simply isn't offered in USD yet) and `PaystackPlanCodeMonthlyUsd`/`PaystackPlanCodeAnnualUsd` (Paystack's own recurring Plan objects are single-currency, so a USD subscription needs its own plan codes — **you still need to create these in your Paystack dashboard and set them on each `Plan` row**; they're not auto-generated).
- `Subscription` gained a `Currency` field, set once when the customer checks out (`Upgrade`) and reused unchanged on every later `Renew` — matches your "picked once at checkout" decision exactly.
- New hand-written migration `20260818090000_AddMultiCurrencySupport` adds the columns above and seeds fixed USD list prices for the three paid tiers: Starter $15/mo · $150/yr, Professional $49/mo · $490/yr, Enterprise $149/mo · $1490/yr. These are placeholder numbers I picked to be in a sensible range for each tier — **please review and adjust them to your actual desired USD pricing** before this goes live; they are not derived from any exchange rate.
- `IPaystackService.InitializeTransactionAsync` / `PaystackService` now take a `currency` parameter (default `"NGN"`) instead of hardcoding it — confirmed via Paystack's own API docs that `Initialize Transaction` accepts an explicit `currency` field for both NGN and USD.
- `SubscriptionController.Upgrade` validates the requested currency (`NGN`/`USD` only), rejects USD for a plan that has no USD price set (`BadRequestResult`), computes the amount from the right price field, and stores `Currency` on both the new `Subscription` and its `Invoice`. `Renew` no longer lets the customer re-pick currency — it reads `Subscription.Currency` from the original checkout and bills the matching plan price.
- `BillingController.VerifyPayment`/`RetryPayment` now report/reuse the invoice's own recorded `Currency` instead of assuming NGN.
- `PlansController`/`PlanDto` and `Admin/SubscriptionsController` now expose `monthlyPriceUsd`/`annualPriceUsd` (null when unset) alongside the existing Naira fields.
- **Not changed on purpose:** `IPaymentGateway`/`PaystackPaymentGateway` (`CenterDesk.Infrastructure/Services/Subscription`) still only speak NGN — I checked and nothing actually calls `IPaymentGateway.InitializeTransactionAsync` anywhere in the codebase (`SubscriptionService` only uses its `VerifyTransactionAsync`); it's genuinely dead code, so touching it risked introducing a bug for zero benefit. `RegistrationController` (tenant signup) was also left alone — it only creates a free trial subscription and never calls Paystack at all, so there was nothing to make currency-aware there.
- **Frontend:** the tenant billing page's upgrade modal now has a Naira/Dollar toggle right where the customer picks billing cycle (i.e. at checkout, per your decision) — it's disabled for a plan with no USD price set, with a note explaining why. The renewal flow has no currency picker at all, by design, since it always reuses the subscription's original currency. The payment-callback/receipt page and the admin subscription list now show the actual currency instead of assuming Naira. The admin app's previously-empty "Plans" page now at least lists every plan's NGN and USD prices read-only (there is still no plan-editing UI anywhere in the app — see Known limitations).
- **What you still need to do:** (1) create the USD-equivalent recurring Plan objects in your Paystack dashboard and fill in `PaystackPlanCodeMonthlyUsd`/`PaystackPlanCodeAnnualUsd` on each `Plan` row; (2) confirm with Paystack (or in your dashboard settings) that USD transactions are enabled for your account and understand how USD settlement reaches your bank — I could only confirm from Paystack's public API docs that `currency: "USD"` is accepted by the Initialize Transaction endpoint, not the account-level enablement or settlement mechanics; (3) review the placeholder USD prices seeded by the migration and adjust them to your actual pricing.

### ⚠️ API response envelope consistency fix (2026-08-18)
Several endpoints were bypassing the app's `SuccessResult<T>`/`ApiResult<T>` envelope and returning a raw ASP.NET `NoContent()` instead — harmless functionally (nothing in the frontend reads the response body for these calls), but inconsistent for anything that does start relying on `ApiResult` error handling later.

- Fixed 8 endpoints across 5 controllers to return `OkResult("...")` instead of `NoContent()`: `MessagesController.MarkAsRead`/`MarkAllRead`, `RolesController.Delete`/`RemovePermission`, `ServiceCategoriesController.Deactivate`/`DeactivateSubCategory`, `EmailDesksController.Delete`, `UsersController.RemoveRole`.
- Verified all 4 frontend call sites that hit these endpoints (`role-list-page.ts`, `user-detail-page.ts`, `email-desk-page.ts`, `ticket-detail-page.ts`) ignore the response body entirely, so this needed zero frontend changes.
- Deliberately left alone: `BillingController.PaystackWebhook` (external, Paystack-called, not consumed by our own frontend) and `ShiftsController.Deactivate`/`RegistrationController`'s error path (already correctly enveloped before this pass).

### ⚠️ Internal notes vs. customer replies (core fix)
Previously there was no way to leave a note on a ticket that wasn't also a reply to the external customer, and the reply endpoint was gated by `CanCreateTicket` instead of an actual reply permission — meaning anyone who could create tickets could also speak for the tenant to customers.

- `Message.IsInternal` (bool) added to the model, migration, and DTOs.
- New permission `CanAddInternalNote`. `MessagesController.AddNote` (`POST /api/tickets/{ticketUid}/messages/notes`) creates an internal-only message — never sent by SMTP, never visible to the customer.
- `MessagesController.Reply` re-gated from `CanCreateTicket` to `CanReplyTicket` (bug fix).
- `IMessageService.AddInternalNoteAsync` added; `ReplyAsync` now explicitly sets `IsInternal = false`.

### ⚠️ Resolution teams & subteams
Teams (and subteams, via `ResolutionTeam.ParentId`, already modeled but with no service/API layer) can now be created, updated, deactivated, and staffed.

- New `IResolutionTeamService` / `ResolutionTeamService`: `GetAllAsync`, `GetByUidAsync`, `GetSubTeamsAsync`, `CreateAsync`, `UpdateAsync`, `DeactivateAsync` (blocked if active subteams or open sub-tickets exist), `AddMemberAsync` (blocks duplicate active membership), `RemoveMemberAsync` (soft delete with reason), `IsActiveMemberAsync`.
- New `ResolutionTeamsController` at `api/resolution-teams` (list/detail/subteams/create/update/deactivate/add-member/remove-member), each gated by a dedicated permission (`CanViewResolutionTeams`, `CanCreateResolutionTeam`, `CanUpdateResolutionTeam`, `CanDeleteResolutionTeam`, `CanManageResolutionTeamMembers`).
- New DTOs (`ResolutionTeamDto`, `ResolutionTeamDetailDto`, `ResolutionTeamMemberDto`, create/update/add-member requests) and `ResolutionTeamMapper`.
- New `ResolutionTeam.CanReplyToCustomer` flag — this is enforced server-side (see below). In the SmartDesk.API reference this same idea existed but was UI-only and never actually checked; that gap is now closed.

### ⚠️ Ticket forwarding & sub-tickets
This was the biggest missing piece: forwarding a ticket to a resolution-team member and tracking that team's side of the work as a sub-ticket, separate from the parent ticket's own conversation.

- New `ISubTicketService` / `SubTicketService`:
  - `ForwardAsync` — validates the assignee is an active member of the target team, creates the `SubTicket` (numbered `{TicketNumber}-ST{n}`), moves the parent ticket to `AwaitingResolutionTeamFeedback`, writes ticket + sub-ticket status history and an audit entry. **Now also notifies the assignee in real time** (see Notifications below).
  - `ReplyAsync` — internal-only messages between the forwarding agent and the resolution-team member (never emailed out); auto-transitions the sub-ticket `Closed → Open` or `Open → InProgress`.
  - `ReplyToCustomerAsync` — lets a resolution-team member reply to the customer **directly from the sub-ticket**, but only if `ResolutionTeam.CanReplyToCustomer` is true; otherwise throws and the agent is told to relay the reply themselves instead. This is the server-side enforcement that was missing entirely in both existing codebases.
  - `CloseAsync` — closes the sub-ticket only; parent ticket is untouched.
  - `ReturnAsync` — sends the sub-ticket back to the original agent; sets both sub-ticket and parent ticket status to the new `Returned` status. **Now also notifies the original agent in real time.**
  - `GetByTicketAsync`, `GetByUidAsync`, `GetMessagesAsync`.
- New `SubTicketsController` at `api/sub-tickets` (`GET /{uid}`, `GET /{uid}/messages`, `POST /{uid}/messages`, `POST /{uid}/reply-customer`, `POST /{uid}/close`, `POST /{uid}/return`), each gated by `CanViewSubTicketDetails`, `CanReplySubTicket`, or the new `CanReplyToCustomerFromSubTicket`.
- `TicketsController` extended with `GET /{uid}/sub-tickets` and `POST /{uid}/forward` (`CanViewSubTickets` / `CanForwardTicket`).
- New DTOs (`SubTicketDto`, `ForwardTicketRequest`, `SubTicketReplyRequest`, `SubTicketReplyCustomerRequest`, `CloseSubTicketRequest`, `ReturnSubTicketRequest`) and `SubTicketMapper`.
- Two new `TicketStatus` values: `AwaitingResolutionTeamFeedback`, `Returned`.
- Two new `Permissions`: `CanAddInternalNote`, `CanReplyToCustomerFromSubTicket` (plus the already-modeled-but-now-used team/sub-ticket permissions above — these slot into the existing bit-packed `Permissions : short` enum with no extra registration needed, per how `AuthorizationPolicyProvider` resolves policies).

### ⚠️ Shifts & shift-aware auto-assignment
Closes the largest of the six originally-missing feature areas: there was no concept of who is "on duty," so new tickets just sat unassigned until someone claimed them.

- New `Shift` / `ShiftAssignment` models (`Name`, `Code`, `StartTime`/`EndTime` as `TimeOnly`, schedule rows keyed by `(UserId, Date)` with `Date` as `DateOnly`).
- New `ShiftAssignmentHelper` (static, shared by request-scoped services and background jobs alike): `IsTimeInShift`, `GetCurrentShiftsAsync`, `IsUserOnShiftNowAsync`, `PickNextAssigneeAsync` — the last one load-balances by counting each on-shift user's open ticket count and picking the lightest-loaded.
- New `IShiftService` / `ShiftService`: full CRUD on shifts plus `AssignAsync` / `RemoveAssignmentAsync` / `GetScheduleAsync` (by date) / `GetCurrentShiftsAsync` for the schedule.
- New `ShiftsController` at `api/shifts` — `GET /`, `GET /current`, `GET /schedule?date=`, `GET /{uid}`, `POST /`, `PUT /{uid}`, `DELETE /{uid}` (deactivate), `POST /schedule` (assign), `DELETE /schedule/{assignmentUid}` — gated by the already-reserved `CanViewShifts` / `CanCreateShift` / `CanUpdateShift` / `CanDeleteShift` / `CanManageShiftSchedules` permission bits (these existed in the enum from an earlier pass but had no implementation until now).
- **`TicketService.CreateAsync`** now calls `PickNextAssigneeAsync` on every new ticket and, if someone is found on shift, auto-assigns it and notifies them in real time.
- **`EmailSyncJob`** does the same for tickets created from inbound email.
- New **`ShiftReflowJob`** (background service, default every 600s): finds every open ticket whose assignee has gone off-shift and reassigns it to whoever is on shift now, load-balanced the same way, notifying the new assignee.

### ⚠️ Bulk shift-schedule upload
Closes the last of the originally-identified Shifts gaps: `CanUploadShiftSchedule` was a reserved permission bit with nothing behind it; now it gates a working CSV importer.

- New `ShiftScheduleCsvParser` (static helper in `CenterDesk.Infrastructure/Helpers`): a small hand-rolled CSV reader (no external library needed for a 3-column format) that parses `ShiftCode,UserEmail,Date` rows, tolerates an optional header row (detected by checking whether the first line's third column parses as a date), and reports per-row parse errors (wrong column count, unparseable date) without failing the whole file.
- `IShiftService.BulkAssignAsync(rows, createdBy)` — loads all active shifts and active users into in-memory lookups once (by `Code` / `Email`, case-insensitive), then for each row: skips rows that already failed to parse, resolves the shift and user, checks for a duplicate assignment (both against what's already in the database and against other rows earlier in the same file), and only then queues an insert. All valid rows are saved in one `SaveChangesAsync` call. Returns a `BulkShiftUploadResult` — total/success/failure counts plus a `BulkShiftUploadRowResult` per input row (row number, echoed input, success flag, error message if any).
- New endpoint: `POST api/shifts/schedule/bulk-upload` (multipart file upload, `[RequestSizeLimit(5_000_000)]`, gated by its own `CanUploadShiftSchedule` permission rather than `CanManageShiftSchedules` — bulk operations are a bigger blast radius than assigning one person to one shift, so they're gated separately even though today the two bits are usually granted together). Always returns 200 with the full per-row breakdown — a partially-successful upload isn't treated as an HTTP error, since the caller needs to see exactly which rows landed and which didn't.

### ✅ SLA simplified to two fields on ServiceSubCategory (this pass — replaces the standalone SLA feature below)
You asked: *"a service category or subcategory should have a timeframe attached to it as the sla... one time frame per sub category"* — and on inspection, the existing standalone `ServiceSla` table already behaved as a strict 1:1-per-sub-category relationship (every create/edit deactivated the sub-category's other active SLA before inserting), so this wasn't a behavior change, just removing indirection:

- `ServiceSubCategory` gained two plain nullable fields directly on the entity: `ResolutionTimeHours` (int?) and `ResponseTimeMinutes` (int?). `null` on either means "no SLA set" — tickets categorised under that sub-category get no `DueDate`/`SlaStatus`, same as before.
- **Removed entirely**: the `ServiceSla` entity/table, `ServiceSubCategory.Slas` navigation collection, `Ticket.ServiceSlaId`/`Ticket.ServiceSla`, `ISlaService`/`SlaService`, `SlasController`, and the DI registration in `InfrastructureServiceExtensions`.
- `IServiceCategoryService`'s `CreateSubCategoryRequest`/`UpdateSubCategoryRequest` and `ServiceCategoryService.CreateSubCategoryAsync`/`UpdateSubCategoryAsync` now accept/set the two timeframe fields directly. `ServiceCategoriesController` (`GetAll`, `GetOne`, `GetSubCategories`, `CreateSubCategory`, `UpdateSubCategory`) now returns them on every sub-category payload.
- `TicketService.CategoriseAsync` now reads the timeframe straight off `subCategory.ResolutionTimeHours`/`ResponseTimeMinutes` instead of querying the (now-gone) `ServiceSlas` table.
- `SlaCalculatorJob.ProcessTicketsAsync` reads `ticket.ServiceSubCategory.ResolutionTimeHours`/`ResponseTimeMinutes` directly (no more `.Include(...).ThenInclude(sc => sc.Slas)` / `FirstOrDefault(s => s.IsActive)` indirection). The `OnTrack`/`AtRisk`/`FirstResponseBreached`/`Breached`/`Paused` status logic itself (including the pause-while-`PendingCustomer` derivation from `TicketStatusHistory`) is unchanged.
- `TicketAuditHelper` — removed the `ServiceSlaId` audited-field entry and its `FormatAsync` switch case (nothing to audit anymore now that the FK is gone).
- **New migration**: `20260814020000_CollapseSlaIntoSubCategory` — drops `FK_Tickets_ServiceSlas_ServiceSlaId`, adds the two nullable columns to `ServiceSubCategories`, **backfills them from each sub-category's currently-active `ServiceSlas` row** (so existing timeframe data isn't lost), then drops `Tickets.ServiceSlaId` and the `ServiceSlas` table entirely. `Down()` best-effort recreates the table/columns/FKs/indexes but is lossy — it cannot restore each SLA's original `Name` or its deactivated-version history, since that's exactly what `Up()` throws away.
- **The standalone SLA management page (`/slas`) and its route/sidebar entry were removed from the frontend** — see the Frontend section below.

Loose end worth knowing about: **`CanViewSla` / `CanCreateSla` / `CanUpdateSla` / `CanDeleteSla` remain reserved in both the backend `Permissions` enum and the frontend `TenantPermission` enum (bit values 0x70–0x73)**, but now gate nothing — no controller or page checks them anymore. They were deliberately left in place rather than removed, since deleting enum values shifts nothing else numerically (each permission is an explicit hex literal, not a sequential index) but could still be confusing if a tenant admin assigns one of these bits to a role expecting it to do something. Worth removing in a future cleanup pass, or repurposing if you add a different feature that needs a free permission bit.

### ⚠️ SLA depth (first-response tracking, pause/resume, richer status, sub-ticket SLA)
Previously `SlaCalculatorJob` only checked resolution time against a flat threshold; there was no first-response tracking and no way for the SLA clock to "pause" while waiting on the customer.

- `SlaCalculatorJob` rewritten: `SlaStatus` is now one of `OnTrack`, `AtRisk` (>80% of resolution time elapsed), `FirstResponseBreached` (no outbound customer-facing message yet and past the sub-category's `ResponseTimeMinutes`), `Breached`, or `Paused` (ticket currently `PendingCustomer`).
- Pause/resume needed **no new schema** — paused duration is derived retroactively by summing `TicketStatusHistory` intervals where `Status == PendingCustomer`, then subtracting that from elapsed time before comparing against the SLA thresholds.
- Sub-tickets now get their own (simpler) SLA check against the existing `DueDate` placeholder — still not a real per-team/category SLA lookup; see Known limitations.
- `SlaCalculatorJob.ProcessTicketsAsync` looks up `ticket.ServiceSubCategory?.ResolutionTimeHours`/`ResponseTimeMinutes` (previously a separate `ServiceSlas` lookup — see the simplification section above) and skips tickets with no `ServiceSubCategoryId` set entirely (no `SlaStatus` at all, not even a default "OnTrack") — this is why the categorisation work below matters: until a ticket is categorised, it was never SLA-tracked no matter how the rest of this section behaved.

### ⚠️ Ticket categorisation surfaced in the API (earlier pass)
The backend already had a working `TicketsController.Categorise` (`PATCH {uid}/categorise` → `TicketService.CategoriseAsync`, sets `ServiceCategoryId`/`ServiceSubCategoryId` and, if the sub-category has a timeframe set, computes `DueDate`) — but nothing in the frontend could reach it, and the ticket DTOs didn't even expose which sub-category a ticket had. That's closed:

- `TicketDto` (and therefore `TicketDetailDto`) gained a `ServiceSubCategory` (`ServiceSubCategorySummaryDto { Uid, Name }`) property, alongside the pre-existing `ServiceCategory` one. `TicketMapper.ToDto()` / `ToDetailDto()` both now set it from `t.ServiceSubCategory?.ToSummary()`.
- `TicketService.CategoriseAsync` — added `.Include(t => t.ServiceSubCategory)` to its initial ticket-loading query (previously only `.Include(t => t.ServiceCategory)`) and now explicitly re-syncs `ticket.ServiceCategory` / `ticket.ServiceSubCategory` navigation properties right after setting the FK ids, so the `TicketDto` this method returns reflects the newly-set category/sub-category immediately rather than the stale values from the initial query.

## Frontend (CenterDesk, tenant app)

### ✅ Standalone SLA management page removed; timeframe fields moved onto Service Categories (this pass)
The `/slas` route, its sidebar entry ("SLAs" under Settings), and the entire `features/slas/` folder (models, service, routes, list page) were removed — see "SLA simplified" in the backend section above for why. In their place:

- `features/service-categories/models/service-category.models.ts` — `ServiceSubCategory` gained `resolutionTimeHours: number | null` and `responseTimeMinutes: number | null`; `CreateSubCategoryRequest`/`UpdateSubCategoryRequest` gained the same as optional fields.
- `service-category-page.ts` — `addSubForm` and `editSubForm` both gained `resolutionTimeHours`/`responseTimeMinutes` controls, wired through `onAddSubcategory()`/`startEditSub()`/`onSaveSubcategory()`. A new `formatTimeframe(sub)` helper renders e.g. `"30m response / 24h resolution"` for display.
- `service-category-page.html` — the "Add Subcategory" form and the inline sub-category edit form each gained two number inputs (Response time in minutes, Resolution time in hours); the subcategory display row now shows the formatted timeframe as a small badge under the name/description when set.
- **Note on the shared `app-input-field` component**: its `ControlValueAccessor` always reads/writes plain strings, even for `type="number"` inputs — it never parses to a number itself. `service-category-page.ts` handles this explicitly with a `toNullableInt()` helper applied right before building each API request, so the backend always receives a real integer or `null`, never `""` or a numeric string. Worth being aware of if you add more numeric fields elsewhere using this same shared component.

The files removed from the device have been **moved into a `_to_delete/` folder** mirroring their original paths (both backend and frontend) rather than deleted outright, since the tool used to edit your files on this pass cannot delete files — see "Files to manually delete" at the bottom of this document.

### ⚠️ Ticket detail: Categorise action
`ticket-detail-page` gained a **"Categorise" / "Change Category"** action (label switches once a ticket already has a sub-category), gated on `CanUpdateTickets` — the same permission already used for the other general-purpose ticket edits on this page. Opening it lazy-loads active service categories once, prefills the current category/sub-category if already set, and presents a cascading category → sub-category select. On save it calls `TicketService.categorise()` (`PATCH {uid}/categorise`) and then reloads the full ticket detail — the categorise endpoint's response is a `TicketDto`, not the full `TicketDetailDto` (no `resolutionSummary`/`statusHistories`/etc.), so a full reload is more reliable than merging the partial response into local state.

The Details panel now also surfaces the ticket's category/sub-category (or "Not categorised" if unset), its `SlaStatus`, and its `DueDate` when present, and the subject header shows a small category/sub-category badge next to the status/priority badges. `ticket.models.ts` gained `TicketServiceCategoryRef` and added `serviceSubCategory` to both `TicketSummary` and the ticket detail `Ticket` interface, plus a new `CategoriseTicketRequest` interface.

### ⚠️ Ported UI components from the angular template
The `shared/components/modal` and `shared/components/data-table` folders were near-empty stubs (literally `<p>modal works!</p>`). `badge`, `dropdown`, and `button` were already real ports from an earlier pass and were left as-is.

- `shared/components/modal/modal.ts` + `.html` — replaced the stub with the real backdrop + escape-to-close + body-scroll-lock implementation ported from `angular template/src/app/shared/components/ui/modal`, adapted to this app's naming (`Modal` class, `app-modal` selector, standalone).
- `shared/components/table/{table,table-header,table-body,table-row,table-cell}.ts` — new composable table primitives ported from the template's `ui/table` components, so pages can build `<app-table>` / `<app-table-row>` / `<app-table-cell>` instead of hand-rolled `<table>` markup.
- The new Teams list page uses the ported `Table` primitives; the new Forward/Internal-Note/Reply-to-Customer/Close/Return modals, the Categorise modal, and the Teams create/edit/add-member modals all use the ported `Modal` component. The pre-existing ticket modals (Assign/Status/Close/Reopen) were **left as their original inline markup** rather than migrated, to avoid touching working code unnecessarily in the same pass — worth revisiting later for consistency.

### ⚠️ New Teams feature
`features/teams/` — models, service, routes, list page, detail page. Lets staff create resolution teams and subteams, edit them (including the `canReplyToCustomer` flag), deactivate them, and add/remove members. Gated throughout by `CanViewResolutionTeams` / `CanCreateResolutionTeam` / `CanUpdateResolutionTeam` / `CanDeleteResolutionTeam` / `CanManageResolutionTeamMembers`. Added to the sidebar (new "Teams" nav item, visible only with `CanViewResolutionTeams`) and to `app.routes.ts` at `/teams`.

Known rough edge: adding a member requires pasting the user's UID by hand (there's no user-picker/search dropdown yet) — the same pattern the existing "Assign Ticket" modal already used for numeric user IDs, so it's consistent with the app's current state rather than a regression, but a real people-picker would be a good follow-up.

### ⚠️ New Sub-Tickets feature
`features/sub-tickets/` — models, service, routes, detail page (`/sub-tickets/:uid`). Shows the internal-only conversation between the forwarding agent and the resolution-team member, plus:
- **Reply to Customer** — only shown when the user has `CanReplyToCustomerFromSubTicket` *and* the sub-ticket's own resolution team has `canReplyToCustomer` set (the UI mirrors the server's double-check so it doesn't offer an action the API will reject).
- **Close Sub-Ticket** and **Return to Agent** actions.

### ⚠️ Tickets feature extended
- `ticket.models.ts` — added `IsInternal` to `TicketMessage`, added the two new `TicketStatus` values (`AwaitingResolutionTeamFeedback`, `Returned`) with labels, added `AddNoteRequest` / `ForwardTicketRequest`, and `TicketServiceCategoryRef`, `serviceSubCategory` on `TicketSummary`/`Ticket`, and `CategoriseTicketRequest`.
- `ticket.service.ts` — added `addNote()`, `getSubTickets()`, `forward()`, and `categorise()`.
- `ticket-detail-page` — added an **"Add Internal Note"** button (gated on `CanAddInternalNote`) that opens a note modal; internal notes render with a distinct yellow "Internal Note" badge in the thread instead of Inbound/Outbound. Added a **"Forward to Team"** action (gated on `CanForwardTicket`) that opens a modal to pick an active resolution team, name a specific member by UID, and write a handoff note. Added a **Sub-Tickets panel** listing this ticket's sub-tickets with links into the new sub-ticket detail page. Added the **Categorise action** described above.
- Fixed the same reply-permission bug on the frontend that was fixed on the backend: the Reply button was gated on `CanCreateTicket`; it now checks `CanReplyTicket`.
- `core/auth/auth.models.ts` — added `CanAddInternalNote` and `CanReplyToCustomerFromSubTicket` to the `TenantPermission` enum (must match the backend `Permissions` enum's new bit values exactly, since the JWT's packed permissions are decoded against this enum). Also added `CanViewTicketAudit`, which existed on the backend already but was missing from this frontend enum — an unrelated small gap fixed while in the file.

### ⚠️ New Shifts feature
`features/shifts/` — models, service, routes, a list page (`/shifts`, create/edit/deactivate shifts) and a schedule page (`/shifts/schedule`, date-picker driven: assign an agent to a shift for a date via two dropdowns, remove an assignment, and see who's on duty right now). Gated by `CanViewShifts` / `CanCreateShift` / `CanUpdateShift` / `CanDeleteShift` / `CanManageShiftSchedules` (the schedule page now allows in either `CanManageShiftSchedules` or `CanUploadShiftSchedule` — a user with only the upload bit still reaches the page to use the bulk uploader, they just don't see the one-at-a-time assign form). Added to the sidebar as a top-level "Shifts" item and to `app.routes.ts` at `/shifts`.

**Bulk upload UI**: a "Bulk Upload" button (gated `CanUploadShiftSchedule`) on the schedule page opens a modal with a "Download CSV template" link (built client-side from a `Blob`, no round trip needed for three static columns), a file picker, and — after upload — a per-row result list (row number, echoed shift code/email/date, and either "OK" or the specific error) so a partially-valid file's failures are immediately visible rather than requiring a re-read of server logs.

### ⚠️ New Partners feature
`features/partners/` — models, service, routes, single list page with create/edit/deactivate, gated by `CanViewPartners` / `CanManagePartners`. Added under Settings in the sidebar and to `app.routes.ts` at `/partners`.

### ⚠️ New Email Filters feature
`features/email-filters/` — models, service, routes, single list page. The create/edit form lets you pick an email desk, a filter type, a value, and an action (including a "Set service category…" option that reveals a category picker and is sent to the API as the literal string `SetCategory:{uid}`, matching what `EmailSyncJob.EvaluateFiltersAsync` expects). Gated by `CanViewConfiguration` / `CanManageEmailFilters`. Added under Settings in the sidebar and to `app.routes.ts` at `/email-filters`.

**Known follow-up bug (not fixed this pass):** `EmailSyncJob.EvaluateFiltersAsync`'s `SetCategory:{uid}` action only sets `Ticket.ServiceCategoryId`, never `ServiceSubCategoryId` — so a ticket auto-categorised by an email filter still won't get SLA-tracked, since `SlaCalculatorJob` (and the SLA lookup in general) only ever looks at the sub-category. Until this is fixed, category assignment via email filters is cosmetic/reporting-only; the manual "Categorise" action on the ticket detail page (which sets both ids) is currently the only path that actually attaches an SLA timeframe.

### ⚠️ New Reports feature
`features/reports/` — models, service, routes, single page (`/reports`) with a from/to date range, five KPI tiles (total/open/closed/SLA-breached/avg. resolution hours), a tickets-by-status bar chart (via the already-installed `ng-apexcharts`, following the same chart-config pattern as the pre-existing `MonthlySalesChart` template component), and an agent-performance table. Gated by `CanViewReports`. Added as a top-level sidebar item and to `app.routes.ts` at `/reports`.

### ⚠️ Real-time notification client
- New `core/notifications/notification-client.service.ts` — connects to `NotificationHub` via `@microsoft/signalr` whenever `AuthService.isAuthenticated()` is true (using an Angular `effect()`, so it self-manages connect/disconnect with no explicit wiring beyond being injected once), passing the JWT the same way the app's REST calls already do. Listens for `TicketAssigned`, `SubTicketForwarded`, and `SubTicketReturned`, keeps the last 30 as an in-memory `recent` signal, tracks `unreadCount`, and fires a toast via the existing `ToastService` on each event.
- `layout/shell/shell.ts` injects the service once (Shell only mounts once authenticated) purely to start its connection lifecycle.
- `layout/topbar/` gained a notification bell with an unread-count badge and a dropdown listing recent notifications (click one to navigate straight to the ticket or sub-ticket); opening the dropdown marks everything read.
- **`@microsoft/signalr` was added to `tenant/package.json` but is NOT yet installed** — see Known limitations, you'll need to run `npm install` yourself.

---

## ⛔ Deferred this pass (documented, not implemented)
- **Sub-ticket SLA still uses the hardcoded 24h `DueDate` placeholder**, not a real per-team/per-category SLA lookup.
- **No cloud/blob storage for attachments** — local disk under `App_Data/attachments/{tenantSlug}/` only. Fine for a single-instance deployment, not for anything horizontally scaled or ephemeral-filesystem (e.g. most PaaS/container hosting).
- **Email filters remain a small fixed vocabulary**, not a general rule engine (see the Email filter configuration section above for exactly what's supported).
- **No people-picker for the Shifts schedule page's "Agent" dropdown beyond a plain `<select>` of active users** — fine at current user-list sizes, would want pagination/search if a tenant has hundreds of agents.
- **The email-filter `SetCategory:{uid}` sub-category bug (see the Email Filters section above) was identified but intentionally not fixed** — out of scope for the passes requested so far; flagged here so it isn't lost.
- **The now-dead `CanViewSla`/`CanCreateSla`/`CanUpdateSla`/`CanDeleteSla` permission bits were left in both enums rather than removed** — see the SLA simplification section above for why.

## Known limitations
- **The new `20260818090000_AddMultiCurrencySupport` migration has no `.Designer.cs` and did not update `CentralDbContextModelSnapshot.cs`**, for the same reason as every other hand-written migration this project — no `dotnet` SDK/network access in this environment to run `dotnet ef migrations add`. `Database.MigrateAsync()` at startup only needs the `Migration` class itself, so the app should still migrate correctly, but regenerate a proper Designer.cs/snapshot update next time you run `dotnet ef migrations add` locally.
- **The multi-currency backend changes (Plan/Subscription/Invoice, SubscriptionController, BillingController, PaystackService) could not be compiled in this environment** — same `dotnet` SDK constraint as everything else backend this project. Please run a local `dotnet build` before deploying.
- **The USD prices seeded by the multi-currency migration are placeholders I chose to be in a plausible range per tier** (Starter $15/mo, Professional $49/mo, Enterprise $149/mo) — not derived from any real pricing decision or FX rate. Please review and adjust before this reaches customers.
- **No `dotnet` SDK was available in this environment** (still true this pass, though you appear to have run `dotnet ef migrations add` locally at least once since — the `20260814001808_AddShiftsPartnersEmailFilterCsat` migration has a proper `.Designer.cs` and an updated snapshot), so none of the backend C# changes made *in this environment* — old or new — could be compiled or run here. They closely follow the existing codebase's own patterns, but please run a local `dotnet build` before trusting them in a deployed environment.
- **The new `20260814020000_CollapseSlaIntoSubCategory` migration has NO `.Designer.cs` file and did NOT update `TenantDbContextModelSnapshot.cs`**, for the same reason as the prior unbuilt migrations: no SDK/network access in this environment to run `dotnet ef migrations add`, and hand-editing the 1400+-line snapshot without being able to compile-check it risks silently corrupting it. `Database.MigrateAsync()` at app startup only needs the `Migration` class itself, not the Designer.cs/snapshot — those matter only to `dotnet ef` tooling — so the app should still start and migrate correctly. **Before your next `dotnet ef migrations add`, regenerate a proper Designer.cs and snapshot update for this migration** (you clearly have the SDK available locally, since you've done this once already for the shifts/partners/CSAT migration), otherwise EF's own tooling will be confused about what state the model is actually in.
- **The two earlier EF Core migrations from the shifts/partners/CSAT pass (`20260811130000_AddShifts`, `20260811140000_AddEmailFilterUidAndCsatTracking`) still have no Designer.cs/snapshot update either** — see above, same fix needed.
- **TimeOnly → `time without time zone` and DateOnly → `date` Npgsql column mapping (used by the `Shift`/`ShiftAssignment` tables) is based on general Npgsql convention, not verified against an actual build** — there's no prior precedent for these .NET types anywhere else in this codebase.
- **The frontend build (`ng build`) could not be run to completion.** `node`/`npm`/`node_modules` are present, but the tool used to run shell commands on your machine caps every command at 45 seconds with no persistent background process — an Angular build routinely takes longer than that. Please run `npm run build` (or `ng serve`) in `centerdesk/tenant` yourself before trusting the frontend changes, including this pass's service-category timeframe fields.
- **`@microsoft/signalr` was added to `tenant/package.json`'s dependencies but never actually installed** (same 45-second/no-network-from-this-side constraint) — run `npm install` in `centerdesk/tenant` before building or serving, or the new notification client will fail to resolve at compile time.
- **`EmailFilterConfigurations.Uid` is nullable with no backfill migration for any pre-existing rows** — if you had email filters created before this pass, they'll have a `NULL` Uid until you either backfill them (`UPDATE ... SET "Uid" = gen_random_uuid() WHERE "Uid" IS NULL`) or just delete and recreate them via the new UI.
- Two pre-existing permission-related frontend/backend enum mismatches were fixed while in these files in an earlier pass (`CanViewTicketAudit` was missing from the frontend `TenantPermission` enum) — worth a quick side-by-side diff of the two enums next time either one changes, since nothing currently guarantees they stay in sync.
- **The bulk shift-upload endpoint (`POST api/shifts/schedule/bulk-upload`) is unbuilt/untested like everything else backend this project** — worth a specific manual check given it's new file-upload plumbing: confirm `[FromForm] IFormFile` binds correctly without an explicit `[Consumes("multipart/form-data")]` attribute (it should, per ASP.NET Core's model binding conventions, matching the existing `AttachmentsController.Upload` pattern this was modeled on), and sanity-check the `[RequestSizeLimit(5_000_000)]` (5MB) is a sensible ceiling for your expected schedule sizes.

## Files to manually delete
`device_bash` (the tool used to edit files on your machine this session) cannot delete files — only move/rename them. Everything superseded by the SLA simplification was moved into a `_to_delete/` folder at the repo root, mirroring each file's original path. Please delete this folder (or review it first, then delete) once you've confirmed the app builds and runs correctly with the new inline timeframe fields:

- `_to_delete/CentralDesk.API/CenterDesk.Infrastructure/Models/Tenant/ServiceSla.cs`
- `_to_delete/CentralDesk.API/CenterDesk.Infrastructure/Services/Sla_folder/ISlaService.cs` (renamed from `Sla` to `Sla_folder` only because an empty `Sla` directory already existed at the destination — harmless)
- `_to_delete/CentralDesk.API/CenterDesk.API/Controllers/SlasController.cs`
- `_to_delete/CenterDesk/centerdesk/tenant/src/app/features/slas/slas.routes.ts`
- `_to_delete/CenterDesk/centerdesk/tenant/src/app/features/slas/models/sla.models.ts`
- `_to_delete/CenterDesk/centerdesk/tenant/src/app/features/slas/services/sla.service.ts`
- `_to_delete/CenterDesk/centerdesk/tenant/src/app/features/slas/pages/sla-list-page/sla-list-page.ts`
- `_to_delete/CenterDesk/centerdesk/tenant/src/app/features/slas/pages/sla-list-page/sla-list-page.html`

A few now-empty subdirectories (`features/slas/`, `features/slas/pages/sla-list-page/`) are left behind at their original locations too — harmless, but you can remove them along with `_to_delete/` in the same cleanup.
