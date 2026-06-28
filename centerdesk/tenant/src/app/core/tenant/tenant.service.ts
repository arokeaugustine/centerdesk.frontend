import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SlugCheckContent, Tenant } from './tenant.models';

interface SlugCheckResult {
  success: boolean;
  content: SlugCheckContent;
}

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly http = inject(HttpClient);

  readonly tenant = signal<Tenant | null>(null);
  readonly tenantSlug = signal<string | null>(null);
  readonly notFound = signal(false);

  init(): Promise<void> {
    const slug = this.resolveSlug();
    if (!slug) {
      this.notFound.set(true);
      return Promise.resolve();
    }

    return firstValueFrom(
      this.http.get<SlugCheckResult>(`${environment.apiBaseUrl}/api/register/check-slug/${slug}`)
    )
      .then(res => {
        if (res.success && !res.content.available) {
          this.tenant.set({ slug });
          this.tenantSlug.set(slug);
        } else {
          this.notFound.set(true);
        }
      })
      .catch(() => {
        this.notFound.set(true);
      });
  }

  private resolveSlug(): string | null {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');

    // white-wash.localhost  (local dev with hosts file)
    if (parts.length === 2 && parts[1] === 'localhost') {
      return parts[0];
    }

    // white-wash.centerdesk.io  (production)
    if (parts.length >= 3) {
      return parts[0];
    }

    return null;
  }
}
