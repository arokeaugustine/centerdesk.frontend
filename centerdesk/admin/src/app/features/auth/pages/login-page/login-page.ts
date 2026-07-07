import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { decodeJwtPayload } from '../../../../core/auth/permission.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { Button } from '../../../../shared/components/button/button';
import { Checkbox } from '../../../../shared/components/checkbox/checkbox';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, Button, Checkbox, InputField, Label],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly form = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  protected showPassword = false;
  protected keepLoggedIn = false;
  protected readonly isLoading = signal(false);

  protected togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  protected onSignIn(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.isLoading.set(true);

    this.authService.login(email!, password!).subscribe({
      next: (res) => {
        if (res.success) {
          const claims = decodeJwtPayload(res.content.accessToken);
          const role = claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] as string | undefined;
          this.authService.setAuth(
            {
              id: (claims['uid'] as string) ?? '',
              email: res.content.email,
              userName: res.content.userName,
              roles: role ? [role] : [],
              userType: (claims['user-type'] as string) ?? '',
            },
            res.content.accessToken,
            res.content.refreshToken,
            res.content.expiresAt
          );
          this.router.navigate(['/dashboard']);
        } else {
          this.toast.error(res.message || 'Login failed. Please check your credentials.');
          this.isLoading.set(false);
        }
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }
}
