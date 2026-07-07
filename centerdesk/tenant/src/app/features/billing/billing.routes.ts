import { Routes } from '@angular/router';

export const billingRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/billing-page/billing-page').then(m => m.BillingPage),
  },
  {
    path: 'payment-callback',
    loadComponent: () =>
      import('./pages/payment-callback/payment-callback').then(m => m.PaymentCallback),
  },
];
