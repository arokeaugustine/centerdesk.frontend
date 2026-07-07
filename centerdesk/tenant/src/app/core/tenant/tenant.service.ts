import { Injectable, signal } from '@angular/core';
import { Tenant } from './tenant.models';

@Injectable({ providedIn: 'root' })
export class TenantService {
  readonly tenant = signal<Tenant | null>(null);
  readonly tenantSlug = signal<string | null>(null);
  readonly notFound = signal(false);

  init(): Promise<void> {
    const slug = this.resolveSlug();
    if (!slug) {
      this.notFound.set(true);
      return Promise.resolve();
    }

    this.tenant.set({ slug });
    this.tenantSlug.set(slug);
    return Promise.resolve();
  }

  private resolveSlug(): string | null {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // fot-club.localhost:4200
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }

    // fot-club.centerdesk.io
    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }
}
