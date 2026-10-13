import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import {
  CreateWhatsAppChannelRequest,
  UpdateWhatsAppChannelRequest,
  WhatsAppChannel,
  WhatsAppConnectionTestResult,
} from '../models/whatsapp-channel.models';

@Injectable({ providedIn: 'root' })
export class WhatsAppChannelService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private get base() {
    return `${this.apiBaseUrl}/api/whatsapp-channels`;
  }

  getAll() {
    return this.http.get<ApiResult<WhatsAppChannel[]>>(this.base);
  }

  create(request: CreateWhatsAppChannelRequest) {
    return this.http.post<ApiResult<WhatsAppChannel>>(this.base, request);
  }

  update(uid: string, request: UpdateWhatsAppChannelRequest) {
    return this.http.put<ApiResult<WhatsAppChannel>>(`${this.base}/${uid}`, request);
  }

  /** Soft delete — the API deactivates the channel; its tickets keep their history. */
  deactivate(uid: string) {
    return this.http.delete<ApiResult<string>>(`${this.base}/${uid}`);
  }

  testConnection(uid: string) {
    return this.http.post<ApiResult<WhatsAppConnectionTestResult>>(`${this.base}/${uid}/test`, {});
  }
}
