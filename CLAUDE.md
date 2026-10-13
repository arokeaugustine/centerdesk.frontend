# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

The Angular application lives under `centerdesk/tenant/`. All commands below must be run from that directory.

The .NET API lives at `C:\Users\AugustineAroke\source\repos\DeskApp\CentralDesk.API` (separate repo/solution). Controllers are under `CenterDesk.API\Controllers\`, services under `CenterDesk.Infrastructure\Services\`.

The UI design reference template lives at `C:\Users\AugustineAroke\source\repos\DeskApp\angular template`. Use it for design patterns, component structure, modal layouts, table styles, and Tailwind class conventions when building new pages.


## Commands

```bash
cd centerdesk/tenant

npm start          # dev server at http://localhost:4200 (binds 0.0.0.0)
npm run build      # production build
npm run watch      # watch-mode dev build
npm test           # unit tests via Vitest
```

The dev server proxies `/api/*` to `https://localhost:7213` (configured in `proxy.config.json`).

## Architecture

### Multi-Tenancy

The app is a multi-tenant SaaS product. At startup, `TenantService` extracts the tenant slug from the hostname:
- Local: `{slug}.localhost:4200`
- Production: `{slug}.centerdesk.io`


`tenantGuard` blocks routes when no slug is resolved. `authGuard` blocks authenticated-only routes.

### Angular Patterns

- **Angular 22** with **zoneless change detection** — avoid `ngZone.run()` and imperative change detection calls
- **Standalone components** throughout — no NgModules
- **Signals API** for all reactive state in services and components; avoid RxJS subscriptions in components
- **Lazy-loaded features** via `loadChildren` / `loadComponent` in `app.routes.ts`

### Routing Shape

```
/                        → redirects to /dashboard
/auth/login              → LoginPage (tenantGuard only — not authGuard)
/auth/forgot-password    → ForgotPasswordPage (tenantGuard only)
/auth/reset-password     → ResetPasswordPage (tenantGuard only; reads ?token=)
/not-found               → 404 page
/ (Shell layout)         → guarded by tenantGuard + authGuard
  /dashboard
  /account
  /settings
  /billing
  /billing/payment-callback
```

### Core Services

| Service | Location | Responsibility |
|---|---|---|
| `TenantService` | `core/tenant/` | Resolves slug from hostname; signals: `tenant`, `tenantSlug`, `notFound` |
| `AuthService` | `core/auth/` | Login/logout, token storage in `localStorage`, auto-refresh 60s before expiry |
| `ThemeService` | `core/theme/` | Light/dark toggle, persisted to `localStorage`, sets `.dark` class on `<html>` |
| `SidebarService` | `core/sidebar/` | Signals for `isExpanded`, `isMobileOpen`, `isHovered`; sidebar expand/collapse |

Auth localStorage keys: `cd_token`, `cd_refresh_token`, `cd_expires_at`, `cd_user`.

### Layout

- **Shell** — wraps everything; binds sidebar-state signals to layout classes
- **Topbar** — sidebar toggle (≥1280px: desktop expand, <1280px: mobile drawer), theme toggle, user dropdown
- **Sidebar** — nav items rendered with `SafeHtmlPipe` for inline SVG icons; active state via `router.url.startsWith()`

### Shared Components

Form inputs (`InputField`, `Checkbox`) implement `ControlValueAccessor` — use them with Angular reactive forms directly.

`SafeHtmlPipe` (`shared/pipes/safe-html.pipe.ts`) sanitizes HTML and is used to render inline SVG icons in the sidebar and elsewhere.

### API Response Envelope

All API responses follow this shape:

```typescript
{
  success: boolean;
  message: string;
  content: T;
  validationErrors: Record<string, string[]> | null;
  paging: { pageIndex, pageSize, totalPages, totalItems, hasNextPage, hasPreviousPage };
}
```

### Environment & API Base URL

`environment.ts` (production) sets `apiBaseUrl: 'https://api.centerdesk.io'`.  
`environment.development.ts` sets `apiBaseUrl: 'https://localhost:7213'`.  
The URL is provided as the `API_BASE_URL` injection token at app startup.

### Roles API (`api/roles`)

All endpoints require `Authorization` + `X-Tenant-Slug` headers (injected by interceptors).

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/roles` | `CanViewRoles` | List all active roles |
| `GET` | `/api/roles/{uid}` | `CanViewRoles` | Get role detail including assigned users |
| `POST` | `/api/roles` | `CanCreateRole` | Create role |
| `PUT` | `/api/roles/{uid}` | `CanUpdateRole` | Update name / description |
| `DELETE` | `/api/roles/{uid}` | `CanDeleteRole` | Soft-delete (fails if role has assigned users) |
| `PUT` | `/api/roles/{uid}/permissions` | `CanManageRolePermissions` | Replace full permission set |
| `POST` | `/api/roles/{uid}/permissions` | `CanManageRolePermissions` | Add single permission |
| `DELETE` | `/api/roles/{uid}/permissions/{permission}` | `CanManageRolePermissions` | Remove single permission |
| `GET` | `/api/roles/available-permissions` | `CanViewRoles` | All permissions grouped by category |

**Response shapes:**

```typescript
// GET /api/roles  (each item)
{ uid: string; name: string; description: string | null; isActive: boolean; createdAt: string; permissions: string[]; userCount: number }

// GET /api/roles/{uid}
{ uid: string; name: string; description: string | null; isActive: boolean; createdAt: string; permissions: string[];
  users: { uid: string; firstName: string; lastName: string; email: string }[] }

// POST /api/roles  body
{ name: string; description?: string; permissions?: string[] }

// PUT /api/roles/{uid}  body
{ name?: string; description?: string }

// GET /api/roles/available-permissions
{ group: string; permissions: { name: string; value: number }[] }[]
```

**Key behaviours:**
- `GetAll` only returns active roles (soft-delete pattern — `IsActive = false`)
- Cannot delete a role that is still assigned to users (returns 400)
- Permissions are stored and exchanged as hex strings matching the frontend `permissionToHex` helper

### Password Reset (`api/auth`)

Anonymous endpoints shared by both apps. A reset token is a one-use secret that expires in an
hour; only its SHA-256 hash is stored, in the **central** `PasswordResetTokens` table, together
with which account it belongs to (a system admin, or a tenant + email). Because the token carries
that, completing a reset needs no slug — both apps post to the same endpoint.

| Method | Path | Used by | Description |
|---|---|---|---|
| `POST` | `/api/auth/forgot-password?tenantSlug=` | tenant app | Link for any active user in that workspace |
| `POST` | `/api/auth/forgot-password/account` | admin app | Link for a system admin or a workspace owner (`Tenant.AdminEmail`) |
| `GET` | `/api/auth/reset-password?token=` | both | Is the link still good? `{ valid, email, reason }` |
| `POST` | `/api/auth/reset-password` | both | `{ token, newPassword }` — min 8 characters |

**Key behaviours:**
- Both `forgot-password` endpoints answer identically whether or not the address has an account, so
  neither form can be used to discover who does. Nothing in the UI should imply otherwise.
- Asking again retires the previous link; completing a reset retires every outstanding one.
- A successful reset revokes that account's refresh tokens, so sessions on the old password end.
- Resetting a workspace **owner's** password also updates `Tenant.AdminPasswordHash` centrally —
  re-provisioning a workspace copies that back over the user's, so leaving it stale would restore
  the old password.
- Link hosts come from config: `AppSettings:MainSiteUrl` (blank → `https://{BaseDomain}`) for the
  admin app, and `Billing:TenantAppUrl` / `BaseDomain` for a workspace. **Set both in development**,
  or emailed links point at production hosts.
- Rate limited per IP: `forgot-password` 5 per 15 min (`password-reset` policy), `reset-password`
  10 per min (`auth` policy).

### Styling

- Tailwind CSS 4 with PostCSS; dark mode is class-based (`.dark` on `<html>`)
- Component-level SCSS for structural styles; Tailwind utilities for layout/colors
- Global styles in `src/styles.scss`; flatpickr CSS imported globally via `angular.json`
- Charts: **ApexCharts** (via `ng-apexcharts`) for most charts; **AmCharts 5** for the geographic map
