import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../auth/auth.service';

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
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Redirect to login on 401, but skip auth endpoints to avoid redirect loops
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        auth.logout();
        return throwError(() => error);
      }
      toast.error(extractMessage(error));
      return throwError(() => error);
    })
  );
};
