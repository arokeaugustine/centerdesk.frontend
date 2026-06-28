import { Injectable, inject, signal, computed } from '@angular/core';
import { AuthService } from './auth.service';
import { AuthState } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthStore {
  private readonly authService = inject(AuthService);

  readonly state = signal<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
  });

  readonly user = computed(() => this.state().user);
  readonly isAuthenticated = computed(() => this.state().isAuthenticated);
}
