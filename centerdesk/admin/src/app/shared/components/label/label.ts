import { Component } from '@angular/core';

@Component({
  selector: 'app-label',
  imports: [],
  template: `
    <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
      <ng-content />
    </label>
  `,
  styleUrl: './label.scss',
})
export class Label {}
