import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../../core/auth/auth.service';
import { AuthSplitLayout } from '../../../../shared/site/auth-split-layout';
import { SignupService } from '../../../signup/signup.service';
import { environment } from '../../../../../environments/environment';

/**
 * One sign-in for CenterDesk's system admins and for workspace owners: the server works out which
 * from the email and password, and the app opens the admin console or the owner's account area.
 * Agents sign in at their workspace's own address — the finder below takes them there.
 */
@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink, NgClass, AuthSplitLayout],
  templateUrl: './login-page.html',
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly signup = inject(SignupService);

  protected readonly domain = environment.workspaceDomain;

  protected readonly form = new FormGroup({
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected readonly showPassword = signal(false);
  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly finderOpen = signal(this.route.snapshot.fragment === 'workspace');
  protected readonly workspace = new FormControl('', { nonNullable: true });
  protected readonly finding = signal(false);
  protected readonly finderError = signal<string | null>(null);

  protected submit(): void {
    if (this.isLoading()) return;
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.isLoading.set(true);
    this.auth.loginAccount(email.trim(), password).subscribe({
      next: (res) => {
        if (!res.success) {
          this.error.set(res.message || 'Invalid email or password.');
          this.isLoading.set(false);
          return;
        }
        this.auth.startSession(res.content);
        const returnUrl = this.auth.allowedReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), res.content.kind);
        this.router.navigateByUrl(returnUrl ?? this.auth.homeUrl(res.content.kind));
      },
      error: (err: HttpErrorResponse) => {
        this.isLoading.set(false);
        this.error.set(
          err.status === 429 ? 'Too many attempts. Please wait a minute and try again.'
          : err.status === 0 ? 'We couldn’t reach CenterDesk. Check your connection and try again.'
          : err.error?.message || 'Invalid email or password.'
        );
      },
    });
  }

  protected invalid(name: 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  /** Agents: go to the workspace's own sign-in page, if that workspace exists. */
  protected findWorkspace(): void {
    const slug = this.workspace.value.trim().toLowerCase()
      .replace(/^https?:\/\//, '').split('.')[0].replace(/[^a-z0-9-]/g, '');
    this.finderError.set(null);
    if (!slug) {
      this.finderError.set('Enter your workspace’s name.');
      return;
    }
    this.finding.set(true);
    this.signup.checkSlug(slug).subscribe({
      next: (res) => {
        this.finding.set(false);
        // "Taken" means a workspace has this address.
        if (res.success && !res.content.available && /taken/i.test(res.content.reason ?? '')) {
          window.location.href = `${this.workspaceUrl(slug)}/auth/login`;
        } else {
          this.finderError.set(`We couldn’t find a workspace at ${slug}.${this.domain}.`);
        }
      },
      error: () => {
        this.finding.set(false);
        this.finderError.set('We couldn’t check that just now. Please try again.');
      },
    });
  }

  private workspaceUrl(slug: string): string {
    const pattern = environment.workspaceUrlPattern;
    return pattern.replace('{slug}', slug);
  }
}
