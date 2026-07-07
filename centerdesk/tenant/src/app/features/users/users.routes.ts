import { Routes } from '@angular/router';

export const usersRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/user-list-page/user-list-page').then(m => m.UserListPage),
  },
  {
    path: ':uid',
    loadComponent: () => import('./pages/user-detail-page/user-detail-page').then(m => m.UserDetailPage),
  },
];
