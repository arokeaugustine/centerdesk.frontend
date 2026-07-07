import { Component, HostBinding, Input } from '@angular/core';
import { NgClass } from '@angular/common';
import { SafeHtmlPipe } from '../../pipes/safe-html.pipe';

type BadgeVariant = 'light' | 'solid';
type BadgeSize = 'sm' | 'md';
type BadgeColor = 'primary' | 'success' | 'error' | 'warning' | 'info' | 'light' | 'dark';

@Component({
  selector: 'app-badge',
  imports: [NgClass, SafeHtmlPipe],
  templateUrl: './badge.html',
})
export class Badge {
  @Input() variant: BadgeVariant = 'light';
  @Input() size: BadgeSize = 'md';
  @Input() color: BadgeColor = 'primary';
  @Input() startIcon?: string;
  @Input() endIcon?: string;

  @HostBinding('class') get hostClasses(): string {
    return 'flex';
  }

  get baseStyles(): string {
    return 'inline-flex items-center px-2.5 py-0.5 justify-center gap-1 rounded-full font-medium';
  }

  get sizeClass(): string {
    return this.size === 'sm' ? 'text-theme-xs' : 'text-sm';
  }

  get colorStyles(): string {
    const variants: Record<string, Record<string, string>> = {
      light: {
        primary: 'bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400',
        success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
        error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
        warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
        info: 'bg-blue-50 text-blue-500 dark:bg-blue-500/15 dark:text-blue-500',
        light: 'bg-gray-100 text-gray-700 dark:bg-white/5 dark:text-white/80',
        dark: 'bg-gray-500 text-white dark:bg-white/5 dark:text-white',
      },
      solid: {
        primary: 'bg-brand-500 text-white',
        success: 'bg-success-500 text-white',
        error: 'bg-error-500 text-white',
        warning: 'bg-warning-500 text-white',
        info: 'bg-blue-500 text-white',
        light: 'bg-gray-400 text-white',
        dark: 'bg-gray-700 text-white',
      },
    };
    return variants[this.variant]?.[this.color] ?? '';
  }
}
