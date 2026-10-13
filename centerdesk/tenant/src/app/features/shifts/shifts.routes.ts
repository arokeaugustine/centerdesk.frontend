import { Routes } from '@angular/router';

export const shiftsRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/shift-list-page/shift-list-page').then(m => m.ShiftListPage),
  },
  {
    path: 'schedule',
    loadComponent: () => import('./pages/shift-schedule-page/shift-schedule-page').then(m => m.ShiftSchedulePage),
  },
];
