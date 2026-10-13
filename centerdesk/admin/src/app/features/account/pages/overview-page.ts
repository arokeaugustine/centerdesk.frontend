import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AccountState } from '../account.state';
import { SUBSCRIPTION_STATUS } from '../account.models';
import { daysUntil, formatDate } from '../account.service';

/** The owner's landing spot: where their workspace lives, its plan, and what to set up next. */
@Component({
  selector: 'app-account-overview',
  imports: [NgClass, RouterLink],
  template: `
    @if (state.loading()) {
      <div class="space-y-6">
        <div class="h-9 w-72 animate-pulse rounded-lg bg-gray-200 dark:bg-white/5"></div>
        <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div class="h-56 animate-pulse rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-white/[0.03] dark:ring-white/10"></div>
          <div class="h-56 animate-pulse rounded-2xl bg-white ring-1 ring-gray-200 dark:bg-white/[0.03] dark:ring-white/10"></div>
        </div>
      </div>
    } @else if (state.workspace(); as ws) {
      <div>
        <p class="text-sm font-medium text-brand-500">{{ ws.name }}</p>
        <h1 class="mt-1 text-2xl font-semibold tracking-[-0.02em] text-gray-900 sm:text-3xl dark:text-white">Welcome back, {{ firstName() }}</h1>
        <p class="mt-1.5 text-sm text-gray-500 dark:text-gray-400">Here’s your workspace and plan at a glance.</p>
      </div>

      <div class="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <!-- Workspace -->
        <section class="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 dark:border-white/10 dark:bg-white/[0.03]">
          <div class="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand-500/10 blur-2xl"></div>
          <div class="relative">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Your workspace</h2>
              <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                    [ngClass]="ws.status === 'Active' ? 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500' : 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400'">
                <span class="h-1.5 w-1.5 rounded-full" [ngClass]="ws.status === 'Active' ? 'bg-success-500' : 'bg-warning-500'"></span>
                {{ ws.status === 'Active' ? 'Live' : ws.status }}
              </span>
            </div>
            <p class="mt-6 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Address</p>
            <p class="mt-1.5 break-all text-xl font-semibold text-gray-900 sm:text-2xl dark:text-white">{{ host(ws.workspaceUrl) }}</p>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">You and your agents sign in here to answer customers. Created {{ date(ws.createdAt) }}.</p>
            <div class="mt-6 flex flex-wrap gap-3">
              <a [href]="ws.loginUrl" target="_blank" rel="noopener"
                 class="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600">
                Open workspace
                <svg class="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h7v7M13 3 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
              <button type="button" (click)="copy(ws.workspaceUrl)"
                      class="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5">
                <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="7" y="7" width="10" height="10" rx="2"/><path d="M13 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/></svg>
                {{ copied() ? 'Copied' : 'Copy address' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Plan -->
        <section class="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 sm:p-7 dark:border-white/10 dark:bg-white/[0.03]">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Your plan</h2>
          @if (state.subscription(); as sub) {
            <p class="mt-6 text-2xl font-semibold text-gray-900 dark:text-white">{{ sub.status === 0 ? 'Free trial' : sub.plan.name }}</p>
            <p class="mt-1.5 text-sm text-gray-600 dark:text-gray-300">{{ planLine() }}</p>
            @if (sub.status === 0) {
              <div class="mt-5">
                <div class="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Trial</span><span>{{ trialDaysLeft() }} of 14 days left</span>
                </div>
                <div class="mt-1.5 h-2 rounded-full bg-gray-100 dark:bg-white/[0.06]">
                  <div class="h-2 rounded-full bg-brand-500" [style.width.%]="(14 - trialDaysLeft()) / 14 * 100"></div>
                </div>
              </div>
            }
            <div class="mt-auto pt-6">
              <a routerLink="/account/billing"
                 class="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium"
                 [ngClass]="needsAction() ? 'bg-brand-500 text-white hover:bg-brand-600' : 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5'">
                {{ sub.status === 0 ? 'Choose a plan' : needsAction() ? 'Renew now' : 'Manage subscription' }}
              </a>
            </div>
          }
        </section>
      </div>

      <!-- Next steps -->
      <section class="mt-6 rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.03]">
        <div class="border-b border-gray-100 px-6 py-5 dark:border-white/[0.06]">
          <h2 class="text-sm font-semibold text-gray-900 dark:text-white">Get your workspace ready</h2>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">These open in your workspace — sign in there with the same email and password.</p>
        </div>
        <ul class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          @for (step of steps; track step.title; let i = $index) {
            <li>
              <a [href]="ws.workspaceUrl + step.path" target="_blank" rel="noopener"
                 class="group flex items-center gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" [ngClass]="step.tone">
                  <span class="text-sm font-semibold">{{ i + 1 }}</span>
                </span>
                <span class="min-w-0 flex-1">
                  <span class="block text-sm font-medium text-gray-900 dark:text-white">{{ step.title }}</span>
                  <span class="block text-sm text-gray-500 dark:text-gray-400">{{ step.body }}</span>
                </span>
                <svg class="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-gray-500 dark:text-gray-600" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h7v7M13 3 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            </li>
          }
        </ul>
      </section>
    }
  `,
})
export class OverviewPage {
  protected readonly state = inject(AccountState);
  private readonly auth = inject(AuthService);

  protected readonly copied = signal(false);

  protected readonly steps = [
    { title: 'Connect your support mailbox', body: 'Bring in the address customers already email.', path: '/email-desks', tone: 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300' },
    { title: 'Connect WhatsApp', body: 'Add your WhatsApp Business number.', path: '/whatsapp', tone: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500' },
    { title: 'Invite your team', body: 'Add agents and give them the right roles.', path: '/users', tone: 'bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-400' },
    { title: 'Teach the AI', body: 'Add a few knowledge-base articles for common questions.', path: '/knowledge-base', tone: 'bg-gray-100 text-gray-700 dark:bg-white/[0.06] dark:text-gray-300' },
  ];

  protected readonly firstName = computed(() => (this.auth.user()?.userName ?? '').split(' ')[0] || 'there');

  protected readonly trialDaysLeft = computed(() => Math.min(14, daysUntil(this.state.subscription()?.trialEndDate ?? this.state.subscription()?.renewalDate)));

  protected readonly needsAction = computed(() => {
    const s = this.state.subscription()?.status;
    return s === 2 || s === 5;
  });

  protected readonly planLine = computed(() => {
    const sub = this.state.subscription();
    if (!sub) return '';
    const cycle = sub.billingCycle === 1 ? 'Billed yearly' : 'Billed monthly';
    switch (sub.status) {
      case 0: return `Your trial ends on ${formatDate(sub.trialEndDate ?? sub.renewalDate)}.`;
      case 1: return sub.cancelledAt
        ? `Cancelled — your plan ends on ${formatDate(sub.renewalDate)}.`
        : `${cycle} · renews on ${formatDate(sub.renewalDate)}.`;
      case 2: return `Payment is overdue since ${formatDate(sub.renewalDate)}. Renew to keep things running.`;
      case 5: return `Ended on ${formatDate(sub.renewalDate)}. Renew to pick up where you left off.`;
      default: return SUBSCRIPTION_STATUS[sub.status] ?? '';
    }
  });

  protected host(url: string): string {
    return url.replace(/^https?:\/\//, '');
  }

  protected date(iso: string): string {
    return formatDate(iso);
  }

  protected copy(text: string): void {
    navigator.clipboard?.writeText(text).then(() => {
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    }, () => undefined);
  }
}
