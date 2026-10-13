import { Component, ElementRef, HostListener, OnInit, ViewChild, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/theme/theme.service';
import { BrandLogo } from '../../shared/site/brand-logo';
import { AccountState } from './account.state';

/** The workspace owner's area on the main site: their workspace and its subscription. */
@Component({
  selector: 'app-account-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, BrandLogo],
  providers: [AccountState],
  template: `
    <div class="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header class="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur-xl dark:border-white/[0.06] dark:bg-gray-900/90">
        <div class="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
          <a routerLink="/" aria-label="CenterDesk home" class="shrink-0"><app-brand-logo [size]="28" /></a>
          @if (state.workspace(); as ws) {
            <span class="hidden h-6 w-px bg-gray-200 sm:block dark:bg-white/10"></span>
            <span class="hidden max-w-[200px] truncate text-sm font-medium text-gray-700 sm:block dark:text-gray-300">{{ ws.name }}</span>
          }
          <nav class="ml-3 hidden items-center gap-1 md:flex" aria-label="Account">
            @for (item of nav; track item.path) {
              <a [routerLink]="item.path" routerLinkActive="bg-gray-100 text-gray-900 dark:bg-white/[0.06] dark:text-white" [routerLinkActiveOptions]="{ exact: item.exact }"
                 class="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{{ item.label }}</a>
            }
          </nav>

          <div class="ml-auto flex items-center gap-2">
            @if (state.workspace(); as ws) {
              <a [href]="ws.loginUrl" target="_blank" rel="noopener"
                 class="hidden items-center gap-1.5 rounded-lg bg-brand-500 px-3.5 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 sm:inline-flex">
                Open workspace
                <svg class="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 3h7v7M13 3 4 12" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </a>
            }
            <button type="button" (click)="theme.toggleTheme()"
                    class="flex h-9 w-9 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white"
                    [attr.aria-label]="theme.theme() === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'">
              @if (theme.theme() === 'dark') {
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>
              } @else {
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.4 14.6A8.5 8.5 0 0 1 9.4 3.6a8.5 8.5 0 1 0 11 11Z"/></svg>
              }
            </button>
            <div class="relative" #menuRoot>
              <button type="button" (click)="menuOpen.set(!menuOpen())" [attr.aria-expanded]="menuOpen()" aria-haspopup="menu"
                      class="flex items-center gap-2 rounded-full p-0.5 pr-2 hover:bg-gray-100 dark:hover:bg-white/5">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-xs font-semibold text-white">{{ initials() }}</span>
                <svg class="h-3.5 w-3.5 text-gray-400" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m4 6 4 4 4-4" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              @if (menuOpen()) {
                <div class="absolute right-0 mt-2 w-64 rounded-2xl border border-gray-200 bg-white p-2 shadow-theme-lg dark:border-white/10 dark:bg-gray-900" role="menu">
                  <div class="px-3 py-2.5">
                    <p class="truncate text-sm font-medium text-gray-900 dark:text-white">{{ auth.user()?.userName }}</p>
                    <p class="truncate text-xs text-gray-500 dark:text-gray-400">{{ auth.user()?.email }}</p>
                    <p class="mt-1 text-[11px] text-gray-400">Workspace owner</p>
                  </div>
                  <div class="my-1 h-px bg-gray-100 dark:bg-white/[0.06]"></div>
                  @for (item of nav; track item.path) {
                    <a [routerLink]="item.path" (click)="menuOpen.set(false)" role="menuitem"
                       class="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-white/5">{{ item.label }}</a>
                  }
                  @if (state.workspace(); as ws) {
                    <a [href]="ws.loginUrl" target="_blank" rel="noopener" role="menuitem"
                       class="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 sm:hidden dark:text-gray-300 dark:hover:bg-white/5">Open workspace</a>
                  }
                  <button type="button" (click)="signOut()" role="menuitem"
                          class="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-white/5">Sign out</button>
                </div>
              }
            </div>
          </div>
        </div>
      </header>

      <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        @if (state.error() && !state.workspace()) {
          <div class="rounded-2xl border border-gray-200 bg-white p-10 text-center dark:border-white/10 dark:bg-white/[0.03]">
            <p class="text-sm text-gray-600 dark:text-gray-300">{{ state.error() }}</p>
            <button type="button" (click)="state.load()" class="mt-4 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5">Try again</button>
          </div>
        } @else {
          <router-outlet />
        }
      </main>
    </div>
  `,
})
export class AccountShell implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly theme = inject(ThemeService);
  protected readonly state = inject(AccountState);
  @ViewChild('menuRoot') private menuRoot?: ElementRef<HTMLElement>;

  protected readonly menuOpen = signal(false);
  protected readonly nav = [
    { label: 'Overview', path: '/account', exact: true },
    { label: 'Subscription & billing', path: '/account/billing', exact: false },
  ];

  protected readonly initials = computed(() => {
    const name = this.auth.user()?.userName ?? '';
    return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]!.toUpperCase()).join('') || 'CD';
  });

  ngOnInit(): void {
    this.state.load();
  }

  protected signOut(): void {
    this.menuOpen.set(false);
    this.auth.logout('/auth/login');
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen() && this.menuRoot && !this.menuRoot.nativeElement.contains(event.target as Node)) {
      this.menuOpen.set(false);
    }
  }
}
