import { Component, EventEmitter, Input, Output, computed } from '@angular/core';

@Component({
  selector: 'app-button',
  imports: [],
  template: `
    <button
      [type]="type"
      [disabled]="disabled || loading"
      [class]="classes()"
      (click)="handleClick()"
    >
      @if (loading) {
        <svg class="-ml-1 mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      }
      <ng-content />
    </button>
  `,
  styleUrl: './button.scss',
})
export class Button {
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() variant: 'primary' | 'outline' | 'ghost' = 'primary';
  @Input() className = '';
  @Input() disabled = false;
  @Input() loading = false;
  @Output() btnClick = new EventEmitter<void>();

  protected readonly classes = computed(() => {
    const base =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 disabled:cursor-not-allowed disabled:opacity-50';
    const sizes: Record<string, string> = {
      sm: 'px-4 py-2.5 text-sm',
      md: 'px-5 py-3 text-sm',
      lg: 'px-6 py-3.5 text-base',
    };
    const variants: Record<string, string> = {
      primary:
        'bg-brand-500 text-white hover:bg-brand-600 focus:ring-brand-500/20 dark:bg-brand-600 dark:hover:bg-brand-500',
      outline:
        'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-200 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5',
      ghost:
        'text-gray-700 hover:bg-gray-100 focus:ring-gray-200 dark:text-gray-300 dark:hover:bg-white/5',
    };
    return [base, sizes[this.size], variants[this.variant], this.className]
      .filter(Boolean)
      .join(' ');
  });

  protected handleClick(): void {
    if (!this.disabled && !this.loading) {
      this.btnClick.emit();
    }
  }
}
