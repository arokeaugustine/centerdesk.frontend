import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthLayout } from '../../../../shared/components/common/auth-layout/auth-layout';
import { Button } from '../../../../shared/components/button/button';
import { InputField } from '../../../../shared/components/input-field/input-field';
import { Label } from '../../../../shared/components/label/label';

/**
 * Asks for the address to send a reset link to. The server answers the same way whether or not
 * that address belongs to anyone here, so this page never says which it was — it just confirms
 * the request was taken.
 */
@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, Button, InputField, Label],
  templateUrl: './forgot-password-page.html',
})
export class ForgotPasswordPage {
  private readonly authService = inject(AuthService);

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
  });

  protected readonly isLoading = signal(false);
  protected readonly sentTo = signal<string | null>(null);

  protected onSubmit(): void {
    if (this.isLoading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.controls.email.value.trim();
    this.isLoading.set(true);

    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.sentTo.set(email);
      },
      // errorInterceptor has already surfaced why; staying on the form lets them try again.
      error: () => this.isLoading.set(false),
    });
  }
}
