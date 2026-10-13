import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AccountService, apiMessage } from './account.service';
import { CurrentSubscription, PlanItem, Workspace } from './account.models';

/** What the account area shows, loaded once by the shell and refreshed after changes. */
@Injectable()
export class AccountState {
  private readonly account = inject(AccountService);

  readonly workspace = signal<Workspace | null>(null);
  readonly subscription = signal<CurrentSubscription | null>(null);
  readonly plans = signal<PlanItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly sortedPlans = computed(() => [...this.plans()].sort((a, b) => a.sortOrder - b.sortOrder));

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      workspace: this.account.workspace(),
      subscription: this.account.subscription(),
      plans: this.account.plans(),
    }).subscribe({
      next: ({ workspace, subscription, plans }) => {
        this.workspace.set(workspace.content);
        this.subscription.set(subscription.content);
        this.plans.set(plans.content ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(apiMessage(err, 'We couldn’t load your account. Please try again.'));
        this.loading.set(false);
      },
    });
  }

  refreshSubscription(): void {
    this.account.subscription().subscribe({ next: (res) => this.subscription.set(res.content) });
  }
}
