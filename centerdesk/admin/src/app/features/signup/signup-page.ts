import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { catchError, debounceTime, distinctUntilChanged, filter, map, of, switchMap, tap } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { AuthSplitLayout } from '../../shared/site/auth-split-layout';
import { SITE } from '../../shared/site/site-links';
import { environment } from '../../../environments/environment';
import { SLUG_PATTERN, SignupResult, SignupService, slugify } from './signup.service';

type SlugState = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';
type Field = 'companyName' | 'slug' | 'firstName' | 'lastName' | 'email' | 'password';

interface Done extends SignupResult {
  firstName: string;
  email: string;
  host: string;
}

/**
 * Start a free trial: creates the workspace with this person as its owner (TenantAdmin — never a
 * system admin), waits while it's set up, then shows its address and signs them in to their account.
 */
@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, NgClass, AuthSplitLayout],
  templateUrl: './signup-page.html',
})
export class SignupPage implements OnDestroy {
  private readonly signup = inject(SignupService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly site = SITE;
  protected readonly domain = environment.workspaceDomain;
  /** A plan picked on the pricing section, offered again once the workspace is ready. */
  protected readonly planId = Number(this.route.snapshot.queryParamMap.get('plan')) || null;

  protected readonly form = new FormGroup({
    companyName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(200)] }),
    slug: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(SLUG_PATTERN)] }),
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(100)] }),
    email: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.email, Validators.maxLength(256)] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(8), Validators.maxLength(128)] }),
  });

  protected readonly slugState = signal<SlugState>('idle');
  protected readonly slugMessage = signal<string | null>(null);
  protected readonly phase = signal<'form' | 'creating' | 'done'>('form');
  protected readonly step = signal(0);
  protected readonly error = signal<string | null>(null);
  protected readonly done = signal<Done | null>(null);
  protected readonly signedIn = signal(false);
  protected readonly copied = signal(false);
  protected readonly showPassword = signal(false);
  protected readonly slugValue = signal('');

  protected readonly setupSteps = ['Creating your workspace', 'Setting up its private database', 'Getting your inbox ready'];
  protected readonly passwordStrength = signal(0);
  protected readonly strengthLabel = computed(() => ['Too short', 'Weak', 'Fair', 'Good', 'Strong'][this.passwordStrength()]);

  private slugEdited = false;
  private stepTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const slug = this.form.controls.slug;

    // Suggest an address from the company name until the person types their own.
    this.form.controls.companyName.valueChanges.pipe(takeUntilDestroyed()).subscribe((name) => {
      if (!this.slugEdited) slug.setValue(slugify(name));
    });

    slug.valueChanges
      .pipe(
        tap((value) => {
          this.slugValue.set(value);
          if (!value) {
            this.slugState.set('idle');
            this.slugMessage.set(null);
          } else if (!SLUG_PATTERN.test(value)) {
            this.slugState.set('invalid');
            this.slugMessage.set('Use 3–40 lowercase letters, numbers or hyphens, starting and ending with a letter or number.');
          } else {
            this.slugState.set('checking');
            this.slugMessage.set(null);
          }
        }),
        filter((value) => SLUG_PATTERN.test(value)),
        debounceTime(350),
        distinctUntilChanged(),
        switchMap((value) =>
          this.signup.checkSlug(value).pipe(
            map((res) => ({ value, res: res.content })),
            catchError(() => of({ value, res: null }))
          )
        ),
        takeUntilDestroyed()
      )
      .subscribe(({ value, res }) => {
        if (value !== slug.value) return;
        if (!res) {
          // Couldn't check: let the server decide on submit.
          this.slugState.set('idle');
          this.slugMessage.set(null);
        } else if (res.available) {
          this.slugState.set('available');
          this.slugMessage.set(null);
        } else {
          this.slugState.set('unavailable');
          this.slugMessage.set(res.reason ?? 'This address is taken.');
        }
      });

    this.form.controls.password.valueChanges.pipe(takeUntilDestroyed()).subscribe((p) => this.passwordStrength.set(strength(p)));
  }

  ngOnDestroy(): void {
    this.stopSteps();
  }

  /** The address field: keep it to what a subdomain allows as they type. */
  protected onSlugInput(event: Event): void {
    this.slugEdited = true;
    const input = event.target as HTMLInputElement;
    const cleaned = input.value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40);
    if (cleaned !== input.value) input.value = cleaned;
    this.form.controls.slug.setValue(cleaned);
  }

  protected invalid(name: Field): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  protected submit(): void {
    if (this.phase() !== 'form') return;
    this.error.set(null);
    if (this.form.invalid || this.slugState() === 'unavailable' || this.slugState() === 'invalid') {
      this.form.markAllAsTouched();
      if (this.slugState() === 'unavailable') this.error.set('Please choose a different workspace address.');
      return;
    }

    const v = this.form.getRawValue();
    this.phase.set('creating');
    this.startSteps();

    this.signup
      .register({
        companyName: v.companyName.trim(),
        slug: v.slug,
        adminEmail: v.email.trim(),
        adminFirstName: v.firstName.trim(),
        adminLastName: v.lastName.trim(),
        password: v.password,
      })
      .pipe(
        switchMap((res) => {
          const result = res.content;
          // Sign straight in to the account area with the password they just chose.
          return this.auth.loginAccount(v.email.trim(), v.password).pipe(
            map((login) => ({ result, login: login.success ? login.content : null })),
            catchError(() => of({ result, login: null }))
          );
        })
      )
      .subscribe({
        next: ({ result, login }) => {
          this.stopSteps();
          if (login) {
            this.auth.startSession(login);
            this.signedIn.set(true);
          }
          this.done.set({
            ...result,
            firstName: v.firstName.trim(),
            email: v.email.trim(),
            host: result.workspaceUrl.replace(/^https?:\/\//, ''),
          });
          this.phase.set('done');
          window.scrollTo({ top: 0 });
        },
        error: (err: HttpErrorResponse) => {
          this.stopSteps();
          this.phase.set('form');
          this.error.set(this.messageFor(err));
          if (err.status === 409 && /subdomain|address/i.test(err.error?.message ?? '')) {
            this.slugState.set('unavailable');
            this.slugMessage.set(err.error.message);
          }
        },
      });
  }

  protected copyAddress(): void {
    const d = this.done();
    if (!d) return;
    navigator.clipboard?.writeText(d.workspaceUrl).then(
      () => {
        this.copied.set(true);
        setTimeout(() => this.copied.set(false), 2000);
      },
      () => undefined
    );
  }

  protected goToAccount(path: string): void {
    this.router.navigateByUrl(path);
  }

  protected trialEnds(d: Done): string {
    return new Date(d.trialEndsAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  private messageFor(err: HttpErrorResponse): string {
    if (err.status === 0) return 'We couldn’t reach CenterDesk. Check your connection and try again.';
    if (err.status === 429) return 'Too many sign-ups from this network just now. Please try again in a little while.';
    const body = err.error;
    if (body?.validationErrors) {
      const first = Object.values(body.validationErrors as Record<string, string[]>).flat()[0];
      if (first) return first;
    }
    return body?.message || 'Something went wrong while creating your workspace. Please try again.';
  }

  private startSteps(): void {
    this.step.set(0);
    this.stopSteps();
    this.stepTimer = setInterval(() => this.step.update((s) => Math.min(s + 1, this.setupSteps.length - 1)), 1400);
  }

  private stopSteps(): void {
    if (this.stepTimer) {
      clearInterval(this.stepTimer);
      this.stepTimer = null;
    }
  }
}

/** 0–4: length, mixed case, digits, symbols. Only a hint — the server's rule is 8+ characters. */
function strength(p: string): number {
  if (!p || p.length < 8) return 0;
  let score = 1;
  if (p.length >= 12) score++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) score++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
  return Math.min(score, 4);
}
