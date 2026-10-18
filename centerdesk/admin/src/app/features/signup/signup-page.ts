import { Component, ElementRef, OnDestroy, computed, inject, signal, viewChildren } from '@angular/core';
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
import { SLUG_PATTERN, SignupResult, SignupService, SignupStarted, slugify } from './signup.service';

type SlugState = 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid';
type Field = 'companyName' | 'slug' | 'firstName' | 'lastName' | 'email' | 'password';

interface Done extends SignupResult {
  firstName: string;
  email: string;
  host: string;
}

/**
 * Start a free trial: confirms the email address with a 6-digit code, creates the workspace with
 * this person as its owner (TenantAdmin — never a system admin), waits while it's set up, then
 * shows its address and signs them in to their account.
 *
 * Nothing exists until the code is typed back — the form only parks what they entered — so the
 * "creating" step belongs to the code, not to the form.
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
  protected readonly phase = signal<'form' | 'verify' | 'creating' | 'done'>('form');
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

  // ---- Email verification: the sign-up waiting on its code.
  private readonly codeBoxes = viewChildren<ElementRef<HTMLInputElement>>('codeBox');
  protected readonly pending = signal<SignupStarted | null>(null);
  protected readonly codeDigits = signal(['', '', '', '', '', '']);
  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly notice = signal<string | null>(null);
  /** Ticks once a second while a code is outstanding, so the countdowns below move. */
  private readonly now = signal(Date.now());

  protected readonly codeComplete = computed(() => this.codeDigits().every((d) => d !== ''));

  /** Seconds until another code may be asked for; 0 means "now". */
  protected readonly resendIn = computed(() => {
    const p = this.pending();
    if (!p) return 0;
    return Math.max(0, Math.ceil((new Date(p.resendAvailableAt).getTime() - this.now()) / 1000));
  });

  protected readonly codeExpired = computed(() => {
    const p = this.pending();
    return !!p && this.now() >= new Date(p.expiresAt).getTime();
  });

  private slugEdited = false;
  private stepTimer: ReturnType<typeof setInterval> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

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
    this.stopClock();
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

  /**
   * Sends the form off. Nothing is created yet: the API parks it and emails a code, and the page
   * moves to the code step. (A system admin signing up from the console gets the finished
   * workspace back instead, and lands straight on the last step.)
   */
  protected submit(): void {
    if (this.phase() !== 'form' || this.submitting()) return;
    this.error.set(null);
    if (this.form.invalid || this.slugState() === 'unavailable' || this.slugState() === 'invalid') {
      this.form.markAllAsTouched();
      if (this.slugState() === 'unavailable') this.error.set('Please choose a different workspace address.');
      return;
    }

    const v = this.form.getRawValue();
    this.submitting.set(true);

    this.signup
      .register({
        companyName: v.companyName.trim(),
        slug: v.slug,
        adminEmail: v.email.trim(),
        adminFirstName: v.firstName.trim(),
        adminLastName: v.lastName.trim(),
        password: v.password,
      })
      .subscribe({
        next: (res) => {
          this.submitting.set(false);
          const result = res.content;

          if (result.requiresVerification) {
            this.pending.set(result);
            this.codeDigits.set(['', '', '', '', '', '']);
            this.notice.set(null);
            this.phase.set('verify');
            this.startClock();
            setTimeout(() => this.focusBox(0));
            window.scrollTo({ top: 0 });
            return;
          }

          this.phase.set('creating');
          this.finish(result);
        },
        error: (err: HttpErrorResponse) => {
          this.submitting.set(false);
          this.error.set(this.messageFor(err));
          if (err.status === 409 && /subdomain|address/i.test(err.error?.message ?? '')) {
            this.slugState.set('unavailable');
            this.slugMessage.set(err.error.message);
          }
        },
      });
  }

  /** The code from the email — this is the call that actually builds the workspace. */
  protected verifyCode(): void {
    const p = this.pending();
    if (!p || !this.codeComplete() || this.phase() === 'creating') return;

    this.error.set(null);
    this.notice.set(null);
    this.phase.set('creating');
    this.stopClock();
    this.startSteps();

    this.signup.verify(p.email, this.codeDigits().join('')).subscribe({
      next: (res) => this.finish(res.content),
      error: (err: HttpErrorResponse) => {
        this.stopSteps();
        this.phase.set('verify');
        this.startClock();
        this.error.set(this.messageFor(err));
        this.codeDigits.set(['', '', '', '', '', '']);
        // The step was torn down while we were creating; its boxes come back on the next render.
        setTimeout(() => this.focusBox(0));

        // The address or the workspace name was taken while this sign-up waited, or the sign-up
        // itself is gone (expired, or too many wrong codes): the form is the only way on.
        if (err.status === 409 || /fill in the form again/i.test(err.error?.message ?? '')) {
          this.pending.set(null);
          this.stopClock();
          this.phase.set('form');
          if (err.status === 409 && /subdomain|address/i.test(err.error?.message ?? '')) {
            this.slugState.set('unavailable');
            this.slugMessage.set(err.error.message);
          }
        }
      },
    });
  }

  protected resend(): void {
    const p = this.pending();
    if (!p || this.resending() || this.resendIn() > 0) return;

    this.resending.set(true);
    this.error.set(null);
    this.notice.set(null);

    this.signup.resendCode(p.email).subscribe({
      next: (res) => {
        this.resending.set(false);
        // Keep the slug we already have: a resend only reports the new code's timings.
        this.pending.set({ ...p, ...res.content, slug: p.slug });
        this.notice.set(res.content.message);
        this.codeDigits.set(['', '', '', '', '', '']);
        this.syncBoxes();
        this.focusBox(0);
      },
      error: (err: HttpErrorResponse) => {
        this.resending.set(false);
        this.error.set(this.messageFor(err));
      },
    });
  }

  /** Back to the form — to fix a mistyped address, or after the sign-up has gone stale. */
  protected editDetails(): void {
    this.stopClock();
    this.pending.set(null);
    this.error.set(null);
    this.notice.set(null);
    this.phase.set('form');
  }

  // ---- The six code boxes

  protected onCodeInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const typed = input.value.replace(/\D/g, '');
    const next = [...this.codeDigits()];

    if (typed.length === 0) {
      next[index] = '';
      this.codeDigits.set(next);
      this.syncBoxes();
      return;
    }

    // One box can take the whole code: pasted in, or filled by the phone from the email.
    let cursor = index;
    for (const digit of typed) {
      if (cursor > 5) break;
      next[cursor++] = digit;
    }

    this.codeDigits.set(next);
    this.syncBoxes();
    this.error.set(null);
    this.focusBox(Math.min(cursor, 5));

    if (next.every((d) => d !== '')) this.verifyCode();
  }

  protected onCodeKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && this.codeDigits()[index] === '' && index > 0) {
      // Backspace in an empty box steps back and clears the one before it.
      event.preventDefault();
      const next = [...this.codeDigits()];
      next[index - 1] = '';
      this.codeDigits.set(next);
      this.syncBoxes();
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault();
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault();
      this.focusBox(index + 1);
    }
  }

  private focusBox(index: number): void {
    const box = this.codeBoxes()[index]?.nativeElement;
    box?.focus();
    box?.select();
  }

  /** Typed characters we rejected never changed the signal, so the DOM needs telling. */
  private syncBoxes(): void {
    const digits = this.codeDigits();
    this.codeBoxes().forEach((box, i) => (box.nativeElement.value = digits[i]));
  }

  /** Signs them in with the password they chose and shows the finished workspace. */
  private finish(result: SignupResult): void {
    const v = this.form.getRawValue();
    const email = v.email.trim();

    this.auth
      .loginAccount(email, v.password)
      .pipe(
        map((login) => (login.success ? login.content : null)),
        catchError(() => of(null))
      )
      .subscribe((login) => {
        this.stopSteps();
        if (login) {
          this.auth.startSession(login);
          this.signedIn.set(true);
        }
        this.done.set({
          ...result,
          firstName: v.firstName.trim(),
          email,
          host: result.workspaceUrl.replace(/^https?:\/\//, ''),
        });
        this.phase.set('done');
        window.scrollTo({ top: 0 });
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

  /** Runs only while a code is outstanding — it drives the resend and expiry countdowns. */
  private startClock(): void {
    this.stopClock();
    this.now.set(Date.now());
    this.clockTimer = setInterval(() => this.now.set(Date.now()), 1000);
  }

  private stopClock(): void {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
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
