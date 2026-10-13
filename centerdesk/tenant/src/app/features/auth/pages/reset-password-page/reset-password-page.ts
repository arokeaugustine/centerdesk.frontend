import { Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { ToastService } from '../../../../shared/services/toast.service';
import { AuthLayout } from '../../../../shared/components/common/auth-layout/auth-layout';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

/** The two password boxes must agree before the form can be sent. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return !confirm || password === confirm ? null : { mismatch: true };
}

/**
 * Where a reset link lands. The token in the query string says which account is being reset, so
 * the page checks it first and only then asks for a new password — far better than letting
 * someone type one out and finding the link expired afterwards.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, Button, InputField, Label],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  protected readonly form = new FormGroup(
    {
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  protected readonly checking = signal(true);
  protected readonly isLoading = signal(false);
  /** Null while checking; the address the link was issued for once it checks out. */
  protected readonly email = signal<string | null>(null);
  protected readonly linkError = signal<string | null>(null);
  protected readonly done = signal(false);

  protected showPassword = false;
  protected showConfirm = false;

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.checking.set(false);
      this.linkError.set('This password reset link is incomplete. Please use the link from your email, or request a new one.');
      return;
    }

    this.authService.checkResetToken(this.token).subscribe({
      next: (res) => {
        this.checking.set(false);
        if (res.success && res.content?.valid) {
          this.email.set(res.content.email);
        } else {
          this.linkError.set(res.content?.reason || res.message || 'This password reset link is no longer valid.');
        }
      },
      error: () => {
        this.checking.set(false);
        this.linkError.set('We couldn’t check that link just now. Please try again in a moment.');
      },
    });
  }

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.authService.resetPassword(this.token, this.form.controls.password.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (!res.success) {
          this.linkError.set(res.message);
          return;
        }
        this.done.set(true);
        this.toast.success(res.message || 'Your password has been changed.');
      },
      error: () => this.isLoading.set(false),
    });
  }

  protected goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}
