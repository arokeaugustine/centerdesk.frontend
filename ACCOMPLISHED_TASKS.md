# CenterDesk — Accomplished Tasks

This file is updated as work lands. It tracks what has actually been implemented against the gaps identified in `CenterDesk-MultiTenant-HelpDesk-Development-Spec.md`, so you can see progress at a glance without re-reading every diff.

Last updated: 2026-08-11 (backend + frontend pass)

---

## Status legend
- ✅ Done — code written, committed to your repo
- ⚠️ Done but unverified — written and committed, but could not be compiled/tested in this environment (see "Known limitations" below)
- ⏳ In progress
- ⛔ Deferred — intentionally not attempted this pass, documented so it isn't a surprise

---

## Backend (CentralDesk.API)

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
  - `ForwardAsync` — validates the assignee is an active member of the target team, creates the `SubTicket` (numbered `{TicketNumber}-ST{n}`), moves the parent ticket to `AwaitingResolutionTeamFeedback`, writes ticket + sub-ticket status history and an audit entry.
  - `ReplyAsync` — internal-only messages between the forwarding agent and the resolution-team member (never emailed out); auto-transitions the sub-ticket `Closed → Open` or `Open → InProgress`.
  - `ReplyToCustomerAsync` — lets a resolution-team member reply to the customer **directly from the sub-ticket**, but only if `ResolutionTeam.CanReplyToCustomer` is true; otherwise throws and the agent is told to relay the reply themselves instead. This is the server-side enforcement that was missing entirely in both existing codebases.
  - `CloseAsync` — closes the sub-ticket only; parent ticket is untouched.
  - `ReturnAsync` — sends the sub-ticket back to the original agent; sets both sub-ticket and parent ticket status to the new `Returned` status.
  - `GetByTicketAsync`, `GetByUidAsync`, `GetMessagesAsync`.
- New `SubTicketsController` at `api/sub-tickets` (`GET /{uid}`, `GET /{uid}/messages`, `POST /{uid}/messages`, `POST /{uid}/reply-customer`, `POST /{uid}/close`, `POST /{uid}/return`), each gated by `CanViewSubTicketDetails`, `CanReplySubTicket`, or the new `CanReplyToCustomerFromSubTicket`.
- `TicketsController` extended with `GET /{uid}/sub-tickets` and `POST /{uid}/forward` (`CanViewSubTickets` / `CanForwardTicket`).
- New DTOs (`SubTicketDto`, `ForwardTicketRequest`, `SubTicketReplyRequest`, `SubTicketReplyCustomerRequest`, `CloseSubTicketRequest`, `ReturnSubTicketRequest`) and `SubTicketMapper`.
- Two new `TicketStatus` values: `AwaitingResolutionTeamFeedback`, `Returned`.
- Two new `Permissions`: `CanAddInternalNote`, `CanReplyToCustomerFromSubTicket` (plus the already-modeled-but-now-used team/sub-ticket permissions above — these slot into the existing bit-packed `Permissions : short` enum with no extra registration needed, per how `AuthorizationPolicyProvider` resolves policies).

### ⚠️ Database migration
- `20260811120000_AddInternalNotesAndTeamReplyFlag` (+ `.Designer.cs`) adds `Messages.IsInternal` and `ResolutionTeams.CanReplyToCustomer` (both `boolean`, default `false`).
- `TenantDbContextModelSnapshot.cs` updated to match.
- **Hand-authored**, not generated by `dotnet ef migrations add` — see Known limitations.

### DI
- `IResolutionTeamService` and `ISubTicketService` registered in `InfrastructureServiceExtensions`.

---

## Frontend (CenterDesk, tenant app)

### ⚠️ Ported UI components from the angular template
The `shared/components/modal` and `shared/components/data-table` folders were near-empty stubs (literally `<p>modal works!</p>`). `badge`, `dropdown`, and `button` were already real ports from an earlier pass and were left as-is.

- `shared/components/modal/modal.ts` + `.html` — replaced the stub with the real backdrop + escape-to-close + body-scroll-lock implementation ported from `angular template/src/app/shared/components/ui/modal`, adapted to this app's naming (`Modal` class, `app-modal` selector, standalone).
- `shared/components/table/{table,table-header,table-body,table-row,table-cell}.ts` — new composable table primitives ported from the template's `ui/table` components, so pages can build `<app-table>` / `<app-table-row>` / `<app-table-cell>` instead of hand-rolled `<table>` markup.
- The new Teams list page uses the ported `Table` primitives; the new Forward/Internal-Note/Reply-to-Customer/Close/Return modals and the Teams create/edit/add-member modals all use the ported `Modal` component. The pre-existing ticket modals (Assign/Status/Close/Reopen) were **left as their original inline markup** rather than migrated, to avoid touching working code unnecessarily in the same pass — worth revisiting later for consistency.

### ⚠️ New Teams feature
`features/teams/` — models, service, routes, list page, detail page. Lets staff create resolution teams and subteams, edit them (including the `canReplyToCustomer` flag), deactivate them, and add/remove members. Gated throughout by `CanViewResolutionTeams` / `CanCreateResolutionTeam` / `CanUpdateResolutionTeam` / `CanDeleteResolutionTeam` / `CanManageResolutionTeamMembers`. Added to the sidebar (new "Teams" nav item, visible only with `CanViewResolutionTeams`) and to `app.routes.ts` at `/teams`.

Known rough edge: adding a member requires pasting the user's UID by hand (there's no user-picker/search dropdown yet) — the same pattern the existing "Assign Ticket" modal already used for numeric user IDs, so it's consistent with the app's current state rather than a regression, but a real people-picker would be a good follow-up.

### ⚠️ New Sub-Tickets feature
`features/sub-tickets/` — models, service, routes, detail page (`/sub-tickets/:uid`). Shows the internal-only conversation between the forwarding agent and the resolution-team member, plus:
- **Reply to Customer** — only shown when the user has `CanReplyToCustomerFromSubTicket` *and* the sub-ticket's own resolution team has `canReplyToCustomer` set (the UI mirrors the server's double-check so it doesn't offer an action the API will reject).
- **Close Sub-Ticket** and **Return to Agent** actions.

### ⚠️ Tickets feature extended
- `ticket.models.ts` — added `IsInternal` to `TicketMessage`, added the two new `TicketStatus` values (`AwaitingResolutionTeamFeedback`, `Returned`) with labels, added `AddNoteRequest` / `ForwardTicketRequest`.
- `ticket.service.ts` — added `addNote()`, `getSubTickets()`, `forward()`.
- `ticket-detail-page` — added an **"Add Internal Note"** button (gated on `CanAddInternalNote`) that opens a note modal; internal notes render with a distinct yellow "Internal Note" badge in the thread instead of Inbound/Outbound. Added a **"Forward to Team"** action (gated on `CanForwardTicket`) that opens a modal to pick an active resolution team, name a specific member by UID, and write a handoff note. Added a **Sub-Tickets panel** listing this ticket's sub-tickets with links into the new sub-ticket detail page.
- Fixed the same reply-permission bug on the frontend that was fixed on the backend: the Reply button was gated on `CanCreateTicket`; it now checks `CanReplyTicket`.
- `core/auth/auth.models.ts` — added `CanAddInternalNote` and `CanReplyToCustomerFromSubTicket` to the `TenantPermission` enum (must match the backend `Permissions` enum's new bit values exactly, since the JWT's packed permissions are decoded against this enum). Also added `CanViewTicketAudit`, which existed on the backend already but was missing from this frontend enum — an unrelated small gap fixed while in the file.

---

## ⛔ Deferred this pass (documented, not implemented)
- **SLA depth** — `SlaCalculatorJob` still doesn't use `ResponseTimeMinutes` for first-response tracking, `SlaStatus` isn't extended to richer states, and sub-ticket-level SLA tracking wasn't added. The forwarding flow uses a **hardcoded 24h due date placeholder** for sub-tickets pending a real escalation SLA design.
- **Real-time notifications (SignalR)** — not present in CentralDesk.API at all yet; out of scope for this pass.

## Known limitations
- **No `dotnet` SDK was available in this environment**, so none of the backend C# changes above could be compiled or run. They were written by closely following the existing codebase's own patterns (service structure, controller conventions, permission attributes, EF model conventions), but please run a local `dotnet build` before trusting them in a deployed environment.
- The EF Core migration pair was **hand-authored** by copying the current model snapshot and inserting the two new columns at their EF-convention-correct positions, because `dotnet ef migrations add` could not be run here. If you have the .NET SDK locally, it would be safer to delete this migration pair and regenerate it properly with `dotnet ef migrations add AddInternalNotesAndTeamReplyFlag`, diffing against what's here to make sure nothing else drifted.
- **The frontend build (`ng build`) could not be run to completion either.** `node`/`npm`/`node_modules` are present, but the tool used to run shell commands on your machine caps every single command at 45 seconds and does not let a background process survive between commands — an Angular build routinely takes longer than that, and there's no way to kick it off and check back later. So please run `npm run build` (or `ng serve`) in the `centerdesk/tenant` folder yourself before trusting these frontend changes — I'm reasonably confident in them because they closely mirror the existing pages' own patterns (same signal/service structure, same permission-gating style, same modal markup conventions), but they are genuinely unverified.
- Two pre-existing permission-related frontend/backend enum mismatches were fixed while in these files (`CanViewTicketAudit` was missing from the frontend `TenantPermission` enum) — worth a quick side-by-side diff of the two enums next time either one changes, since nothing currently guarantees they stay in sync.
