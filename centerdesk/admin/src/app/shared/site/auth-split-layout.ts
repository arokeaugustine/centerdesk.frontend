import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeService } from '../../core/theme/theme.service';
import { BrandLogo } from './brand-logo';

/**
 * Sign-in and sign-up: the form on the left, a brand panel on the right (the template's auth page
 * layout — the brand-950 panel with the grid shapes).
 */
@Component({
  selector: 'app-auth-split-layout',
  imports: [RouterLink, BrandLogo],
  template: `
    <div class="relative min-h-screen bg-white lg:grid lg:grid-cols-2 dark:bg-gray-950">
      <div class="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14">
        <div class="flex items-center justify-between">
          <a routerLink="/" class="rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20" aria-label="CenterDesk home">
            <app-brand-logo [size]="30" />
          </a>
          <button type="button" (click)="theme.toggleTheme()"
                  class="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                  [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
            @if (theme.theme() === 'dark') {
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>
            } @else {
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11Z"/></svg>
            }
          </button>
        </div>
        <div class="flex flex-1 items-center justify-center py-10">
          <div class="w-full max-w-[440px]">
            <ng-content select="[form]" />
          </div>
        </div>
        <p class="text-center text-xs text-gray-400 lg:text-left">&copy; {{ year }} CenterDesk</p>
      </div>

      <aside class="relative hidden overflow-hidden bg-brand-950 lg:flex lg:items-center lg:justify-center dark:bg-white/[0.03]">
        <img src="/images/shape/grid-01.svg" alt="" class="pointer-events-none absolute right-0 top-0 w-full max-w-[250px] xl:max-w-[420px]" />
        <img src="/images/shape/grid-01.svg" alt="" class="pointer-events-none absolute bottom-0 left-0 w-full max-w-[250px] rotate-180 xl:max-w-[420px]" />
        <div class="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl"></div>
        <div class="relative w-full max-w-md px-10">
          <ng-content select="[aside]" />
        </div>
      </aside>
    </div>
  `,
})
export class AuthSplitLayout {
  protected readonly theme = inject(ThemeService);
  protected readonly year = new Date().getFullYear();
}
