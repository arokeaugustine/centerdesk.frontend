import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ThemeToggleTwo } from '../theme-toggle-two/theme-toggle-two';

/**
 * The workspace's signed-out pages — sign in, forgot password, reset password — share one frame:
 * the form on the left, the brand panel on the right. Projected content goes in the left column.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, ThemeToggleTwo],
  template: `
    <div class="relative p-6 bg-white z-1 dark:bg-gray-900 sm:p-0">
      <div class="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">

        <div class="flex flex-col flex-1 w-full lg:w-1/2">
          <!-- Optional strip above the form (the sign-in page's "back" link). -->
          <div class="w-full max-w-md pt-10 mx-auto">
            <ng-content select="[top]" />
          </div>
          <div class="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
            <ng-content />
          </div>
        </div>

        <div class="items-center hidden w-full h-full lg:w-1/2 bg-brand-950 dark:bg-white/5 lg:grid relative">
          <div class="flex items-center justify-center" style="z-index: 1">
            <div class="absolute right-0 top-0 w-full max-w-[250px] xl:max-w-[450px]" style="z-index: -1">
              <img src="/images/shape/grid-01.svg" alt="" />
            </div>
            <div class="absolute bottom-0 left-0 w-full max-w-[250px] rotate-180 xl:max-w-[450px]" style="z-index: -1">
              <img src="/images/shape/grid-01.svg" alt="" />
            </div>
            <div class="flex flex-col items-center max-w-xs">
              <a routerLink="/" class="block mb-4">
                <img width="231" height="48" src="/images/logo/auth-logo.svg" alt="Logo" />
              </a>
              <p class="text-center text-gray-400 dark:text-white/60">
                Your one-stop solution for managing your desk and team.
              </p>
            </div>
          </div>
        </div>

        <div class="fixed z-50 hidden bottom-6 right-6 sm:block">
          <app-theme-toggle-two />
        </div>

      </div>
    </div>
  `,
})
export class AuthLayout {}
