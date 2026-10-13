import { Routes } from '@angular/router';

export const emailFiltersRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/email-filter-list-page/email-filter-list-page').then(m => m.EmailFilterListPage),
  },
];
