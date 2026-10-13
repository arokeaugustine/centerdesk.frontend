import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { BrandLogo } from '../../../shared/site/brand-logo';
import { AccountService, apiMessage, formatMoney } from '../account.service';
import { VerifyResult } from '../account.models';

/**
 * Where Bachs brings the owner back after paying (?checkout_id=…). Confirms the payment with the
 * API — which applies it if the webhook hasn't yet — and says what happened. Works signed out too.
 */
@Component({
  selector: 'app-payment-callback-page',
  imports: [RouterLink, BrandLogo],
  template: `
    <div class="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <a routerLink="/" class="mb-10" aria-label="CenterDesk home"><app-brand-logo [size]="30" /></a>
      <div class="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-theme-lg dark:border-white/10 dark:bg-gray-900">
        @switch (state()) {
          @case ('checking') {
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/15">
              <svg class="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2.5" opacity=".2"/><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>
            </div>
            <h1 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Confirming your payment…</h1>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">This only takes a moment.</p>
          }
          @case ('paid') {
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500">
              <svg class="h-7 w-7" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m4.5 10.5 3.5 3.5 7.5-8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
            <h1 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">Payment received</h1>
            @if (result(); as r) {
              <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                You’re on the <strong class="font-medium text-gray-900 dark:text-white">{{ r.planName }}</strong> plan{{ priceNote(r) }}.
                Thank you!
              </p>
            }
          }
          @default {
            <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400">
              <svg class="h-7 w-7" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="10" cy="10" r="7.5"/><path d="M10 6v4.5M10 13.5h.01" stroke-linecap="round"/></svg>
            </div>
            <h1 class="mt-6 text-xl font-semibold text-gray-900 dark:text-white">{{ state() === 'pending' ? 'Payment not confirmed yet' : 'We couldn’t confirm this payment' }}</h1>
            <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">{{ message() }}</p>
            @if (state() === 'pending') {
              <button type="button" (click)="check()" class="mt-5 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">Check again</button>
            }
          }
        }

        @if (state() !== 'checking') {
          <div class="mt-8 grid gap-3">
            @if (auth.isOwner()) {
              <a routerLink="/account/billing" class="flex h-11 items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600">Back to billing</a>
              @if (auth.user()?.workspaceUrl; as url) {
                <a [href]="url + '/auth/login'" target="_blank" rel="noopener" class="text-sm font-medium text-brand-500 hover:text-brand-600">Open your workspace</a>
              }
            } @else {
              <a routerLink="/auth/login" [queryParams]="{ returnUrl: '/account/billing' }" class="flex h-11 items-center justify-center rounded-lg bg-brand-500 text-sm font-medium text-white hover:bg-brand-600">Sign in to your account</a>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class PaymentCallbackPage implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly account = inject(AccountService);
  private readonly route = inject(ActivatedRoute);

  protected readonly state = signal<'checking' | 'paid' | 'pending' | 'failed'>('checking');
  protected readonly result = signal<VerifyResult | null>(null);
  protected readonly message = signal('');
  private attempts = 0;

  ngOnInit(): void {
    this.check();
  }

  protected check(): void {
    const params = this.route.snapshot.queryParamMap;
    const checkoutId = params.get('checkout_id') ?? params.get('checkoutId');
    const reference = params.get('reference');
    if (!checkoutId && !reference) {
      this.state.set('failed');
      this.message.set('There’s no payment reference in this link. If you paid, your plan will update shortly — check your billing page.');
      return;
    }

    this.state.set('checking');
    this.attempts++;
    this.account.verify({ checkoutId, reference }).subscribe({
      next: (res) => {
        this.result.set(res.content);
        if (res.content?.status === 'paid') {
          this.state.set('paid');
        } else if (res.content?.status === 'pending' && this.attempts < 3) {
          // The processor may still be finishing up: look again shortly.
          setTimeout(() => this.check(), 2500);
        } else {
          this.state.set(res.content?.status === 'pending' ? 'pending' : 'failed');
          this.message.set(res.content?.message || 'Payment is still pending. It may take a moment to confirm.');
        }
      },
      error: (err) => {
        this.state.set('failed');
        this.message.set(apiMessage(err, 'We couldn’t check this payment just now. If you paid, your plan will update shortly.'));
      },
    });
  }

  /** " — ₦15,000 a month", or nothing when the amount isn't known. */
  protected priceNote(r: VerifyResult): string {
    if (r.amount == null || !r.currency) return '';
    return ` — ${formatMoney(r.amount, r.currency)} ${r.billingCycle === 'Annual' ? 'a year' : 'a month'}`;
  }
}
