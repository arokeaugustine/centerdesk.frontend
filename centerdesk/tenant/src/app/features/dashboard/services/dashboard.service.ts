import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { DashboardSummary } from '../models/dashboard.models';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * from/to are ISO instants ("2026-10-05T00:00:00.000Z"); a bare "yyyy-MM-dd" also binds, but
   * the server reads it as UTC, so callers wanting a local calendar day send the real bounds.
   * Both optional — the server defaults to today.
   */
  getSummary(from?: string | null, to?: string | null) {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to) params = params.set('to', to);
    return this.http.get<ApiResult<DashboardSummary>>(`${this.baseUrl}/api/reports/dashboard`, { params });
  }
}
