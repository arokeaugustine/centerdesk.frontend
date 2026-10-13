import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Router } from '@angular/router';
import { AccountKind, AccountLoginContent, ApiResult, LoginContent, LoginRequest, PasswordResetCheck, User } from './auth.models';
import { API_BASE_URL } from '../config/api.config';
import { SILENT_ERRORS } from '../http/error.interceptor';
import { decodeJwtPayload } from './jwt';

const TOKEN_KEY = 'cd_token';
const REFRESH_TOKEN_KEY = 'cd_refresh_token';
const EXPIRES_AT_KEY = 'cd_expires_at';
const USER_KEY = 'cd_user';

/** Refresh this far ahead of expiry, so a slow round trip still lands before the token dies. */
const REFRESH_BUFFER_MS = 5 * 60_000;

const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

/**
 * The session on the main site. Two kinds of people sign in here (see {@link AccountKind}): system
 * admins, whose tokens come from and refresh at /api/admin/auth, and workspace owners, whose tokens
 * belong to their own workspace and refresh at /api/auth with its slug. The kind is decided by the
 * server at login and only ever narrows what the app shows — the API enforces it regardless.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly isAuthenticated = signal(false);

  readonly kind = computed<AccountKind | null>(() => this.user()?.kind ?? null);
  readonly isAdmin = computed(() => this.isAuthenticated() && this.kind() === 'admin');
  readonly isOwner = computed(() => this.isAuthenticated() && this.kind() === 'tenant');

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const savedToken = this.read(TOKEN_KEY);
    const savedRefreshToken = this.read(REFRESH_TOKEN_KEY);
    const savedExpiresAt = this.read(EXPIRES_AT_KEY);
    const savedUser = this.read(USER_KEY);

    if (savedToken && savedUser && savedRefreshToken) {
      try {
        const user = JSON.parse(savedUser) as User;
        // Sessions saved before workspace owners could sign in here were all admins.
        user.kind = user.kind ?? 'admin';
        this.user.set(user);
        this.token.set(savedToken);
        this.refreshToken.set(savedRefreshToken);
        this.isAuthenticated.set(true);
        this.scheduleRefresh(savedExpiresAt);
      } catch {
        this.clearStorage();
      }
    }
  }

  /** The single login: the answer says whether this is a system admin or a workspace owner. */
  loginAccount(email: string, password: string) {
    return this.http.post<ApiResult<AccountLoginContent>>(
      `${this.apiBaseUrl}/api/auth/login/account`,
      { email, password } satisfies LoginRequest,
      { context: new HttpContext().set(SILENT_ERRORS, true) }
    );
  }

  /**
   * Asks for a password reset link. The main site's endpoint covers both kinds of account — a
   * system admin or a workspace owner — and answers the same whether or not the address has one,
   * so nothing here should be shown as "we found you" / "we didn't". Agents ask at their own
   * workspace instead.
   */
  forgotPassword(email: string) {
    return this.http.post<ApiResult<unknown>>(
      `${this.apiBaseUrl}/api/auth/forgot-password/account`,
      { email },
      { context: new HttpContext().set(SILENT_ERRORS, true) }
    );
  }

  /** Whether a link from a reset email is still usable, checked before asking for a password. */
  checkResetToken(token: string) {
    return this.http.get<ApiResult<PasswordResetCheck>>(
      `${this.apiBaseUrl}/api/auth/reset-password`,
      { params: { token }, context: new HttpContext().set(SILENT_ERRORS, true) }
    );
  }

  /** The token says which account it belongs to, so the reset endpoint is shared with the workspace app. */
  resetPassword(token: string, newPassword: string) {
    return this.http.post<ApiResult<unknown>>(
      `${this.apiBaseUrl}/api/auth/reset-password`,
      { token, newPassword },
      { context: new HttpContext().set(SILENT_ERRORS, true) }
    );
  }

  /** Starts the session the login (or a fresh sign-up) returned. */
  startSession(content: AccountLoginContent): void {
    const claims = decodeJwtPayload(content.accessToken);
    const role = claims[ROLE_CLAIM] as string | undefined;
    this.setAuth(
      {
        id: (claims['uid'] as string) ?? (claims['sub'] as string) ?? '',
        email: content.email,
        userName: content.userName,
        roles: role ? [role] : [],
        userType: (claims['user-type'] as string) ?? '',
        kind: content.kind,
        tenantSlug: content.tenantSlug,
        tenantName: content.tenantName,
        workspaceUrl: content.workspaceUrl,
      },
      content.accessToken,
      content.refreshToken,
      content.expiresAt
    );
  }

  /** Where a signed-in person belongs: the admin console or their account area. */
  homeUrl(kind: AccountKind | null = this.kind()): string {
    return kind === 'tenant' ? '/account' : '/dashboard';
  }

  /** A return URL is only followed into the part of the app the person may use. */
  allowedReturnUrl(url: string | null | undefined, kind: AccountKind | null = this.kind()): string | null {
    if (!url || !url.startsWith('/') || url.startsWith('//')) return null;
    const ownerArea = url === '/account' || url.startsWith('/account/') || url.startsWith('/account?');
    if (kind === 'tenant') return ownerArea ? url : null;
    if (kind === 'admin') return ownerArea || url.startsWith('/auth') || url === '/signup' ? null : url;
    return null;
  }

  logout(redirectTo: string = '/auth/login'): void {
    const currentRefreshToken = this.refreshToken();
    const user = this.user();
    this.clearTimer();
    this.clearState();

    if (currentRefreshToken) {
      const url = user?.kind === 'tenant' && user.tenantSlug
        ? `${this.apiBaseUrl}/api/auth/logout?tenantSlug=${encodeURIComponent(user.tenantSlug)}`
        : `${this.apiBaseUrl}/api/admin/auth/logout`;
      this.http
        .post(url, { refreshToken: currentRefreshToken }, { context: new HttpContext().set(SILENT_ERRORS, true) })
        .subscribe({
          complete: () => this.router.navigateByUrl(redirectTo),
          error: () => this.router.navigateByUrl(redirectTo),
        });
    } else {
      this.router.navigateByUrl(redirectTo);
    }
  }

  setAuth(user: User, accessToken: string, refreshToken: string, expiresAt?: string): void {
    this.user.set(user);
    this.token.set(accessToken);
    this.refreshToken.set(refreshToken);
    this.isAuthenticated.set(true);

    this.write(TOKEN_KEY, accessToken);
    this.write(REFRESH_TOKEN_KEY, refreshToken);
    this.write(USER_KEY, JSON.stringify(user));
    if (expiresAt) {
      this.write(EXPIRES_AT_KEY, expiresAt);
    }

    this.scheduleRefresh(expiresAt ?? null);
  }

  private scheduleRefresh(expiresAt: string | null | undefined): void {
    this.clearTimer();

    if (!expiresAt) return;

    const expiresMs = new Date(expiresAt).getTime();
    const nowMs = Date.now();
    const delayMs = expiresMs - nowMs - REFRESH_BUFFER_MS;

    if (delayMs <= 0) {
      // Token already expired or expiring imminently — refresh now
      this.doRefresh();
    } else {
      this.refreshTimer = setTimeout(() => this.doRefresh(), delayMs);
    }
  }

  private doRefresh(): void {
    const currentRefreshToken = this.refreshToken();
    const user = this.user();
    if (!currentRefreshToken || !user) return;

    const url = user.kind === 'tenant' && user.tenantSlug
      ? `${this.apiBaseUrl}/api/auth/refresh?tenantSlug=${encodeURIComponent(user.tenantSlug)}`
      : `${this.apiBaseUrl}/api/admin/auth/refresh`;

    this.http
      .post<ApiResult<LoginContent>>(url, { refreshToken: currentRefreshToken },
        { context: new HttpContext().set(SILENT_ERRORS, true) })
      .subscribe({
        next: (res) => {
          if (res.success) {
            const { accessToken, refreshToken, expiresAt } = res.content;
            this.token.set(accessToken);
            this.refreshToken.set(refreshToken);
            this.write(TOKEN_KEY, accessToken);
            this.write(REFRESH_TOKEN_KEY, refreshToken);
            if (expiresAt) {
              this.write(EXPIRES_AT_KEY, expiresAt);
            }
            this.scheduleRefresh(expiresAt);
          } else {
            this.logout();
          }
        },
        error: () => this.logout(),
      });
  }

  private clearTimer(): void {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
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
    for (const key of [TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRES_AT_KEY, USER_KEY]) {
      try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
    }
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private write(key: string, value: string): void {
    try { localStorage.setItem(key, value); } catch { /* storage unavailable: session lasts this tab */ }
  }
}
