import { Routes } from '@angular/router';

export const emailDesksRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/email-desk-page/email-desk-page').then(m => m.EmailDeskPage),
  },
];
