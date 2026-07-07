import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import {
  CreateEmailDeskRequest,
  EmailDesk,
  TestConnectionResult,
  UpdateEmailDeskRequest,
} from '../models/email-desk.models';

@Injectable({ providedIn: 'root' })
export class EmailDeskService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private get base() {
    return `${this.apiBaseUrl}/api/email-desks`;
  }

  getAll() {
    return this.http.get<ApiResult<EmailDesk[]>>(this.base);
  }

  getOne(uid: string) {
    return this.http.get<ApiResult<EmailDesk>>(`${this.base}/${uid}`);
  }

  create(request: CreateEmailDeskRequest) {
    return this.http.post<ApiResult<EmailDesk>>(this.base, request);
  }

  update(uid: string, request: UpdateEmailDeskRequest) {
    return this.http.put<ApiResult<EmailDesk>>(`${this.base}/${uid}`, request);
  }

  delete(uid: string) {
    return this.http.delete<void>(`${this.base}/${uid}`);
  }

  testConnection(uid: string) {
    return this.http.post<ApiResult<TestConnectionResult>>(`${this.base}/${uid}/test`, {});
  }
}
