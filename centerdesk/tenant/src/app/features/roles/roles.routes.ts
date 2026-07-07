import { Routes } from '@angular/router';

export const rolesRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/role-list-page/role-list-page').then(m => m.RoleListPage),
  },
];
