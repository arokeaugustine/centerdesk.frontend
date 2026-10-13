import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandLogo } from './brand-logo';
import { SITE } from './site-links';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink, BrandLogo],
  template: `
    <footer class="border-t border-gray-200 bg-white dark:border-white/[0.06] dark:bg-gray-950">
      <div class="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div class="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div class="max-w-xs">
            <app-brand-logo [size]="28" />
            <p class="mt-4 text-sm leading-6 text-gray-500 dark:text-gray-400">
              The helpdesk for teams that answer customers on email and WhatsApp.
            </p>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Product</h3>
            <ul class="mt-4 space-y-3 text-sm">
              <li><a routerLink="/" fragment="product" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Features</a></li>
              <li><a routerLink="/" fragment="how-it-works" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">How it works</a></li>
              <li><a routerLink="/" fragment="pricing" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Pricing</a></li>
              <li><a routerLink="/" fragment="faq" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">FAQ</a></li>
            </ul>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Account</h3>
            <ul class="mt-4 space-y-3 text-sm">
              <li><a routerLink="/signup" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Start a free trial</a></li>
              <li><a routerLink="/auth/login" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Log in</a></li>
              <li><a routerLink="/auth/login" fragment="workspace" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Find your workspace</a></li>
            </ul>
          </div>

          <div>
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">Talk to us</h3>
            <ul class="mt-4 space-y-3 text-sm">
              <li><a [href]="'mailto:' + site.contactEmail" class="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">{{ site.contactEmail }}</a></li>
            </ul>
          </div>
        </div>

        <div class="mt-12 flex flex-col gap-4 border-t border-gray-100 pt-6 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between dark:border-white/[0.06] dark:text-gray-500">
          <p>&copy; {{ year }} CenterDesk. All rights reserved.</p>
          <p>Prices shown in naira (₦) and US dollars ($). Payments processed by Bachs.</p>
        </div>
      </div>
    </footer>
  `,
})
export class SiteFooter {
  protected readonly site = SITE;
  protected readonly year = new Date().getFullYear();
}
