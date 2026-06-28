import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TenantService {
  readonly tenantId = signal<string | null>(null);

  setTenant(id: string): void {
    this.tenantId.set(id);
  }

  init(): Promise<void> {
    const hostname = window.location.hostname;
    const subdomain = hostname.split('.')[0];
    if (subdomain && subdomain !== 'localhost') {
      this.tenantId.set(subdomain);
    }
    return Promise.resolve();
  }
}
