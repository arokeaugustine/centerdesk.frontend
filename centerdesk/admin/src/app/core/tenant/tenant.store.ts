import { Injectable, signal, computed } from '@angular/core';
import { Tenant } from './tenant.models';

@Injectable({ providedIn: 'root' })
export class TenantStore {
  readonly tenant = signal<Tenant | null>(null);
  readonly tenantId = computed(() => this.tenant()?.id ?? null);

  setTenant(tenant: Tenant): void {
    this.tenant.set(tenant);
  }
}
