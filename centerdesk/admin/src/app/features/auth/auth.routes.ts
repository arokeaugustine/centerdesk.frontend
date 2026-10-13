import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/account.guards';

export const authRoutes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Log in — CenterDesk',
    loadComponent: () =>
      import('./pages/login-page/login-page').then(m => m.LoginPage),
  },
  {
    path: 'forgot-password',
    title: 'Forgot your password? — CenterDesk',
    loadComponent: () =>
      import('./pages/forgot-password-page/forgot-password-page').then(m => m.ForgotPasswordPage),
  },
  {
    path: 'reset-password',
    title: 'Choose a new password — CenterDesk',
    loadComponent: () =>
      import('./pages/reset-password-page/reset-password-page').then(m => m.ResetPasswordPage),
  },
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full',
  },
];
