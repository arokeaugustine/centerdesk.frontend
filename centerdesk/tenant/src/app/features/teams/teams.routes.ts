import { Routes } from '@angular/router';

export const teamsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/team-list-page/team-list-page').then(m => m.TeamListPage),
  },
  {
    path: ':uid',
    loadComponent: () => import('./pages/team-detail-page/team-detail-page').then(m => m.TeamDetailPage),
  },
];
