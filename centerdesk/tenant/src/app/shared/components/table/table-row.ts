import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-row',
  imports: [NgClass],
  template: `<tr [ngClass]="className"><ng-content></ng-content></tr>`,
})
export class TableRow {
  @Input() className = 'hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors';
}
