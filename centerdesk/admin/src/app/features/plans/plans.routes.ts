import { Routes } from '@angular/router';

export const plansRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/plans-page/plans-page').then(m => m.PlansPage),
  },
];
