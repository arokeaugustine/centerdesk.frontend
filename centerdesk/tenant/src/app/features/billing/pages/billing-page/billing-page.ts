import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { BillingService } from '../../services/billing.service';
import { BillingCurrency, CurrentSubscription, PlanItem, SavedCard } from '../../models/billing.models';
import { Badge } from '../../../../shared/components/badge/badge';
import { PermissionService } from '../../../../core/auth/permission.service';
import { TenantPermission } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-billing-page',
  imports: [NgClass, Badge],
  templateUrl: './billing-page.html',
  styleUrl: './billing-page.scss',
})
export class BillingPage implements OnInit {
  private readonly billingService = inject(BillingService);
  private readonly permissions = inject(PermissionService);

  // Changing billing (upgrade, renew, auto-renew, removing the card) is for tenant admins.
  readonly canManage = computed(() => this.permissions.has(TenantPermission.CanManageSubscription));
  readonly isTogglingAutoRenew = signal(false);
  readonly isRemovingCard = signal(false);
  readonly paymentError = signal<string | null>(null);

  readonly isLoading = signal(true);
  readonly isUpgrading = signal(false);
  readonly isRenewing = signal(false);
  readonly subscription = signal<CurrentSubscription | null>(null);
  readonly plans = signal<PlanItem[]>([]);
  readonly loadError = signal<string | null>(null);
  readonly upgradeError = signal<string | null>(null);
  readonly renewError = signal<string | null>(null);

  readonly isModalOpen = signal(false);
  readonly selectedPlan = signal<PlanItem | null>(null);
  readonly selectedCycle = signal<'Monthly' | 'Annual'>('Monthly');
  // Chosen at checkout time (this modal), not on the plan cards — matches the product decision
  // that currency is picked once, at signup/checkout, and then reused for renewals.
  readonly selectedCurrency = signal<BillingCurrency>('NGN');

  ngOnInit(): void {
    this.isLoading.set(true);
    this.loadError.set(null);
    forkJoin({
      subscription: this.billingService.getCurrentSubscription(),
      plans: this.billingService.getPlans(),
    }).subscribe({
      next: ({ subscription, plans }) => {
        if (subscription.success) {
          this.subscription.set(subscription.content);
        }
        if (plans.success) {
          this.plans.set([...plans.content].sort((a, b) => a.sortOrder - b.sortOrder));
        }
        this.isLoading.set(false);
      },
      error: (err: HttpErrorResponse) => {
        this.loadError.set(err?.status === 403
          ? "You don't have permission to view billing. Ask an account admin."
          : 'Failed to load billing information. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  private reloadSubscription(): void {
    this.billingService.getCurrentSubscription().subscribe({
      next: (res) => {
        if (res.success) this.subscription.set(res.content);
      },
    });
  }

  // ---- Saved card & automatic renewal ----

  // Paid subscriptions only: a trial has no card yet, and a cancelled one renews nothing.
  showPaymentSection(sub: CurrentSubscription): boolean {
    return sub.status === 1 || sub.status === 2 || sub.status === 5;
  }

  toggleAutoRenew(): void {
    const sub = this.subscription();
    if (!sub || !this.canManage() || this.isTogglingAutoRenew()) return;

    const enabled = !sub.autoRenew;
    this.isTogglingAutoRenew.set(true);
    this.paymentError.set(null);
    this.billingService.setAutoRenew(enabled).subscribe({
      next: (res) => {
        if (res.success) {
          this.subscription.set({ ...sub, autoRenew: res.content.autoRenew });
          this.reloadSubscription();
        } else {
          this.paymentError.set(res.message || 'Could not change automatic renewal.');
        }
        this.isTogglingAutoRenew.set(false);
      },
      error: () => {
        this.paymentError.set('Could not change automatic renewal. Please try again.');
        this.isTogglingAutoRenew.set(false);
      },
    });
  }

  removeCard(card: SavedCard): void {
    if (!this.canManage() || this.isRemovingCard()) return;
    if (!confirm(`Remove ${this.cardLabel(card)}? Renewals won't be charged to it any more.`)) return;

    this.isRemovingCard.set(true);
    this.paymentError.set(null);
    this.billingService.removePaymentMethod(card.uid).subscribe({
      next: (res) => {
        if (!res.success) this.paymentError.set(res.message || 'Could not remove the card.');
        this.isRemovingCard.set(false);
        this.reloadSubscription();
      },
      error: () => {
        this.paymentError.set('Could not remove the card. Please try again.');
        this.isRemovingCard.set(false);
      },
    });
  }

  cardLabel(card: SavedCard): string {
    const brand = card.brand ? card.brand.charAt(0).toUpperCase() + card.brand.slice(1).toLowerCase() : 'Card';
    return card.last4 ? `${brand} ending ${card.last4}` : brand;
  }

  cardExpiry(card: SavedCard): string | null {
    if (!card.expMonth || !card.expYear) return null;
    return `${String(card.expMonth).padStart(2, '0')}/${card.expYear}`;
  }

  // The plan price this subscription renews at, in its own currency.
  renewalPrice(sub: CurrentSubscription): string {
    const annual = sub.billingCycle === 1;
    const amount = sub.currency === 'USD'
      ? (annual ? sub.plan.annualPriceUsd : sub.plan.monthlyPriceUsd) ?? 0
      : (annual ? sub.plan.annualPriceNaira : sub.plan.monthlyPriceNaira);
    return this.formatCurrency(amount, sub.currency);
  }

  renewalSummary(sub: CurrentSubscription): string {
    const card = sub.paymentMethod ? `your ${this.cardLabel(sub.paymentMethod)}` : 'your card';

    // A renewal for this period is under way: describe that, not the (already passed) renewal date.
    const renewal = sub.renewal;
    if (renewal) {
      const amount = this.formatCurrency(renewal.amount, renewal.currency);
      switch (renewal.state) {
        case 'scheduled':
        case 'processing':
          return `We're charging ${amount} to ${card} for this renewal.`;
        case 'retrying':
          return sub.autoRenew && renewal.nextAttemptAt
            ? `We'll try ${card} again on ${this.formatDateTime(renewal.nextAttemptAt)} — or renew now to settle it straight away.`
            : 'Renew now to keep your plan.';
        case 'failed':
          return 'Automatic renewal has stopped for this period. Renew by hand to keep your plan; paying by card saves the card for next time.';
        case 'no-card':
          return "There's no saved card for this renewal. Renew by hand; paying by card saves it so future renewals are automatic.";
      }
    }

    if (sub.status === 2 || sub.status === 5) {
      return 'Renew from this page to keep your plan. Paying by card saves the card for automatic renewals.';
    }

    const date = this.formatDate(sub.renewalDate);
    if (!sub.autoRenew) {
      return `Automatic renewal is off. Your subscription ends on ${date}; you can renew it from this page then.`;
    }
    if (sub.paymentMethod) {
      return `We'll charge ${this.renewalPrice(sub)} to your ${this.cardLabel(sub.paymentMethod)} on ${date}.`;
    }
    return `Automatic renewal is on, but there's no saved card. We'll email you a link to renew on ${date}. Paying by card saves it for future renewals.`;
  }

  // Whether the "renews soon" warning applies: not when the saved card will be charged anyway.
  needsManualRenewal(sub: CurrentSubscription): boolean {
    return !(sub.autoRenew && sub.paymentMethod) || sub.status === 0;
  }

  formatDateTime(dateStr: string | null): string {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('en-NG', {
      day: 'numeric',
      month: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  // A plan needs both cycle prices set in USD before we'll offer USD at checkout for it.
  planSupportsUsd(plan: PlanItem): boolean {
    return plan.monthlyPriceUsd != null && plan.annualPriceUsd != null;
  }

  openUpgradeModal(plan: PlanItem): void {
    this.selectedPlan.set(plan);
    this.selectedCycle.set('Monthly');
    this.selectedCurrency.set('NGN');
    this.upgradeError.set(null);
    this.isModalOpen.set(true);
  }

  selectCurrency(currency: BillingCurrency): void {
    const plan = this.selectedPlan();
    if (currency === 'USD' && plan && !this.planSupportsUsd(plan)) return;
    this.selectedCurrency.set(currency);
  }

  closeModal(): void {
    if (this.isUpgrading()) return;
    this.isModalOpen.set(false);
    this.selectedPlan.set(null);
    this.upgradeError.set(null);
  }

  proceedToPayment(): void {
    const plan = this.selectedPlan();
    if (!plan || this.isUpgrading()) return;

    this.isUpgrading.set(true);
    this.upgradeError.set(null);

    this.billingService.initiateUpgrade(plan.id, this.selectedCycle(), this.selectedCurrency()).subscribe({
      next: (res) => {
        if (res.success && res.content?.paymentUrl) {
          window.location.href = res.content.paymentUrl;
        } else {
          this.upgradeError.set(res.message || 'Failed to initiate payment. Please try again.');
          this.isUpgrading.set(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.upgradeError.set(err?.error?.message || 'An error occurred. Please try again.');
        this.isUpgrading.set(false);
      },
    });
  }

  // SubscriptionStatus enum: Trial=0, Active=1, PastDue=2, Suspended=3, Cancelled=4, Expired=5
  getStatusLabel(status: number): string {
    switch (status) {
      case 0: return 'Trial';
      case 1: return 'Active';
      case 2: return 'Past Due';
      case 3: return 'Suspended';
      case 4: return 'Cancelled';
      case 5: return 'Expired';
      default: return 'Inactive';
    }
  }

  getStatusColor(status: number): 'success' | 'error' | 'warning' | 'primary' {
    switch (status) {
      case 1: return 'success';
      case 0: return 'warning';
      case 2: return 'warning';
      case 3: return 'error';
      case 4: return 'error';
      case 5: return 'error';
      default: return 'primary';
    }
  }

  // BillingCycle enum: Monthly=0, Annual=1
  getCycleLabel(cycle: number): string {
    return cycle === 1 ? 'Annual' : 'Monthly';
  }

  // Past Due (2) or Expired (5) — a lapsed paid subscription that can be reactivated.
  canRenew(): boolean {
    const status = this.subscription()?.status;
    return status === 2 || status === 5;
  }

  renew(): void {
    if (this.isRenewing()) return;

    this.isRenewing.set(true);
    this.renewError.set(null);

    this.billingService.renew().subscribe({
      next: (res) => {
        if (res.success && res.content?.paymentUrl) {
          window.location.href = res.content.paymentUrl;
        } else {
          this.renewError.set(res.message || 'Failed to start renewal. Please try again.');
          this.isRenewing.set(false);
        }
      },
      error: (err: HttpErrorResponse) => {
        this.renewError.set(err?.error?.message || 'An error occurred. Please try again.');
        this.isRenewing.set(false);
        // 409: the saved card is being charged for this renewal right now — show that state.
        if (err?.status === 409) this.reloadSubscription();
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  // The current subscription's own billing currency (fixed at checkout) drives how its price
  // is displayed — plan cards below always advertise NGN, since USD is a checkout-time choice.
  formatCurrency(amount: number, currency: BillingCurrency = 'NGN'): string {
    return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-NG', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
    }).format(amount);
  }

  getDaysRemaining(): number {
    const sub = this.subscription();
    if (!sub) return 0;
    const diff = new Date(sub.renewalDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  getSelectedPrice(): number {
    const plan = this.selectedPlan();
    if (!plan) return 0;
    if (this.selectedCurrency() === 'USD') {
      return this.selectedCycle() === 'Annual'
        ? (plan.annualPriceUsd ?? 0)
        : (plan.monthlyPriceUsd ?? 0);
    }
    return this.selectedCycle() === 'Annual'
      ? plan.annualPriceNaira
      : plan.monthlyPriceNaira;
  }

  isCurrentPlan(plan: PlanItem): boolean {
    return this.subscription()?.plan.name === plan.name;
  }

  getPlanFeatures(plan: PlanItem): string[] {
    const features: string[] = [
      `${plan.maxUsersDisplay} users`,
      `${plan.maxEmailDesksDisplay} email desks`,
      `${plan.maxStorageGb}GB storage`,
    ];
    if (plan.hasReports) features.push('Advanced reports');
    if (plan.hasSla) features.push('SLA support');
    if (plan.hasApiAccess) features.push('API access');
    return features;
  }

  isPopularPlan(index: number): boolean {
    return index === 1;
  }
}
