import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DashboardService } from '../../services/dashboard.service';
import { DashboardSummary } from '../../models/dashboard.models';
import { StatCard } from '../../components/stat-card/stat-card';
import { TrafficChart } from '../../components/traffic-chart/traffic-chart';
import { ToastService } from '../../../../shared/services/toast.service';
import { isoToday, localDayBounds } from '../../../../shared/utils/date-range';

/**
 * What the cards fall back to before the first response lands, and whenever a request fails.
 * The cards are a fixed set that always renders — an empty desk is a real answer ("nothing came
 * in today"), so blanking the page or hiding cards would just look broken.
 */
const EMPTY_SUMMARY: DashboardSummary = {
  from: '', to: '',
  totalMailsReceived: 0, totalAnswered: 0, answeredPercent: 0,
  totalTickets: 0, resolvedTickets: 0,
  resolvedByAi: 0, resolvedByAiPercent: 0,
  resolvedWithinSla: 0, resolvedWithinSlaPercent: 0,
  resolvedOutsideSla: 0, resolvedOutsideSlaPercent: 0,
  slaViolated: 0, slaViolatedPercent: 0,
  slaTrackedTickets: 0, slaTrackedResolved: 0,
  traffic: [], trafficInterval: 'hour',
};

@Component({
  selector: 'app-dashboard-page',
  imports: [StatCard, TrafficChart],
  templateUrl: './dashboard-page.html',
  styleUrl: './dashboard-page.scss',
})
export class DashboardPage implements OnInit {
  private readonly dashboardService = inject(DashboardService);
  private readonly toast = inject(ToastService);

  /** Both ends default to today, so the dashboard opens on the current day's figures. */
  protected readonly from = signal(isoToday());
  protected readonly to = signal(isoToday());

  /** Upper bound on both inputs: a future window can only ever come back empty. */
  protected readonly today = isoToday();

  /** Never null — see EMPTY_SUMMARY. */
  protected readonly summary = signal<DashboardSummary>(EMPTY_SUMMARY);
  protected readonly isLoading = signal(false);

  protected readonly rangeLabel = computed(() =>
    this.from() === this.to()
      ? (this.from() === this.today ? 'today' : this.from())
      : `${this.from()} to ${this.to()}`);

  protected readonly icons = {
    inbox: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6"><path d="M3 8.5L10.6 13.6C11.4 14.2 12.6 14.2 13.4 13.6L21 8.5M5.5 19H18.5C19.9 19 21 17.9 21 16.5V7.5C21 6.1 19.9 5 18.5 5H5.5C4.1 5 3 6.1 3 7.5V16.5C3 17.9 4.1 19 5.5 19Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    reply: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6"><path d="M9 10L4.5 14L9 18M4.5 14H15C17.8 14 20 11.8 20 9C20 6.2 17.8 4 15 4H11" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    ai: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6"><path d="M12 3L13.6 8.4L19 10L13.6 11.6L12 17L10.4 11.6L5 10L10.4 8.4L12 3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M18 15L18.7 17.3L21 18L18.7 18.7L18 21L17.3 18.7L15 18L17.3 17.3L18 15Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`,
    withinSla: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6"><path d="M12 7V12L15 14M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    outsideSla: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6"><path d="M12 7.5V12.5M21 12C21 16.97 16.97 21 12 21C7.03 21 3 16.97 3 12C3 7.03 7.03 3 12 3C16.97 3 21 7.03 21 12Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="16" r="1" fill="currentColor"/></svg>`,
    violation: `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="size-6"><path d="M10.3 4.3L2.6 17.5C2.1 18.3 2.7 19.4 3.7 19.4H20.3C21.3 19.4 21.9 18.3 21.4 17.5L13.7 4.3C13.2 3.4 11.9 3.4 11.4 4.3H10.3Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 9.5V13.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="16.5" r="1" fill="currentColor"/></svg>`,
  };

  ngOnInit(): void {
    this.load();
  }

  /** Dragging the start past the end (or vice versa) collapses the window onto that one day
   *  rather than sending an inverted range the server can only answer with zeroes. */
  protected onFromChange(value: string): void {
    if (!value) return;

    this.from.set(value);
    if (value > this.to()) this.to.set(value);
    this.load();
  }

  protected onToChange(value: string): void {
    if (!value) return;

    this.to.set(value);
    if (value < this.from()) this.from.set(value);
    this.load();
  }

  protected load(): void {
    this.isLoading.set(true);

    const from = localDayBounds(this.from(), 'start');
    const to = localDayBounds(this.to(), 'end');

    this.dashboardService.getSummary(from, to).subscribe({
      next: (res) => {
        // A success envelope with no content is still "nothing happened", not an error.
        this.summary.set(res.success && res.content ? res.content : EMPTY_SUMMARY);
        if (!res.success) this.toast.error(res.message || 'Failed to load dashboard.');
        this.isLoading.set(false);
      },
      error: () => {
        this.summary.set(EMPTY_SUMMARY);
        this.isLoading.set(false);
        this.toast.error('Failed to load dashboard.');
      },
    });
  }
}
