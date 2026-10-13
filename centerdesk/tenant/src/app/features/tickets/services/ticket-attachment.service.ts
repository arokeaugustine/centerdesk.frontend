import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { TicketAttachment } from '../models/ticket.models';

/**
 * Reply-box uploads. Kept apart from TicketService (which is part of the initial bundle) so it's
 * only loaded with the ticket page.
 */
@Injectable({ providedIn: 'root' })
export class TicketAttachmentService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Uploads one file before the reply is sent, reporting progress. The returned attachment's uid
   * goes into ReplyMessageRequest.attachmentUids; uploads never sent are deleted after a day.
   */
  upload(file: File) {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http.post<ApiResult<TicketAttachment>>(`${this.baseUrl}/api/attachments/uploads`, form, {
      reportProgress: true,
      observe: 'events',
    });
  }

  /** Removes an uploaded file the agent took back out of the reply box. */
  remove(uid: string) {
    return this.http.delete<ApiResult<string>>(`${this.baseUrl}/api/attachments/uploads/${uid}`);
  }
}
