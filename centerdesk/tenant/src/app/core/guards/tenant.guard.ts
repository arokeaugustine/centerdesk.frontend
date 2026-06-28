import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TenantService } from '../tenant/tenant.service';

export const tenantGuard: CanActivateFn = () => {
  const tenantService = inject(TenantService);
  if (tenantService.notFound()) {
    inject(Router).navigate(['/not-found'], { replaceUrl: true });
    return false;
  }
  return true;
};
