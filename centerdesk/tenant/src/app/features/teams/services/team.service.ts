import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  AddTeamMemberRequest,
  CreateResolutionTeamRequest,
  ResolutionTeam,
  ResolutionTeamDetail,
  UpdateResolutionTeamRequest,
} from '../models/team.models';

interface ApiResult<T> {
  success: boolean;
  message: string;
  content: T;
}

@Injectable({ providedIn: 'root' })
export class TeamService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll() {
    return this.http.get<ApiResult<ResolutionTeam[]>>(`${this.baseUrl}/api/resolution-teams`);
  }

  getOne(uid: string) {
    return this.http.get<ApiResult<ResolutionTeamDetail>>(`${this.baseUrl}/api/resolution-teams/${uid}`);
  }

  getSubTeams(uid: string) {
    return this.http.get<ApiResult<ResolutionTeam[]>>(`${this.baseUrl}/api/resolution-teams/${uid}/subteams`);
  }

  create(req: CreateResolutionTeamRequest) {
    return this.http.post<ApiResult<ResolutionTeam>>(`${this.baseUrl}/api/resolution-teams`, req);
  }

  update(uid: string, req: UpdateResolutionTeamRequest) {
    return this.http.put<ApiResult<ResolutionTeam>>(`${this.baseUrl}/api/resolution-teams/${uid}`, req);
  }

  deactivate(uid: string) {
    return this.http.delete<ApiResult<null>>(`${this.baseUrl}/api/resolution-teams/${uid}`);
  }

  addMember(uid: string, req: AddTeamMemberRequest) {
    return this.http.post<ApiResult<null>>(`${this.baseUrl}/api/resolution-teams/${uid}/members`, req);
  }

  removeMember(uid: string, userUid: string) {
    return this.http.delete<ApiResult<null>>(`${this.baseUrl}/api/resolution-teams/${uid}/members/${userUid}`);
  }
}
