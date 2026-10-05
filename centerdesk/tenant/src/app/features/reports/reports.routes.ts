import { Routes } from '@angular/router';

export const reportsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/report-page/report-page').then(m => m.ReportPage),
  },
];
