import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { tenantGuard } from './core/guards/tenant.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [tenantGuard],
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },
  {
    path: 'not-found',
    loadComponent: () =>
      import('./features/not-found/not-found').then(m => m.NotFound),
  },
  {
    path: '',
    canActivate: [tenantGuard, authGuard],
    loadComponent: () =>
      import('./layout/shell/shell').then(m => m.Shell),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes),
      },
      {
        path: 'account',
        loadChildren: () =>
          import('./features/account/account.routes').then(m => m.accountRoutes),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(m => m.settingsRoutes),
      },
      {
        path: 'billing',
        loadChildren: () =>
          import('./features/billing/billing.routes').then(m => m.billingRoutes),
      },
      {
        path: 'tickets',
        loadChildren: () =>
          import('./features/tickets/tickets.routes').then(m => m.ticketsRoutes),
      },
      {
        path: 'sub-tickets',
        loadChildren: () =>
          import('./features/sub-tickets/sub-tickets.routes').then(m => m.subTicketsRoutes),
      },
      {
        path: 'teams',
        loadChildren: () =>
          import('./features/teams/teams.routes').then(m => m.teamsRoutes),
      },
      {
        path: 'users',
        loadChildren: () =>
          import('./features/users/users.routes').then(m => m.usersRoutes),
      },
      {
        path: 'roles',
        loadChildren: () =>
          import('./features/roles/roles.routes').then(m => m.rolesRoutes),
      },
      {
        path: 'email-desks',
        loadChildren: () =>
          import('./features/email-desks/email-desks.routes').then(m => m.emailDesksRoutes),
      },
      {
        path: 'service-categories',
        loadChildren: () =>
          import('./features/service-categories/service-categories.routes').then(m => m.serviceCategoriesRoutes),
      },
      {
        path: 'shifts',
        loadChildren: () =>
          import('./features/shifts/shifts.routes').then(m => m.shiftsRoutes),
      },
      {
        path: 'email-filters',
        loadChildren: () =>
          import('./features/email-filters/email-filters.routes').then(m => m.emailFiltersRoutes),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(m => m.reportsRoutes),
      },
      {
        path: 'knowledge-base',
        loadChildren: () =>
          import('./features/knowledge-base/knowledge-base.routes').then(m => m.knowledgeBaseRoutes),
      },
    ],
  },
];
