import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import {
  AssignShiftRequest,
  BulkShiftUploadResult,
  CreateShiftRequest,
  CurrentShiftInfo,
  Shift,
  ShiftAssignment,
  UpdateShiftRequest,
} from '../models/shift.models';

@Injectable({ providedIn: 'root' })
export class ShiftService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll() {
    return this.http.get<ApiResult<Shift[]>>(`${this.baseUrl}/api/shifts`);
  }

  getOne(uid: string) {
    return this.http.get<ApiResult<Shift>>(`${this.baseUrl}/api/shifts/${uid}`);
  }

  getCurrent() {
    return this.http.get<ApiResult<CurrentShiftInfo[]>>(`${this.baseUrl}/api/shifts/current`);
  }

  /** date must be "yyyy-MM-dd". */
  getSchedule(date: string) {
    const params = new HttpParams().set('date', date);
    return this.http.get<ApiResult<ShiftAssignment[]>>(`${this.baseUrl}/api/shifts/schedule`, { params });
  }

  create(req: CreateShiftRequest) {
    return this.http.post<ApiResult<Shift>>(`${this.baseUrl}/api/shifts`, req);
  }

  update(uid: string, req: UpdateShiftRequest) {
    return this.http.put<ApiResult<Shift>>(`${this.baseUrl}/api/shifts/${uid}`, req);
  }

  deactivate(uid: string) {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/api/shifts/${uid}`);
  }

  assign(req: AssignShiftRequest) {
    return this.http.post<ApiResult<ShiftAssignment>>(`${this.baseUrl}/api/shifts/schedule`, req);
  }

  removeAssignment(assignmentUid: string) {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/api/shifts/schedule/${assignmentUid}`);
  }

  /** Uploads a CSV of (ShiftCode, UserEmail, Date) rows; the browser sets the multipart boundary. */
  bulkUpload(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResult<BulkShiftUploadResult>>(`${this.baseUrl}/api/shifts/schedule/bulk-upload`, formData);
  }
}
