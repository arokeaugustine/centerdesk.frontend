import { Component, Input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { SafeHtmlPipe } from '../../../../shared/pipes/safe-html.pipe';

/** Drives the icon tint and the percentage pill — the figure itself always stays neutral. */
export type StatTone = 'brand' | 'success' | 'error' | 'warning' | 'info';

@Component({
  selector: 'app-stat-card',
  imports: [SafeHtmlPipe, DecimalPipe],
  templateUrl: './stat-card.html',
})
export class StatCard {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value = 0;
  /** Inline SVG, rendered through SafeHtmlPipe like the sidebar icons. */
  @Input({ required: true }) icon = '';
  @Input() tone: StatTone = 'brand';

  /**
   * Optional share-of-total pill. Left undefined on cards that are a raw count, so a card
   * never shows a percentage the figure wasn't actually measured against.
   */
  @Input() percent?: number;

  /** What `percent` is out of, e.g. "of all tickets" — the denominators differ per card. */
  @Input() percentLabel = '';

  /** Small print under the figure, for context the label can't carry on its own. */
  @Input() hint = '';

  get iconClasses(): string {
    const tones: Record<StatTone, string> = {
      brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
      success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
      error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
      warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
      info: 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400',
    };
    return tones[this.tone];
  }

  get pillClasses(): string {
    const tones: Record<StatTone, string> = {
      brand: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
      success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
      error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
      warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
      info: 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400',
    };
    return tones[this.tone];
  }
}
