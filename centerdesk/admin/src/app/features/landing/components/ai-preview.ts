import { Component } from '@angular/core';

/** How AI auto-response decides: one confident answer sent, one held for a person (sample data). */
@Component({
  selector: 'app-ai-preview',
  template: `
    <div class="space-y-4" role="img" aria-label="Two AI decisions: a question answered automatically from a knowledge base article with a 92% match, and one passed to the team because no article matched well enough.">
      <div aria-hidden="true" class="space-y-4">
        <div class="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xl sm:p-5 dark:border-white/10 dark:bg-gray-900">
          <div class="flex items-center justify-between gap-3">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-brand-500 to-theme-purple-500 px-2.5 py-1 text-[11px] font-medium text-white">
              <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 1.5 11.6 7l5.4 1.5-5.4 1.6L10 15.5 8.4 10 3 8.5 8.4 7 10 1.5Zm6 10 .8 2.2 2.2.8-2.2.8L16 17.5l-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>
              Answered by AI
            </span>
            <span class="text-[11px] text-gray-400">TKT-1039 · WhatsApp</span>
          </div>
          <p class="mt-3 text-[13px] text-gray-500 dark:text-gray-400">“Can I change my delivery address after paying?”</p>
          <div class="mt-3 rounded-xl bg-gray-50 p-3.5 text-[13px] leading-5 text-gray-700 dark:bg-white/[0.04] dark:text-gray-200">
            Yes — you can change it until your order is packed, usually within 2 hours of payment. Reply with your new address and order number and we’ll update it for you.
          </div>
          <div class="mt-3.5 flex flex-wrap items-center gap-x-4 gap-y-2">
            <div class="flex min-w-[160px] flex-1 items-center gap-2">
              <span class="text-[11px] text-gray-500 dark:text-gray-400">Match</span>
              <div class="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/[0.06]"><div class="h-1.5 w-[92%] rounded-full bg-success-500"></div></div>
              <span class="text-[11px] font-semibold text-gray-900 dark:text-white">92%</span>
            </div>
            <span class="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H16v12H5.5A1.5 1.5 0 0 0 4 16.5v-12Z" stroke-linejoin="round"/></svg>
              From “Changing a delivery address”
            </span>
          </div>
        </div>

        <div class="ml-auto max-w-[92%] rounded-2xl border border-dashed border-gray-300 bg-white/70 p-4 dark:border-white/15 dark:bg-white/[0.02]">
          <div class="flex items-center justify-between gap-3">
            <span class="inline-flex items-center gap-1.5 rounded-full bg-warning-50 px-2.5 py-1 text-[11px] font-medium text-warning-700 dark:bg-warning-500/15 dark:text-warning-400">
              <svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm-.9 3.5h1.8v4.2H9.1V6.5Zm0 5.6h1.8v1.8H9.1v-1.8Z"/></svg>
              Passed to your team
            </span>
            <span class="text-[11px] text-gray-400">TKT-1040 · Email</span>
          </div>
          <p class="mt-3 text-[13px] text-gray-500 dark:text-gray-400">“Why was I charged twice for one booking?”</p>
          <p class="mt-2 text-[12px] leading-5 text-gray-600 dark:text-gray-300"><span class="font-medium">Reason:</span> no confident knowledge-base match (best was 41%). Assigned to Amaka, who’s on shift.</p>
        </div>
      </div>
    </div>
  `,
})
export class AiPreview {}
