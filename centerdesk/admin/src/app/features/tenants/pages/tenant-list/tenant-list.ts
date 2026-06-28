import { Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import {
  TenantsService,
  TenantItem,
  TenantStatus,
  TENANT_STATUS_LABEL,
} from '../../tenants.service';
import { Paging } from '../../../../core/auth/auth.models';

interface StatusTab {
  label: string;
  value: TenantStatus | null;
}

@Component({
  selector: 'app-tenant-list',
  imports: [RouterLink, NgClass],
  templateUrl: './tenant-list.html',
  styleUrl: './tenant-list.scss',
})
export class TenantList {
  private readonly tenantsService = inject(TenantsService);

  protected readonly TenantStatus = TenantStatus;
  protected readonly TENANT_STATUS_LABEL = TENANT_STATUS_LABEL;

  protected readonly tabs: StatusTab[] = [
    { label: 'All', value: null },
    { label: 'Active', value: TenantStatus.Active },
    { label: 'Pending', value: TenantStatus.Pending },
    { label: 'Suspended', value: TenantStatus.Suspended },
    { label: 'Cancelled', value: TenantStatus.Cancelled },
  ];

  protected readonly PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
  protected readonly activeStatus = signal<TenantStatus | null>(null);
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly tenants = signal<TenantItem[]>([]);
  protected readonly paging = signal<Paging | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly totalItems = computed(() => this.paging()?.totalItems ?? 0);
  protected readonly totalPages = computed(() => this.paging()?.totalPages ?? 1);
  protected readonly hasPrev = computed(() => this.paging()?.hasPreviousPage ?? false);
  protected readonly hasNext = computed(() => this.paging()?.hasNextPage ?? false);

  protected readonly pageRange = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(1, current - 2);
    const end = Math.min(total, current + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  });

  constructor() {
    this.load();
  }

  protected selectTab(status: TenantStatus | null): void {
    if (this.activeStatus() === status) return;
    this.activeStatus.set(status);
    this.currentPage.set(1);
    this.load();
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

  private load(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.tenantsService
      .getTenants({
        page: this.currentPage(),
        pageSize: this.pageSize(),
        status: this.activeStatus(),
      })
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.tenants.set(Array.isArray(res.content) ? res.content : []);
            this.paging.set(res.paging);
            this.currentPage.set(res.paging?.pageIndex ?? this.currentPage());
          } else {
            this.error.set('Failed to load tenants.');
          }
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Could not reach the server.');
          this.isLoading.set(false);
        },
      });
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected statusBadgeClass(status: TenantStatus): string {
    switch (status) {
      case TenantStatus.Active:    return 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400';
      case TenantStatus.Pending:   return 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400';
      case TenantStatus.Suspended: return 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400';
      case TenantStatus.Cancelled: return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400';
    }
  }
}
