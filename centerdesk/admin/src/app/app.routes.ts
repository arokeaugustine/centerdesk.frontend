import { Routes } from '@angular/router';
import { adminGuard, guestGuard, ownerGuard } from './core/guards/account.guards';

export const routes: Routes = [
  // ---- The public site
  {
    path: '',
    pathMatch: 'full',
    title: 'CenterDesk — the helpdesk for email and WhatsApp',
    loadComponent: () => import('./features/landing/landing-page').then(m => m.LandingPage),
  },
  {
    path: 'signup',
    canActivate: [guestGuard],
    title: 'Start your free trial — CenterDesk',
    loadComponent: () => import('./features/signup/signup-page').then(m => m.SignupPage),
  },
  { path: 'login', redirectTo: 'auth/login', pathMatch: 'full' },
  {
    // guestGuard sits on the sign-in child, not here: a reset link must still open for someone
    // who happens to be signed in (that is often exactly why they're resetting).
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then(m => m.authRoutes),
  },

  // ---- Workspace owners: their workspace and subscription
  {
    // Bachs returns here after a payment; it confirms the payment even without a session.
    path: 'account/billing/payment-callback',
    title: 'Payment — CenterDesk',
    loadComponent: () => import('./features/account/pages/payment-callback-page').then(m => m.PaymentCallbackPage),
  },
  {
    path: 'account',
    canActivate: [ownerGuard],
    title: 'Your account — CenterDesk',
    loadChildren: () => import('./features/account/account.routes').then(m => m.accountRoutes),
  },

  // ---- CenterDesk's own team: the admin console
  {
    path: '',
    canActivate: [adminGuard],
    loadComponent: () =>
      import('./layout/shell/shell').then(m => m.Shell),
    children: [
      {
        path: 'dashboard',
        title: 'Dashboard — CenterDesk Admin',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(m => m.dashboardRoutes),
      },
      {
        path: 'tenants',
        loadChildren: () =>
          import('./features/tenants/tenants.routes').then(m => m.tenantsRoutes),
      },
      {
        path: 'plans',
        loadChildren: () =>
          import('./features/plans/plans.routes').then(m => m.plansRoutes),
      },
      {
        path: 'subscription',
        loadChildren: () =>
          import('./features/subscription/subscription.routes').then(m => m.subscriptionRoutes),
      },
      {
        path: 'settings',
        loadChildren: () =>
          import('./features/settings/settings.routes').then(m => m.settingsRoutes),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];
