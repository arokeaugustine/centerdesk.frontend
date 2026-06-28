import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

@Injectable({ providedIn: 'root' })
export class HttpErrorHandler {
  handle(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Network error. Please check your connection.';
    return (error.error as { message?: string })?.message ?? `Server error: ${error.status}`;
  }
}
