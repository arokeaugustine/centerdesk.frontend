import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { SubscriptionService, SubscriptionItem } from '../../subscription.service';
import { Paging } from '../../../../core/auth/auth.models';

@Component({
  selector: 'app-subscription-page',
  imports: [NgClass],
  templateUrl: './subscription-page.html',
  styleUrl: './subscription-page.scss',
})
export class SubscriptionPage {
  private readonly subscriptionService = inject(SubscriptionService);

  protected readonly PAGE_SIZE_OPTIONS = [2, 10, 20, 50, 100];

  protected readonly subscriptions = signal<SubscriptionItem[]>([]);
  protected readonly paging = signal<Paging | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalItems = computed(() => this.paging()?.totalItems ?? 0);
  protected readonly totalPages = computed(() => this.paging()?.totalPages ?? 1);
  protected readonly hasPrev = computed(() => this.paging()?.hasPreviousPage ?? false);
  protected readonly hasNext = computed(() => this.paging()?.hasNextPage ?? false);

  protected readonly pageRange = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  });

  constructor() {
    this.load();
  }

  private load(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this.subscriptionService.getSubscriptions({ page: this.currentPage(), pageSize: this.pageSize() }).subscribe({
      next: (res) => {
        if (res.success) {
          this.subscriptions.set(res.content);
          this.paging.set(res.paging);
          this.currentPage.set(res.paging?.pageIndex ?? this.currentPage());
        } else {
          this.error.set(res.message || 'Failed to load subscriptions.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load subscriptions.');
        this.isLoading.set(false);
      },
    });
  }

  protected goToPage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) return;
    this.currentPage.set(page);
    this.load();
  }

  protected prevPage(): void {
    if (!this.hasPrev()) return;
    this.currentPage.set(this.currentPage() - 1);
    this.load();
  }

  protected nextPage(): void {
    if (!this.hasNext()) return;
    this.currentPage.set(this.currentPage() + 1);
    this.load();
  }

  protected changePageSize(event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    if (!value || value === this.pageSize()) return;
    this.pageSize.set(value);
    this.currentPage.set(1);
    this.load();
  }

  protected formatDate(iso: string): string {
    return new Intl.DateTimeFormat('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
  }

  protected subscriptionStatusLabel(status: number): string {
    switch (status) {
      case 0:  return 'Trial';
      case 1:  return 'Active';
      case 2:  return 'Expired';
      case 3:  return 'Cancelled';
      default: return 'Unknown';
    }
  }

  protected subscriptionBadgeClass(status: number): string {
    switch (status) {
      case 1:  return 'bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400';
      case 0:  return 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400';
      case 2:  return 'bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400';
      case 3:  return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400';
    }
  }
}
