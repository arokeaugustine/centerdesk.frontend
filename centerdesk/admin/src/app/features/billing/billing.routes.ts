import { Routes } from '@angular/router';

export const billingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/billing-page/billing-page').then(m => m.BillingPage),
  },
];
