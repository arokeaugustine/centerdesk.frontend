import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, map, of, shareReplay, catchError } from 'rxjs';
import { ApiResult, LoginContent, LoginRequest, User } from './auth.models';
import { API_BASE_URL } from '../config/api.config';
import { TenantService } from '../tenant/tenant.service';
import { ToastService } from '../../shared/services/toast.service';

const TOKEN_KEY = 'cd_token';
const REFRESH_TOKEN_KEY = 'cd_refresh_token';
const EXPIRES_AT_KEY = 'cd_expires_at';
const USER_KEY = 'cd_user';

/** Refresh this far ahead of expiry, so a slow round trip still lands before the token dies. */
const REFRESH_BUFFER_MS = 5 * 60_000;

/**
 * setTimeout is not a reliable alarm: background tabs are throttled, and a sleeping machine
 * doesn't run timers at all, so a timer set for 55 minutes can fire well after the token has
 * already expired. This re-checks the real clock on a short interval, and on tab focus, which
 * is what actually catches a laptop coming back from sleep.
 */
const EXPIRY_POLL_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);
  private readonly tenantService = inject(TenantService);
  private readonly toast = inject(ToastService);

  readonly user = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly isAuthenticated = signal(false);

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private expiryPoll: ReturnType<typeof setInterval> | null = null;

  /**
   * The in-flight refresh, shared so that N requests failing with 401 at once produce ONE
   * refresh call rather than N — each extra one would rotate the refresh token again and
   * invalidate the others, logging the user out for being too busy.
   */
  private refreshInFlight: Observable<string | null> | null = null;

  constructor() {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    const savedExpiresAt = localStorage.getItem(EXPIRES_AT_KEY);
    const savedUser = localStorage.getItem(USER_KEY);

    if (savedToken && savedUser && savedRefreshToken) {
      try {
        this.user.set(JSON.parse(savedUser));
        this.token.set(savedToken);
        this.refreshToken.set(savedRefreshToken);
        this.isAuthenticated.set(true);
        this.scheduleRefresh(savedExpiresAt);
      } catch {
        this.clearStorage();
      }
    }

    // Catches the cases a timer alone can't: a throttled background tab, or a machine that was
    // asleep when the timer should have fired.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.refreshIfDueSoon();
    });
  }

  /** Milliseconds until the access token expires; negative once it already has. */
  private msUntilExpiry(): number {
    const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
    return expiresAt ? new Date(expiresAt).getTime() - Date.now() : Number.POSITIVE_INFINITY;
  }

  private refreshIfDueSoon(): void {
    if (!this.isAuthenticated() || !this.refreshToken()) return;
    if (this.msUntilExpiry() > REFRESH_BUFFER_MS) return;

    this.refreshAccessToken().subscribe();
  }

  /**
   * Refreshes the access token, returning the new one (or null if the session is truly over).
   * Safe to call concurrently — callers share one request.
   */
  refreshAccessToken(): Observable<string | null> {
    if (this.refreshInFlight) return this.refreshInFlight;

    const currentRefreshToken = this.refreshToken();
    if (!currentRefreshToken) return of(null);

    const slug = this.tenantService.tenantSlug();
    const url = slug
      ? `${this.apiBaseUrl}/api/auth/refresh?tenantSlug=${slug}`
      : `${this.apiBaseUrl}/api/auth/refresh`;

    this.refreshInFlight = this.http
      .post<ApiResult<LoginContent>>(url, { refreshToken: currentRefreshToken })
      .pipe(
        map((res) => {
          if (!res.success) return null;

          const { accessToken, refreshToken, expiresAt } = res.content;
          this.token.set(accessToken);
          this.refreshToken.set(refreshToken);
          localStorage.setItem(TOKEN_KEY, accessToken);
          localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
          if (expiresAt) localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
          this.scheduleRefresh(expiresAt);

          return accessToken;
        }),
        // A failed refresh is not automatically a dead session — the network may just be down.
        // Returning null lets the caller decide; only an explicit rejection ends the session.
        catchError(() => of(null)),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    // Cleared on completion so the NEXT expiry gets a fresh request rather than this replay.
    this.refreshInFlight.subscribe({
      complete: () => (this.refreshInFlight = null),
      error: () => (this.refreshInFlight = null),
    });

    return this.refreshInFlight;
  }

  login(email: string, password: string) {
    const slug = this.tenantService.tenantSlug();
    const url = slug
      ? `${this.apiBaseUrl}/api/auth/login?tenantSlug=${slug}`
      : `${this.apiBaseUrl}/api/auth/login`;
    return this.http.post<ApiResult<LoginContent>>(url, { email, password } satisfies LoginRequest);
  }

  logout(): void {
    const currentRefreshToken = this.refreshToken();
    const slug = this.tenantService.tenantSlug();
    this.clearTimer();
    this.clearState();

    if (!currentRefreshToken) {
      this.router.navigate(['/auth/login']);
      return;
    }

    // tenantSlug goes in the QUERY STRING, exactly as login and refresh send it — the endpoint
    // binds it [FromQuery] and the X-Tenant-Slug header the interceptor adds doesn't satisfy it.
    // Without it the request 400s before RevokeTokenAsync runs, so the refresh token was never
    // actually revoked and stayed valid for its full 7 days after a "successful" logout.
    const url = slug
      ? `${this.apiBaseUrl}/api/auth/logout?tenantSlug=${slug}`
      : `${this.apiBaseUrl}/api/auth/logout`;

    this.http
      .post<ApiResult<unknown>>(url, { refreshToken: currentRefreshToken })
      .subscribe({
        next: (res) => this.toast.success(res?.message || 'Logged out successfully.'),
        // The local session is already gone either way, so a failed revoke still lands the user
        // on the login page; errorInterceptor surfaces why.
        error: () => this.router.navigate(['/auth/login']),
        complete: () => this.router.navigate(['/auth/login']),
      });
  }

  setAuth(user: User, accessToken: string, refreshToken: string, expiresAt?: string): void {
    this.user.set(user);
    this.token.set(accessToken);
    this.refreshToken.set(refreshToken);
    this.isAuthenticated.set(true);

    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (expiresAt) {
      localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
    }

    this.scheduleRefresh(expiresAt ?? null);
  }

  private scheduleRefresh(expiresAt: string | null | undefined): void {
    this.clearTimer();
    if (!expiresAt) return;

    const delayMs = new Date(expiresAt).getTime() - Date.now() - REFRESH_BUFFER_MS;

    if (delayMs <= 0) {
      this.refreshAccessToken().subscribe();
    } else {
      this.refreshTimer = setTimeout(() => this.refreshAccessToken().subscribe(), delayMs);
    }

    // Backstop for the timer firing late or not at all — see EXPIRY_POLL_MS.
    this.expiryPoll ??= setInterval(() => this.refreshIfDueSoon(), EXPIRY_POLL_MS);
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
    if (this.expiryPoll !== null) {
      clearInterval(this.expiryPoll);
      this.expiryPoll = null;
    }
  }

  private clearState(): void {
    this.user.set(null);
    this.token.set(null);
    this.refreshToken.set(null);
    this.isAuthenticated.set(false);
    this.clearStorage();
  }

  private clearStorage(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
