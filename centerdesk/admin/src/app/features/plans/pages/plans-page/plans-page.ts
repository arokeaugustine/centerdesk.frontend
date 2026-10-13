import { Component, OnInit, inject, signal } from '@angular/core';
import { PlansService, PlanItem } from '../../plans.service';

@Component({
  selector: 'app-plans-page',
  imports: [],
  templateUrl: './plans-page.html',
  styleUrl: './plans-page.scss',
})
export class PlansPage implements OnInit {
  private readonly plansService = inject(PlansService);

  readonly isLoading = signal(true);
  readonly plans = signal<PlanItem[]>([]);
  readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.plansService.getPlans().subscribe({
      next: (res) => {
        if (res.success) {
          this.plans.set([...res.content].sort((a, b) => a.sortOrder - b.sortOrder));
        } else {
          this.loadError.set(res.message || 'Failed to load plans.');
        }
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set('Failed to load plans.');
        this.isLoading.set(false);
      },
    });
  }

  formatNaira(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount);
  }

  formatUsd(amount: number | null): string {
    if (amount == null) return 'Not set';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(amount);
  }
}
