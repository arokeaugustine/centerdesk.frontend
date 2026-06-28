import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { TenantService } from '../tenant/tenant.service';

export const tenantInterceptor: HttpInterceptorFn = (req, next) => {
  const slug = inject(TenantService).tenantSlug();
  if (slug) {
    return next(req.clone({ setHeaders: { 'X-Tenant-Slug': slug } }));
  }
  return next(req);
};
