import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { AvailablePermissionGroup, CreateRoleRequest, RoleDetail, RoleSummary, UpdateRoleRequest } from '../models/role.models';

@Injectable({ providedIn: 'root' })
export class RoleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll() {
    return this.http.get<ApiResult<RoleSummary[]>>(`${this.baseUrl}/api/roles`);
  }

  getOne(uid: string) {
    return this.http.get<ApiResult<RoleDetail>>(`${this.baseUrl}/api/roles/${uid}`);
  }

  create(req: CreateRoleRequest) {
    return this.http.post<ApiResult<{ uid: string; name: string }>>(`${this.baseUrl}/api/roles`, req);
  }

  update(uid: string, req: UpdateRoleRequest) {
    return this.http.put<ApiResult<{ uid: string; name: string; description: string | null }>>(`${this.baseUrl}/api/roles/${uid}`, req);
  }

  delete(uid: string) {
    return this.http.delete(`${this.baseUrl}/api/roles/${uid}`, { observe: 'response' });
  }

  setPermissions(uid: string, permissions: string[]) {
    return this.http.put<ApiResult<string>>(`${this.baseUrl}/api/roles/${uid}/permissions`, { permissions });
  }

  getAvailablePermissions() {
    return this.http.get<ApiResult<AvailablePermissionGroup[]>>(`${this.baseUrl}/api/roles/available-permissions`);
  }
}
