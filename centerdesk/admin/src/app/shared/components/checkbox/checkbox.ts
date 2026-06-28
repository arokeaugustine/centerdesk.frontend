import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-checkbox',
  imports: [],
  template: `
    <label class="flex cursor-pointer select-none items-center gap-2">
      <input
        type="checkbox"
        [checked]="checked"
        (change)="onChange($event)"
        class="h-4 w-4 rounded border-gray-300 accent-brand-500 dark:border-gray-700"
      />
      @if (label) {
        <span class="text-sm text-gray-700 dark:text-gray-400">{{ label }}</span>
      }
    </label>
  `,
  styleUrl: './checkbox.scss',
})
export class Checkbox {
  @Input() checked = false;
  @Output() checkedChange = new EventEmitter<boolean>();
  @Input() label = '';

  protected onChange(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
