import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthSplitLayout } from '../../../../shared/site/auth-split-layout';
import { environment } from '../../../../../environments/environment';

/**
 * "Forgot password" for the main site's two kinds of account: a CenterDesk system admin and a
 * workspace owner. The server answers the same way whether or not the address belongs to either,
 * so this page never says which — it only confirms the request was taken. Agents reset at their
 * own workspace's address, which the note at the bottom points them to.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, NgClass, AuthSplitLayout],
  templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);

  protected readonly domain = environment.workspaceDomain;

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly sentTo = signal<string | null>(null);

  protected submit(): void {
    if (this.isLoading()) return;
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value.trim();
    this.isLoading.set(true);

    this.auth.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.sentTo.set(email);
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.error.set(
          err.status === 429 ? 'Too many requests. Please wait a few minutes and try again.'
          : err.status === 0 ? 'We couldn’t reach CenterDesk. Check your connection and try again.'
          : err.error?.message || 'We couldn’t send that just now. Please try again.'
        );
      },
    });
  }

  protected get invalidEmail(): boolean {
    const c = this.form.controls.email;
    return c.invalid && c.touched;
  }
}
