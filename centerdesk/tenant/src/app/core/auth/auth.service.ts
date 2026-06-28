import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { User } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);

  readonly user = signal<User | null>(null);
  readonly token = signal<string | null>(null);
  readonly isAuthenticated = signal(false);

  login(email: string, password: string) {
    return this.http.post<{ user: User; token: string }>('/api/auth/login', { email, password });
  }

  logout(): void {
    this.user.set(null);
    this.token.set(null);
    this.isAuthenticated.set(false);
  }

  setAuth(user: User, token: string): void {
    this.user.set(user);
    this.token.set(token);
    this.isAuthenticated.set(true);
  }
}
