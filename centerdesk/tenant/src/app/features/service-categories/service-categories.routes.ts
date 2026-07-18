import { Routes } from '@angular/router';

export const serviceCategoriesRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/service-category-page/service-category-page').then(m => m.ServiceCategoryPage),
  },
];
