import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { BrandLogo } from './brand-logo';

/** The main site's top bar: product links, theme switch, and sign in / sign up (or the way back in). */
@Component({
  selector: 'app-site-header',
  imports: [RouterLink, BrandLogo],
  template: `
    <header
      class="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      [class]="scrolled() || menuOpen()
        ? 'border-b border-gray-200/80 bg-white/85 backdrop-blur-xl dark:border-white/[0.06] dark:bg-gray-950/80'
        : 'border-b border-transparent bg-transparent'"
    >
      <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Main">
        <a routerLink="/" class="rounded-lg focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-500/20" aria-label="CenterDesk home">
          <app-brand-logo [size]="30" />
        </a>

        <div class="hidden items-center gap-1 lg:flex">
          @for (link of links; track link.fragment) {
            <a
              routerLink="/"
              [fragment]="link.fragment"
              class="rounded-lg px-3.5 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
              >{{ link.label }}</a>
          }
        </div>

        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="theme.toggleTheme()"
            class="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
            [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (theme.theme() === 'dark') {
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>
            } @else {
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11Z"/></svg>
            }
          </button>

          @if (auth.isAuthenticated()) {
            <a
              [routerLink]="auth.homeUrl()"
              class="hidden rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-gray-800 sm:inline-flex dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100"
            >{{ auth.isOwner() ? 'My account' : 'Open dashboard' }}</a>
          } @else {
            <a
              routerLink="/auth/login"
              class="hidden rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 sm:inline-flex dark:text-gray-300 dark:hover:bg-white/5"
            >Log in</a>
            <a
              routerLink="/signup"
              class="hidden items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs transition-colors hover:bg-brand-600 sm:inline-flex"
            >
              Start free trial
            </a>
          }

          <button
            type="button"
            (click)="menuOpen.set(!menuOpen())"
            class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 lg:hidden dark:text-gray-300 dark:hover:bg-white/5"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="site-menu"
            aria-label="Menu"
          >
            @if (menuOpen()) {
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
            } @else {
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>
            }
          </button>
        </div>
      </nav>

      @if (menuOpen()) {
        <div id="site-menu" class="border-t border-gray-200 bg-white px-4 pb-6 pt-3 lg:hidden dark:border-white/[0.06] dark:bg-gray-950">
          @for (link of links; track link.fragment) {
            <a
              routerLink="/"
              [fragment]="link.fragment"
              (click)="menuOpen.set(false)"
              class="block rounded-lg px-3 py-3 text-base font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5"
              >{{ link.label }}</a>
          }
          <div class="mt-4 grid gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.06]">
            @if (auth.isAuthenticated()) {
              <a [routerLink]="auth.homeUrl()" (click)="menuOpen.set(false)"
                 class="rounded-lg bg-gray-900 px-4 py-3 text-center text-sm font-medium text-white dark:bg-white dark:text-gray-900">
                {{ auth.isOwner() ? 'My account' : 'Open dashboard' }}
              </a>
            } @else {
              <a routerLink="/signup" (click)="menuOpen.set(false)"
                 class="rounded-lg bg-brand-500 px-4 py-3 text-center text-sm font-medium text-white">Start free trial</a>
              <a routerLink="/auth/login" (click)="menuOpen.set(false)"
                 class="rounded-lg border border-gray-300 px-4 py-3 text-center text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Log in</a>
            }
          </div>
        </div>
      }
    </header>
  `,
})
export class SiteHeader {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);

  protected readonly scrolled = signal(false);
  protected readonly menuOpen = signal(false);

  protected readonly links = [
    { label: 'Product', fragment: 'product' },
    { label: 'How it works', fragment: 'how-it-works' },
    { label: 'Pricing', fragment: 'pricing' },
    { label: 'FAQ', fragment: 'faq' },
  ];

  @HostListener('window:scroll')
  onScroll(): void {
    this.scrolled.set(window.scrollY > 8);
  }
}
