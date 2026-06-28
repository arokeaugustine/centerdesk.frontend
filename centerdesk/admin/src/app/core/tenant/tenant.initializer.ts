import { inject } from '@angular/core';
import { TenantService } from './tenant.service';

export function tenantInitializer(): Promise<void> {
  return inject(TenantService).init();
}
