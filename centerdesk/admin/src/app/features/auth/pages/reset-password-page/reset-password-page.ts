import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthSplitLayout } from '../../../../shared/site/auth-split-layout';

/** The two password boxes must agree before the form can be sent. */
function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirmPassword')?.value;
  return !confirm || password === confirm ? null : { mismatch: true };
}

/**
 * Where a reset link from the main site lands. The token in the query string says which account
 * it belongs to — a system admin or a workspace owner — so the page checks the link first and
 * only then asks for a new password, rather than letting someone type one out and finding the
 * link expired afterwards.
 */
@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, RouterLink, NgClass, AuthSplitLayout],
  templateUrl: './reset-password-page.html',
})
export class ResetPasswordPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = new FormGroup(
    {
      password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8)] }),
      confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  protected readonly checking = signal(true);
  protected readonly isLoading = signal(false);
  /** The address the link was issued for, once it checks out. */
  protected readonly email = signal<string | null>(null);
  protected readonly linkError = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal(false);

  protected readonly showPassword = signal(false);
  protected readonly showConfirm = signal(false);

  private token = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';

    if (!this.token) {
      this.checking.set(false);
      this.linkError.set('This password reset link is incomplete. Please use the link from your email, or request a new one.');
      return;
    }

    this.auth.checkResetToken(this.token).subscribe({
      next: (res) => {
        this.checking.set(false);
        if (res.success && res.content?.valid) {
          this.email.set(res.content.email);
        } else {
          this.linkError.set(res.content?.reason || res.message || 'This password reset link is no longer valid.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.checking.set(false);
        this.linkError.set(
          err.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : err.status === 0 ? 'We couldn’t reach CenterDesk. Check your connection and try again.'
          : err.error?.message || 'We couldn’t check that link just now. Please try again in a moment.'
        );
      },
    });
  }

  protected submit(): void {
    if (this.isLoading()) return;
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.auth.resetPassword(this.token, this.form.controls.password.value).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) this.done.set(true);
        else this.error.set(res.message || 'We couldn’t change your password. Please request a new link.');
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.error.set(
          err.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : err.status === 0 ? 'We couldn’t reach CenterDesk. Check your connection and try again.'
          : err.error?.message || 'We couldn’t change your password. Please request a new link.'
        );
      },
    });
  }

  protected invalid(name: 'password' | 'confirmPassword'): boolean {
    const c = this.form.controls[name];
    return (c.invalid || (name === 'confirmPassword' && this.form.hasError('mismatch'))) && c.touched;
  }
}
