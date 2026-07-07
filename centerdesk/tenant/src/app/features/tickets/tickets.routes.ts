import { Routes } from '@angular/router';

export const ticketsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/ticket-list-page/ticket-list-page').then(m => m.TicketListPage),
  },
  {
    path: ':uid',
    loadComponent: () =>
      import('./pages/ticket-detail-page/ticket-detail-page').then(m => m.TicketDetailPage),
  },
];
