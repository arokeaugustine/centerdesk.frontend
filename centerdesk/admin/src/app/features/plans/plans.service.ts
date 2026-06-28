import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiResult } from '../../core/auth/auth.models';

export interface PlanItem {
  id: number;
  name: string;
  description: string | null;
  monthlyPriceNaira: number;
  annualPriceNaira: number;
  maxUsers: number;
  maxEmailDesks: number;
  maxStorageGb: number;
  hasSla: boolean;
  hasReports: boolean;
  hasApiAccess: boolean;
  sortOrder: number;
  maxUsersDisplay: string;
  maxEmailDesksDisplay: string;
}

@Injectable({ providedIn: 'root' })
export class PlansService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  getPlans() {
    return this.http.get<ApiResult<PlanItem[]>>(
      `${this.apiBaseUrl}/api/plans`
    );
  }
}
