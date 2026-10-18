import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { TenantSettings, UpdateTenantSettingsRequest } from '../models/settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get() {
    return this.http.get<ApiResult<TenantSettings>>(`${this.baseUrl}/api/settings`);
  }

  /** Sends only the changed fields; the API leaves anything omitted alone. */
  update(req: UpdateTenantSettingsRequest) {
    return this.http.put<ApiResult<TenantSettings>>(`${this.baseUrl}/api/settings`, req);
  }
}
