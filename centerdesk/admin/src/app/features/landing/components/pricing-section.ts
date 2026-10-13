import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_BASE_URL } from '../../../core/config/api.config';
import { ApiResult } from '../../../core/auth/auth.models';
import { SILENT_ERRORS } from '../../../core/http/error.interceptor';
import { PlanItem } from '../../plans/plans.service';
import { SITE } from '../../../shared/site/site-links';

type Currency = 'NGN' | 'USD';
type Cycle = 'Monthly' | 'Annual';

/** Live plans from /api/plans, in naira or dollars, monthly or yearly. */
@Component({
  selector: 'app-pricing-section',
  imports: [NgClass, RouterLink],
  template: `
    <div class="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
      <div class="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06]" role="group" aria-label="Billing period">
        @for (c of cycles; track c) {
          <button type="button" (click)="cycle.set(c)" [attr.aria-pressed]="cycle() === c"
                  class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  [ngClass]="cycle() === c ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
            {{ c }}
            @if (c === 'Annual') { <span class="ml-1 rounded-full bg-success-50 px-1.5 py-0.5 text-[11px] font-medium text-success-700 dark:bg-success-500/15 dark:text-success-500">2 months free</span> }
          </button>
        }
      </div>
      <div class="inline-flex rounded-xl bg-gray-100 p-1 dark:bg-white/[0.06]" role="group" aria-label="Currency">
        @for (c of currencies; track c) {
          <button type="button" (click)="currency.set(c)" [attr.aria-pressed]="currency() === c"
                  class="rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                  [ngClass]="currency() === c ? 'bg-white text-gray-900 shadow-theme-xs dark:bg-gray-800 dark:text-white' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white'">
            {{ c === 'NGN' ? '₦ Naira' : '$ Dollars' }}
          </button>
        }
      </div>
    </div>

    @if (loading()) {
      <div class="mt-12 grid gap-6 lg:grid-cols-3">
        @for (i of [1, 2, 3]; track i) {
          <div class="h-[460px] animate-pulse rounded-2xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/[0.02]"></div>
        }
      </div>
    } @else if (error()) {
      <div class="mx-auto mt-12 max-w-lg rounded-2xl border border-gray-200 bg-white p-8 text-center dark:border-white/10 dark:bg-white/[0.02]">
        <p class="text-sm text-gray-600 dark:text-gray-300">We couldn’t load prices just now.</p>
        <div class="mt-4 flex justify-center gap-3">
          <button type="button" (click)="load()" class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">Try again</button>
          <a routerLink="/signup" class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Start free trial</a>
        </div>
      </div>
    } @else {
      <div class="mx-auto mt-12 grid max-w-6xl gap-6 lg:grid-cols-3 lg:items-stretch">
        @for (plan of plans(); track plan.id; let i = $index) {
          <div class="relative flex flex-col rounded-2xl border bg-white p-6 sm:p-8 dark:bg-white/[0.02]"
               [ngClass]="isRecommended(i) ? 'border-brand-500 shadow-[0_24px_60px_-28px_rgba(70,95,255,0.55)] ring-1 ring-brand-500 dark:border-brand-400' : 'border-gray-200 dark:border-white/10'">
            @if (isRecommended(i)) {
              <span class="absolute -top-3 left-6 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white">Recommended</span>
            }
            <h3 class="text-lg font-semibold text-gray-900 dark:text-white">{{ plan.name }}</h3>
            <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{{ plan.description || tagline(plan) }}</p>

            <div class="mt-6">
              @if (price(plan) !== null) {
                <p class="flex items-baseline gap-1.5">
                  <span class="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">{{ format(price(plan)!) }}</span>
                  <span class="text-sm text-gray-500 dark:text-gray-400">/{{ cycle() === 'Annual' ? 'year' : 'month' }}</span>
                </p>
                <p class="mt-1.5 h-5 text-xs text-gray-500 dark:text-gray-400">
                  @if (cycle() === 'Annual') { {{ format(price(plan)! / 12) }} a month, billed yearly } @else { Billed monthly · cancel anytime }
                </p>
              } @else {
                <p class="text-2xl font-semibold text-gray-900 dark:text-white">Naira only</p>
                <p class="mt-1.5 h-5 text-xs text-gray-500 dark:text-gray-400">Switch to ₦ to see this plan’s price</p>
              }
            </div>

            <a routerLink="/signup" [queryParams]="{ plan: plan.id }"
               class="mt-6 inline-flex items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition-colors"
               [ngClass]="isRecommended(i) ? 'bg-brand-500 text-white hover:bg-brand-600' : 'border border-gray-300 text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-white/5'">
              Start {{ trialDays }}-day free trial
            </a>

            <ul class="mt-8 space-y-3 border-t border-gray-100 pt-6 text-sm dark:border-white/[0.06]">
              @for (feature of features(plan); track feature) {
                <li class="flex gap-3 text-gray-600 dark:text-gray-300">
                  <svg class="mt-0.5 h-4 w-4 shrink-0 text-brand-500" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2"><path d="m4.5 10.5 3.5 3.5 7.5-8" stroke-linecap="round" stroke-linejoin="round"/></svg>
                  {{ feature }}
                </li>
              }
            </ul>
          </div>
        }
      </div>
      <p class="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Every plan starts with a {{ trialDays }}-day free trial — no card needed. Pay by card or bank transfer in naira, or by card in dollars.
      </p>
    }
  `,
})
export class PricingSection implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);

  protected readonly cycles: Cycle[] = ['Monthly', 'Annual'];
  protected readonly currencies: Currency[] = ['NGN', 'USD'];
  protected readonly trialDays = SITE.trialDays;

  protected readonly cycle = signal<Cycle>('Monthly');
  protected readonly currency = signal<Currency>('NGN');
  protected readonly loading = signal(true);
  protected readonly error = signal(false);
  private readonly allPlans = signal<PlanItem[]>([]);
  protected readonly plans = computed(() => [...this.allPlans()].sort((a, b) => a.sortOrder - b.sortOrder));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(false);
    this.http
      .get<ApiResult<PlanItem[]>>(`${this.apiBaseUrl}/api/plans`, { context: new HttpContext().set(SILENT_ERRORS, true) })
      .subscribe({
        next: (res) => {
          if (res.success) this.allPlans.set(res.content ?? []);
          else this.error.set(true);
          this.loading.set(false);
        },
        error: () => {
          this.error.set(true);
          this.loading.set(false);
        },
      });
  }

  /** The middle plan of three is the one we point most teams to. */
  protected isRecommended(index: number): boolean {
    return this.plans().length >= 3 && index === 1;
  }

  protected price(plan: PlanItem): number | null {
    const annual = this.cycle() === 'Annual';
    if (this.currency() === 'USD') return annual ? plan.annualPriceUsd : plan.monthlyPriceUsd;
    return annual ? plan.annualPriceNaira : plan.monthlyPriceNaira;
  }

  protected format(amount: number): string {
    const currency = this.currency();
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', {
      style: 'currency',
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  protected tagline(plan: PlanItem): string {
    return plan.maxUsers >= 1_000_000 ? 'For large support operations' : `For teams of up to ${plan.maxUsers}`;
  }

  protected features(plan: PlanItem): string[] {
    const unlimited = (n: number) => n >= 1_000_000;
    const list = [
      unlimited(plan.maxUsers) ? 'Unlimited agents' : `Up to ${plan.maxUsers} agents`,
      unlimited(plan.maxEmailDesks) ? 'Unlimited support mailboxes' : `${plan.maxEmailDesks} support mailbox${plan.maxEmailDesks === 1 ? '' : 'es'}`,
      'Email and WhatsApp in one inbox',
      `${plan.maxStorageGb} GB for files and attachments`,
    ];
    if (plan.hasSla) list.push('SLA targets and breach alerts');
    if (plan.hasReports) list.push('Reports and satisfaction scores');
    if (plan.hasApiAccess) list.push('API access');
    return list;
  }
}
