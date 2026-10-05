import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../auth/auth.service';

function extractMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Unable to connect. Please check your connection.';

  const body = error.error;
  if (!body || typeof body !== 'object') return 'An unexpected error occurred.';

  // The API's own ErrorResult shape.
  if (typeof body.message === 'string') return body.message;

  // ASP.NET's ValidationProblemDetails — what model binding returns when a required parameter
  // is missing. It carries `errors`/`title` and no `message`, so without this a real, specific
  // failure ("The tenantSlug field is required") was being shown as "An unexpected error
  // occurred", which is what hid the broken logout call for so long.
  if (body.errors && typeof body.errors === 'object') {
    const first = Object.values(body.errors as Record<string, unknown>)
      .flat()
      .find((entry): entry is string => typeof entry === 'string');

    if (first) return first;
  }

  if (typeof body.title === 'string') return body.title;

  return 'An unexpected error occurred.';
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const auth = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Auth endpoints are excluded: a 401 from /api/auth/refresh IS the dead session, and
      // retrying it through itself would loop.
      if (error.status === 401 && !req.url.includes('/api/auth/')) {
        // A 401 here means the scheduled refresh didn't land in time — the tab was asleep, the
        // clock skewed, or the token was revoked. Try once to refresh and replay the request,
        // so a user mid-task isn't thrown back to the login screen for a recoverable lapse.
        return auth.refreshAccessToken().pipe(
          switchMap((token) => {
            if (!token) {
              auth.logout();
              return throwError(() => error);
            }

            // The request was cloned with the OLD bearer by authInterceptor, so it has to be
            // re-cloned here; replaying `req` as-is would just 401 again.
            return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
          }),
        );
      }

      toast.error(extractMessage(error));
      return throwError(() => error);
    }),
  );
};
