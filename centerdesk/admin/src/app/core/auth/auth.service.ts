import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { ApiResult, LoginContent, LoginRequest, User } from './auth.models';
import { API_BASE_URL } from '../config/api.config';

const TOKEN_KEY = 'cd_token';
const REFRESH_TOKEN_KEY = 'cd_refresh_token';
const EXPIRES_AT_KEY = 'cd_expires_at';
const USER_KEY = 'cd_user';

// Refresh 60 seconds before the access token expires
const REFRESH_BUFFER_MS = 60_000;

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly router = inject(Router);

  readonly user = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly refreshToken = signal<string | null>(null);
  readonly isAuthenticated = signal(false);

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

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
  }

  login(email: string, password: string) {
    return this.http.post<ApiResult<LoginContent>>(
      `${this.apiBaseUrl}/api/admin/auth/login`,
      { email, password } satisfies LoginRequest
    );
  }

  logout(): void {
    const currentRefreshToken = this.refreshToken();
    this.clearTimer();
    this.clearState();

    if (currentRefreshToken) {
      this.http
        .post(`${this.apiBaseUrl}/api/admin/auth/logout`, {
          refreshToken: currentRefreshToken,
        })
        .subscribe({
          complete: () => this.router.navigate(['/auth/login']),
          error: () => this.router.navigate(['/auth/login']),
        });
    } else {
      this.router.navigate(['/auth/login']);
    }
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
    if (!currentRefreshToken) return;

    this.http
      .post<ApiResult<LoginContent>>(
        `${this.apiBaseUrl}/api/admin/auth/refresh`,
        { refreshToken: currentRefreshToken }
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            const { accessToken, refreshToken, expiresAt } = res.content;
            this.token.set(accessToken);
            this.refreshToken.set(refreshToken);
            localStorage.setItem(TOKEN_KEY, accessToken);
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
            if (expiresAt) {
              localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(EXPIRES_AT_KEY);
    localStorage.removeItem(USER_KEY);
  }
}
