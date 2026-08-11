import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-header',
  imports: [NgClass],
  template: `<thead [ngClass]="className"><ng-content></ng-content></thead>`,
})
export class TableHeader {
  @Input() className = 'border-b border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50';
}
