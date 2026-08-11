import { Routes } from '@angular/router';

export const subTicketsRoutes: Routes = [
  {
    path: ':uid',
    loadComponent: () =>
      import('./pages/sub-ticket-detail-page/sub-ticket-detail-page').then(m => m.SubTicketDetailPage),
  },
];
