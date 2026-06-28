import { CanActivateFn, ActivatedRouteSnapshot } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const requiredRoles: string[] = route.data['roles'] ?? [];
  const userRoles = auth.user()?.roles ?? [];
  const hasRole = requiredRoles.length === 0 || requiredRoles.some(r => userRoles.includes(r));
  return hasRole ? true : router.createUrlTree(['/forbidden']);
};
