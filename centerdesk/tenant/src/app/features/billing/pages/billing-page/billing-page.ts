import { Component, OnInit, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { forkJoin } from 'rxjs';
import { BillingService } from '../../services/billing.service';
import { CurrentSubscription, PlanItem } from '../../models/billing.models';
import { Badge } from '../../../../shared/components/badge/badge';

@Component({
  selector: 'app-billing-page',
  imports: [NgClass, Badge],
  templateUrl: './billing-page.html',
  styleUrl: './billing-page.scss',
})
export class BillingPage implements OnInit {
  private readonly billingService = inject(BillingService);

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

  ngOnInit(): void {
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
      error: () => {
        this.loadError.set('Failed to load billing information. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  openUpgradeModal(plan: PlanItem): void {
    this.selectedPlan.set(plan);
    this.selectedCycle.set('Monthly');
    this.upgradeError.set(null);
    this.isModalOpen.set(true);
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

    this.billingService.initiateUpgrade(plan.id, this.selectedCycle()).subscribe({
      next: (res) => {
        if (res.success && res.content?.paymentUrl) {
          window.location.href = res.content.paymentUrl;
        } else {
          this.upgradeError.set(res.message || 'Failed to initiate payment. Please try again.');
          this.isUpgrading.set(false);
        }
      },
      error: () => {
        this.upgradeError.set('An error occurred. Please try again.');
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
      error: () => {
        this.renewError.set('An error occurred. Please try again.');
        this.isRenewing.set(false);
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

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
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
