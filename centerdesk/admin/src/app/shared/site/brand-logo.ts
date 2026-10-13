import { Component, Input } from '@angular/core';

/**
 * CenterDesk's mark: a "C" around a centre point, on the brand-blue tile. Original artwork — the
 * template's own logo files belong to the template and aren't used for our brand.
 */
@Component({
  selector: 'app-brand-logo',
  template: `
    <span class="inline-flex items-center gap-2.5">
      <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 32 32" fill="none" aria-hidden="true" class="shrink-0">
        <rect width="32" height="32" rx="8.5" fill="#465FFF" />
        <path d="M21.8 10.6a8 8 0 1 0 0 10.8" stroke="#fff" stroke-width="3.2" stroke-linecap="round" />
        <circle cx="16" cy="16" r="2.7" fill="#fff" />
      </svg>
      @if (variant === 'full') {
        <span class="text-[19px] font-semibold tracking-[-0.02em]" [class]="textClass">CenterDesk</span>
      }
    </span>
  `,
})
export class BrandLogo {
  @Input() variant: 'full' | 'mark' = 'full';
  @Input() size = 32;
  @Input() textClass = 'text-gray-900 dark:text-white';
}
