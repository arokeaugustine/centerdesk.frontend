import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { TicketMessage } from '../../tickets/models/ticket.models';
import {
  CloseSubTicketRequest,
  ReturnSubTicketRequest,
  SubTicketReplyCustomerRequest,
  SubTicketReplyRequest,
  SubTicketSummary,
} from '../models/sub-ticket.models';

interface ApiResult<T> {
  success: boolean;
  message: string;
  content: T;
}

@Injectable({ providedIn: 'root' })
export class SubTicketService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getOne(uid: string) {
    return this.http.get<ApiResult<SubTicketSummary>>(`${this.baseUrl}/api/sub-tickets/${uid}`);
  }

  getMessages(uid: string) {
    return this.http.get<ApiResult<TicketMessage[]>>(`${this.baseUrl}/api/sub-tickets/${uid}/messages`);
  }

  /** Internal-only reply — never sent to the customer. */
  reply(uid: string, req: SubTicketReplyRequest) {
    return this.http.post<ApiResult<TicketMessage>>(`${this.baseUrl}/api/sub-tickets/${uid}/messages`, req);
  }

  /** Requires CanReplyToCustomerFromSubTicket AND the team's CanReplyToCustomer flag. */
  replyToCustomer(uid: string, req: SubTicketReplyCustomerRequest) {
    return this.http.post<ApiResult<TicketMessage>>(`${this.baseUrl}/api/sub-tickets/${uid}/reply-customer`, req);
  }

  close(uid: string, req: CloseSubTicketRequest) {
    return this.http.post<ApiResult<SubTicketSummary>>(`${this.baseUrl}/api/sub-tickets/${uid}/close`, req);
  }

  return(uid: string, req: ReturnSubTicketRequest) {
    return this.http.post<ApiResult<SubTicketSummary>>(`${this.baseUrl}/api/sub-tickets/${uid}/return`, req);
  }
}
