import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { ApiResult } from '../auth/auth.models';

export interface DashboardSummary {
  totalTenants: number;
  totalActivePlans: number;
  totalActiveSubscriptions: number;
  currentMonthlyRevenueNaira: number;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getDashboardSummary() {
    return this.http.get<ApiResult<DashboardSummary>>(
      `${this.apiBaseUrl}/api/admin/reports/summary`
    );
  }
}
