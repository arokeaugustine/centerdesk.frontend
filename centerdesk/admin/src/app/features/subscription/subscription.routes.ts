import { Routes } from '@angular/router';

export const subscriptionRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/subscription-page/subscription-page').then(m => m.SubscriptionPage),
  },
];
