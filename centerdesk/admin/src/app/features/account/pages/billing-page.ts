import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ToastService } from '../../../shared/services/toast.service';
import { SiteDialog } from '../../../shared/site/site-dialog';
import { SITE } from '../../../shared/site/site-links';
import { AccountState } from '../account.state';
import { AccountService, apiMessage, daysUntil, formatDate, formatMoney } from '../account.service';
import { BillingCurrency, CurrentSubscription, PlanItem, SUBSCRIPTION_STATUS, SavedCard } from '../account.models';

type Cycle = 'Monthly' | 'Annual';

/**
 * Subscription and billing for the workspace owner: choose a plan (from the trial), renew, cancel at
 * the end of the period or resume, automatic renewal, and the saved card. Payments go through
 * Bachs' hosted checkout, which brings the owner back to the payment page under /account/billing.
 */
@Component({
  selector: 'app-account-billing',
  imports: [NgClass, FormsModule, SiteDialog],
  templateUrl: './billing-page.html',
})
export class BillingPage implements OnInit {
  protected readonly state = inject(AccountState);
  private readonly account = inject(AccountService);
  private readonly toast = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly STATUS = SUBSCRIPTION_STATUS;
  protected readonly contactEmail = SITE.contactEmail;

  // Plan picker
  protected readonly checkoutPlan = signal<PlanItem | null>(null);
  protected readonly cycle = signal<Cycle>('Monthly');
  protected readonly currency = signal<BillingCurrency>('NGN');
  protected readonly redirecting = signal(false);
  protected readonly checkoutError = signal<string | null>(null);

  // Renew / cancel / resume / auto-renew / card
  protected readonly renewing = signal(false);
  protected readonly cancelOpen = signal(false);
  protected readonly cancelReason = signal('');
  protected readonly cancelNote = signal('');
  protected readonly cancelling = signal(false);
  protected readonly cancelError = signal<string | null>(null);
  protected readonly working = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected readonly cancelReasons = [
    'It’s too expensive for us',
    'We’re missing a feature we need',
    'We’re moving to another tool',
    'We were only trying it out',
    'Something else',
  ];

  private planFromLink = Number(this.route.snapshot.queryParamMap.get('plan')) || null;

  protected readonly sub = computed(() => this.state.subscription());
  protected readonly isTrial = computed(() => this.sub()?.status === 0);
  protected readonly isPaid = computed(() => [1, 2, 5].includes(this.sub()?.status ?? -1));
  protected readonly canRenew = computed(() => this.sub()?.status === 2 || this.sub()?.status === 5);
  protected readonly isCancelled = computed(() => this.sub()?.status === 1 && !!this.sub()?.cancelledAt);
  protected readonly canCancel = computed(() => (this.sub()?.status === 1 || this.sub()?.status === 2) && !this.sub()?.cancelledAt);

  constructor() {
    // A plan picked on the pricing page (or at sign-up) opens the checkout straight away.
    effect(() => {
      const plans = this.state.sortedPlans();
      if (!this.planFromLink || !plans.length || !this.isTrial()) return;
      const plan = plans.find(p => p.id === this.planFromLink);
      this.planFromLink = null;
      if (plan) this.openCheckout(plan);
    });
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.has('plan')) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  // ---------------------------------------------------------------- plans

  protected openCheckout(plan: PlanItem): void {
    this.checkoutPlan.set(plan);
    this.cycle.set('Monthly');
    this.currency.set('NGN');
    this.checkoutError.set(null);
  }

  protected closeCheckout(): void {
    if (!this.redirecting()) this.checkoutPlan.set(null);
  }

  protected supportsUsd(plan: PlanItem): boolean {
    return plan.monthlyPriceUsd != null && plan.annualPriceUsd != null;
  }

  protected priceOf(plan: PlanItem, cycle: Cycle, currency: BillingCurrency): number {
    if (currency === 'USD') return (cycle === 'Annual' ? plan.annualPriceUsd : plan.monthlyPriceUsd) ?? 0;
    return cycle === 'Annual' ? plan.annualPriceNaira : plan.monthlyPriceNaira;
  }

  protected features(plan: PlanItem): string[] {
    const unlimited = (n: number) => n >= 1_000_000;
    const list = [
      unlimited(plan.maxUsers) ? 'Unlimited agents' : `Up to ${plan.maxUsers} agents`,
      unlimited(plan.maxEmailDesks) ? 'Unlimited support mailboxes' : `${plan.maxEmailDesks} support mailbox${plan.maxEmailDesks === 1 ? '' : 'es'}`,
      `${plan.maxStorageGb} GB for files`,
    ];
    if (plan.hasSla) list.push('SLA targets and alerts');
    if (plan.hasReports) list.push('Reports and satisfaction scores');
    if (plan.hasApiAccess) list.push('API access');
    return list;
  }

  protected continueToPayment(): void {
    const plan = this.checkoutPlan();
    if (!plan || this.redirecting()) return;
    this.redirecting.set(true);
    this.checkoutError.set(null);
    this.account.upgrade(plan.id, this.cycle(), this.currency()).subscribe({
      next: (res) => {
        if (res.success && res.content?.paymentUrl) {
          window.location.href = res.content.paymentUrl;
        } else {
          this.redirecting.set(false);
          this.checkoutError.set(res.message || 'We couldn’t start the payment. Please try again.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.redirecting.set(false);
        this.checkoutError.set(apiMessage(err, 'We couldn’t start the payment. Please try again.'));
      },
    });
  }

  // ---------------------------------------------------------------- renew

  protected renew(): void {
    if (this.renewing()) return;
    this.renewing.set(true);
    this.actionError.set(null);
    this.account.renew().subscribe({
      next: (res) => {
        if (res.success && res.content?.paymentUrl) {
          window.location.href = res.content.paymentUrl;
        } else {
          this.renewing.set(false);
          this.actionError.set(res.message || 'We couldn’t start the renewal. Please try again.');
        }
      },
      error: (err: HttpErrorResponse) => {
        this.renewing.set(false);
        this.actionError.set(apiMessage(err, 'We couldn’t start the renewal. Please try again.'));
        if (err.status === 409) this.state.refreshSubscription();
      },
    });
  }

  // ---------------------------------------------------------------- cancel / resume

  protected openCancel(): void {
    this.cancelReason.set('');
    this.cancelNote.set('');
    this.cancelError.set(null);
    this.cancelOpen.set(true);
  }

  protected confirmCancel(): void {
    if (this.cancelling()) return;
    const reason = [this.cancelReason(), this.cancelNote().trim()].filter(Boolean).join(' — ') || 'Cancelled from the account area';
    this.cancelling.set(true);
    this.cancelError.set(null);
    this.account.cancel(reason).subscribe({
      next: (res) => {
        this.cancelling.set(false);
        this.cancelOpen.set(false);
        this.toast.success(res.content?.message ?? 'Your subscription is cancelled.');
        this.state.refreshSubscription();
      },
      error: (err: HttpErrorResponse) => {
        this.cancelling.set(false);
        this.cancelError.set(apiMessage(err, 'We couldn’t cancel your subscription. Please try again.'));
      },
    });
  }

  protected resume(): void {
    this.setAutoRenew(true, 'Your subscription will carry on as normal.');
  }

  protected toggleAutoRenew(sub: CurrentSubscription): void {
    this.setAutoRenew(!sub.autoRenew, sub.autoRenew ? 'Automatic renewal is off.' : 'Automatic renewal is on.');
  }

  private setAutoRenew(enabled: boolean, done: string): void {
    if (this.working()) return;
    this.working.set(true);
    this.actionError.set(null);
    this.account.setAutoRenew(enabled).subscribe({
      next: () => {
        this.working.set(false);
        this.toast.success(done);
        this.state.refreshSubscription();
      },
      error: (err: HttpErrorResponse) => {
        this.working.set(false);
        this.actionError.set(apiMessage(err, 'That didn’t work. Please try again.'));
      },
    });
  }

  protected removeCard(card: SavedCard): void {
    if (this.working()) return;
    if (!confirm(`Remove ${this.cardLabel(card)}? Renewals won’t be charged to it any more.`)) return;
    this.working.set(true);
    this.account.removeCard(card.uid).subscribe({
      next: () => {
        this.working.set(false);
        this.toast.success('Card removed.');
        this.state.refreshSubscription();
      },
      error: (err: HttpErrorResponse) => {
        this.working.set(false);
        this.actionError.set(apiMessage(err, 'We couldn’t remove the card. Please try again.'));
      },
    });
  }

  // ---------------------------------------------------------------- wording

  protected money(amount: number, currency: BillingCurrency): string {
    return formatMoney(amount, currency);
  }

  protected date(iso: string | null | undefined): string {
    return formatDate(iso);
  }

  protected cardLabel(card: SavedCard): string {
    const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1).toLowerCase() : 'Card';
    return card.last4 ? `${brand} ending ${card.last4}` : brand;
  }

  protected cardExpiry(card: SavedCard): string | null {
    return card.expMonth && card.expYear ? `${String(card.expMonth).padStart(2, '0')}/${card.expYear}` : null;
  }

  protected currentPrice(sub: CurrentSubscription): string {
    const annual = sub.billingCycle === 1;
    const amount = sub.currency === 'USD'
      ? (annual ? sub.plan.annualPriceUsd : sub.plan.monthlyPriceUsd) ?? 0
      : (annual ? sub.plan.annualPriceNaira : sub.plan.monthlyPriceNaira);
    return `${formatMoney(amount, sub.currency)} / ${annual ? 'year' : 'month'}`;
  }

  protected statusTone(sub: CurrentSubscription): string {
    if (sub.status === 1 && sub.cancelledAt) return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
    switch (sub.status) {
      case 1: return 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500';
      case 0: return 'bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300';
      case 2: return 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400';
      default: return 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400';
    }
  }

  protected statusLabel(sub: CurrentSubscription): string {
    return sub.status === 1 && sub.cancelledAt ? 'Ends soon' : (SUBSCRIPTION_STATUS[sub.status] ?? 'Inactive');
  }

  /** One sentence on what happens next with this subscription. */
  protected summary(sub: CurrentSubscription): string {
    const card = sub.paymentMethod ? `your ${this.cardLabel(sub.paymentMethod)}` : 'your card';
    if (sub.status === 0) {
      const days = daysUntil(sub.trialEndDate ?? sub.renewalDate);
      return days > 0
        ? `Your free trial ends on ${formatDate(sub.trialEndDate ?? sub.renewalDate)} — ${days} day${days === 1 ? '' : 's'} from now. Choose a plan below to keep going.`
        : 'Your free trial has ended. Choose a plan below to pick up where you left off — nothing has been deleted.';
    }
    if (sub.status === 1 && sub.cancelledAt) {
      return `You cancelled on ${formatDate(sub.cancelledAt)}. The workspace keeps working until ${formatDate(sub.renewalDate)}, and nothing more will be charged.`;
    }
    const renewal = sub.renewal;
    if (renewal) {
      const amount = formatMoney(renewal.amount, renewal.currency);
      switch (renewal.state) {
        case 'scheduled':
        case 'processing': return `We’re charging ${amount} to ${card} for this renewal.`;
        case 'retrying': return sub.autoRenew && renewal.nextAttemptAt
          ? `The last charge didn’t go through. We’ll try ${card} again on ${formatDate(renewal.nextAttemptAt)} — or renew now to settle it straight away.`
          : 'Renew now to keep your plan.';
        case 'failed': return 'Automatic renewal stopped for this period. Renew now to keep your plan.';
        case 'no-card': return 'There’s no saved card for this renewal. Renew now — paying by card saves it for next time.';
      }
    }
    if (sub.status === 2) return `Your plan was due on ${formatDate(sub.renewalDate)}. Renew now to keep email flowing in.`;
    if (sub.status === 5) return `Your plan ended on ${formatDate(sub.renewalDate)}. Renew to start a new period from today.`;
    if (!sub.autoRenew) return `Automatic renewal is off, so your plan ends on ${formatDate(sub.renewalDate)} unless you renew.`;
    return sub.paymentMethod
      ? `We’ll charge ${this.currentPrice(sub).split(' / ')[0]} to ${card} on ${formatDate(sub.renewalDate)}.`
      : `Renews on ${formatDate(sub.renewalDate)}. There’s no saved card, so we’ll email you a link to pay.`;
  }
}
