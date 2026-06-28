import { Injectable, inject, computed } from '@angular/core';
import { TenantService } from './tenant.service';

@Injectable({ providedIn: 'root' })
export class TenantStore {
  private readonly tenantService = inject(TenantService);

  readonly tenant = this.tenantService.tenant;
  readonly tenantSlug = computed(() => this.tenantService.tenant()?.slug ?? null);
}
