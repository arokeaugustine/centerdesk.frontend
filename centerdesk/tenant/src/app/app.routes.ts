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
    path: 'dashboard',
    canActivate: [tenantGuard, authGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes),
  },
  {
    path: 'account',
    canActivate: [tenantGuard, authGuard],
    loadChildren: () =>
      import('./features/account/account.routes').then(m => m.accountRoutes),
  },
  {
    path: 'settings',
    canActivate: [tenantGuard, authGuard],
    loadChildren: () =>
      import('./features/settings/settings.routes').then(m => m.settingsRoutes),
  },
];
