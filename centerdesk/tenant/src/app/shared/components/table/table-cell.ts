import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-table-cell',
  imports: [NgClass],
  template: `
    @if (isHeader) {
      <th [ngClass]="className">
        <ng-content></ng-content>
      </th>
    } @else {
      <td [ngClass]="className">
        <ng-content></ng-content>
      </td>
    }
  `,
})
export class TableCell {
  @Input() isHeader = false;
  @Input() className = 'px-4 py-3 text-left text-sm text-gray-700 dark:text-gray-300';
}
