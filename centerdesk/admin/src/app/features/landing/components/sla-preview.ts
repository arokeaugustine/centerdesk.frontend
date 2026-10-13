import { Component } from '@angular/core';
import { NgClass } from '@angular/common';

interface SlaRow {
  ticket: string;
  subject: string;
  status: string;
  detail: string;
  progress: number;
  tone: 'success' | 'warning' | 'gray' | 'error';
}

/** SLA clocks per ticket and a shift handover (sample data). */
@Component({
  selector: 'app-sla-preview',
  imports: [NgClass],
  template: `
    <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-white/10 dark:bg-gray-900"
         role="img" aria-label="Four tickets with SLA clocks — on track, at risk, paused while waiting on the customer, and breached — and a note that tickets moved to the evening shift when the morning shift ended.">
      <div aria-hidden="true">
        <div class="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/[0.06]">
          <p class="text-sm font-semibold text-gray-900 dark:text-white">Resolution targets</p>
          <span class="text-[11px] text-gray-400">Billing · 8h to resolve</span>
        </div>
        <ul class="divide-y divide-gray-100 dark:divide-white/[0.06]">
          @for (row of rows; track row.ticket) {
            <li class="px-4 py-3">
              <div class="flex items-center justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate text-[13px] font-medium text-gray-800 dark:text-gray-100">{{ row.subject }}</p>
                  <p class="text-[11px] text-gray-400">{{ row.ticket }}</p>
                </div>
                <span class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium" [ngClass]="badge(row.tone)">{{ row.status }}</span>
              </div>
              <div class="mt-2 flex items-center gap-2.5">
                <div class="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/[0.06]">
                  <div class="h-1.5 rounded-full" [ngClass]="bar(row.tone)" [style.width.%]="row.progress"></div>
                </div>
                <span class="w-[92px] shrink-0 text-right text-[10px] text-gray-500 dark:text-gray-400">{{ row.detail }}</span>
              </div>
            </li>
          }
        </ul>
        <div class="flex items-start gap-3 border-t border-gray-100 bg-gray-50/80 px-4 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
          <span class="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15">
            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 7h10l-3-3M16 13H6l3 3" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
          <div>
            <p class="text-[12px] font-medium text-gray-800 dark:text-gray-100">Morning shift ended at 4:00 pm</p>
            <p class="text-[11px] leading-5 text-gray-500 dark:text-gray-400">3 open tickets moved to Ifeanyi and Zainab on the evening shift — whoever had the lightest load.</p>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SlaPreview {
  protected readonly rows: SlaRow[] = [
    { ticket: 'TKT-1031 · Email', subject: 'Refund for cancelled order', status: 'On track', detail: '5h 10m left', progress: 35, tone: 'success' },
    { ticket: 'TKT-1027 · WhatsApp', subject: 'Order #4471 still hasn’t arrived', status: 'At risk', detail: '42m left', progress: 91, tone: 'warning' },
    { ticket: 'TKT-1019 · Email', subject: 'Invoice for September', status: 'Paused', detail: 'Waiting on customer', progress: 58, tone: 'gray' },
    { ticket: 'TKT-1002 · Email', subject: 'Login link not working', status: 'Breached', detail: '1h 05m over', progress: 100, tone: 'error' },
  ];

  protected badge(tone: SlaRow['tone']): string {
    return {
      success: 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
      warning: 'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
      gray: 'bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400',
      error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
    }[tone];
  }

  protected bar(tone: SlaRow['tone']): string {
    return { success: 'bg-success-500', warning: 'bg-warning-500', gray: 'bg-gray-300 dark:bg-gray-600', error: 'bg-error-500' }[tone];
  }
}
