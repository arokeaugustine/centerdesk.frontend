import { Routes } from '@angular/router';

export const tenantsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/tenant-list/tenant-list').then(m => m.TenantList),
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./pages/tenant-create/tenant-create').then(m => m.TenantCreate),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/tenant-detail/tenant-detail').then(m => m.TenantDetail),
  },
];
