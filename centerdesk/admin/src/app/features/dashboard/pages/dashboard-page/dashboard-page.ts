import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ReportService, DashboardSummary } from '../../../../core/reports/report.service';
import { TenantsService, TenantItem, TenantStatus, TENANT_STATUS_LABEL } from '../../../tenants/tenants.service';

@Component({
  selector: 'app-dashboard-page',
  imports: [RouterLink],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage {
  private readonly reports = inject(ReportService);
  private readonly tenants = inject(TenantsService);

  protected readonly TenantStatus = TenantStatus;
  protected readonly TENANT_STATUS_LABEL = TENANT_STATUS_LABEL;

  protected readonly summary = signal<DashboardSummary | null>(null);
  protected readonly summaryLoading = signal(true);
  protected readonly summaryError = signal<string | null>(null);

  protected readonly recentTenants = signal<TenantItem[]>([]);
  protected readonly tenantsLoading = signal(true);

  constructor() {
    this.reports.getDashboardSummary().subscribe({
      next: (res) => {
        if (res.success) this.summary.set(res.content);
        else this.summaryError.set('Failed to load summary.');
        this.summaryLoading.set(false);
      },
      error: () => {
        this.summaryError.set('Could not reach the server.');
        this.summaryLoading.set(false);
      },
    });

    this.tenants.getTenants({ page: 1, pageSize: 5 }).subscribe({
      next: (res) => {
        if (res.success) this.recentTenants.set(res.content);
        this.tenantsLoading.set(false);
      },
      error: () => this.tenantsLoading.set(false),
    });
  }

  protected formatNaira(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  protected formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected statusClass(status: TenantStatus): string {
    switch (status) {
      case TenantStatus.Active:    return 'bg-success-50 text-success-700 dark:bg-success-500/10 dark:text-success-400';
      case TenantStatus.Pending:   return 'bg-warning-50 text-warning-700 dark:bg-warning-500/10 dark:text-warning-400';
      case TenantStatus.Suspended: return 'bg-error-50 text-error-700 dark:bg-error-500/10 dark:text-error-400';
      case TenantStatus.Cancelled: return 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400';
    }
  }
}
