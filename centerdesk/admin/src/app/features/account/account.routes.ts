import { Routes } from '@angular/router';

export const accountRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./account-shell').then(m => m.AccountShell),
    children: [
      { path: '', loadComponent: () => import('./pages/overview-page').then(m => m.OverviewPage) },
      { path: 'billing', loadComponent: () => import('./pages/billing-page').then(m => m.BillingPage) },
    ],
  },
];
