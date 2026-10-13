import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-body',
  imports: [NgClass],
  template: `<tbody [ngClass]="className"><ng-content></ng-content></tbody>`,
  styles: `:host { display: contents; }`,
})
export class TableBody {
  @Input() className = 'divide-y divide-gray-200 dark:divide-gray-800';
}
