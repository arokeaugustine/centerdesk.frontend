import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';

/**
 * Set on requests whose failures the page shows itself (sign-in, sign-up, the landing page's live
 * pricing): no extra toast for them.
 */
export const SILENT_ERRORS = new HttpContextToken<boolean>(() => false);

function extractMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Unable to connect. Please check your connection.';

  const body = error.error;
  if (body && typeof body === 'object' && typeof body.message === 'string') {
    return body.message;
  }

  return 'An unexpected error occurred.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!req.context.get(SILENT_ERRORS)) toast.error(extractMessage(error));
      return throwError(() => error);
    })
  );
};
