# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Layout

The Angular application lives under `centerdesk/tenant/`. All commands below must be run from that directory.

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

Two HTTP interceptors attach to every outbound request:
- `authInterceptor` — adds `Authorization: Bearer {token}`
- `tenantInterceptor` — adds `X-Tenant-Slug: {slug}`

`tenantGuard` blocks routes when no slug is resolved. `authGuard` blocks authenticated-only routes.

### Angular Patterns

- **Angular 22** with **zoneless change detection** — avoid `ngZone.run()` and imperative change detection calls
- **Standalone components** throughout — no NgModules
- **Signals API** for all reactive state in services and components; avoid RxJS subscriptions in components
- **Lazy-loaded features** via `loadChildren` / `loadComponent` in `app.routes.ts`

### Routing Shape

```
/                   → redirects to /dashboard
/auth/login         → LoginPage (tenantGuard only — not authGuard)
/not-found          → 404 page
/ (Shell layout)    → guarded by tenantGuard + authGuard
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

### Styling

- Tailwind CSS 4 with PostCSS; dark mode is class-based (`.dark` on `<html>`)
- Component-level SCSS for structural styles; Tailwind utilities for layout/colors
- Global styles in `src/styles.scss`; flatpickr CSS imported globally via `angular.json`
- Charts: **ApexCharts** (via `ng-apexcharts`) for most charts; **AmCharts 5** for the geographic map
