import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import {
  AssignTicketRequest,
  CloseTicketRequest,
  CreateTicketRequest,
  ReopenTicketRequest,
  ReplyMessageRequest,
  Ticket,
  TicketListContent,
  TicketMessage,
  TicketSearchQuery,
  UpdateTicketStatusRequest,
} from '../models/ticket.models';

interface Paging {
  pageIndex: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface ApiResult<T> {
  success: boolean;
  message: string;
  content: T;
  paging: Paging | null;
}

@Injectable({ providedIn: 'root' })
export class TicketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(query: TicketSearchQuery = {}) {
    let params = new HttpParams()
      .set('page', String(query.page ?? 1))
      .set('pageSize', String(query.pageSize ?? 20));
    if (query.search) params = params.set('search', query.search);
    if (query.status != null) params = params.set('status', String(query.status));
    if (query.priority != null) params = params.set('priority', String(query.priority));
    if (query.assignedTo != null) params = params.set('assignedTo', String(query.assignedTo));
    if (query.emailDeskId != null) params = params.set('emailDeskId', String(query.emailDeskId));
    return this.http.get<ApiResult<TicketListContent>>(`${this.baseUrl}/api/tickets`, { params });
  }

  getOne(uid: string) {
    return this.http.get<ApiResult<Ticket>>(`${this.baseUrl}/api/tickets/${uid}`);
  }

  create(req: CreateTicketRequest) {
    return this.http.post<ApiResult<Ticket>>(`${this.baseUrl}/api/tickets`, req);
  }

  assign(uid: string, req: AssignTicketRequest) {
    return this.http.post<ApiResult<Ticket>>(`${this.baseUrl}/api/tickets/${uid}/assign`, req);
  }

  updateStatus(uid: string, req: UpdateTicketStatusRequest) {
    return this.http.patch<ApiResult<Ticket>>(`${this.baseUrl}/api/tickets/${uid}/status`, req);
  }

  close(uid: string, req: CloseTicketRequest) {
    return this.http.post<ApiResult<Ticket>>(`${this.baseUrl}/api/tickets/${uid}/close`, req);
  }

  reopen(uid: string, req: ReopenTicketRequest) {
    return this.http.post<ApiResult<Ticket>>(`${this.baseUrl}/api/tickets/${uid}/reopen`, req);
  }

  getMessages(ticketUid: string) {
    return this.http.get<ApiResult<TicketMessage[]>>(
      `${this.baseUrl}/api/tickets/${ticketUid}/messages`
    );
  }

  replyMessage(ticketUid: string, req: ReplyMessageRequest) {
    return this.http.post<ApiResult<TicketMessage>>(
      `${this.baseUrl}/api/tickets/${ticketUid}/messages/reply`,
      req
    );
  }

  markMessageRead(ticketUid: string, messageUid: string) {
    return this.http.patch<ApiResult<void>>(
      `${this.baseUrl}/api/tickets/${ticketUid}/messages/${messageUid}/read`,
      {}
    );
  }
}
