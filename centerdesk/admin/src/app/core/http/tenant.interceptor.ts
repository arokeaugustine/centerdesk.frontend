import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { API_BASE_URL } from '../config/api.config';

/**
 * A workspace owner's session works inside their own workspace: every API call carries its slug
 * (X-Tenant-Slug), which the API checks against the token's workspace. System admins and visitors
 * send none.
 */
export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const apiBaseUrl = inject(API_BASE_URL);
  const slug = auth.isOwner() ? auth.user()?.tenantSlug : null;

  if (slug && req.url.startsWith(apiBaseUrl) && !req.headers.has('X-Tenant-Slug')) {
    return next(req.clone({ setHeaders: { 'X-Tenant-Slug': slug } }));
  }
  return next(req);
};
