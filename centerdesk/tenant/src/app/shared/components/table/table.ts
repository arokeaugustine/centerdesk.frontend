import { NgClass } from '@angular/common';
import { Component, Input } from '@angular/core';

/**
 * Ported from the angular template's ui/table components (see
 * `angular template/src/app/shared/components/ui/table`). Composable table primitives —
 * `app-table` / `app-table-header` / `app-table-body` / `app-table-row` / `app-table-cell` —
 * used together instead of hand-rolled <table> markup on every page.
 */
@Component({
  selector: 'app-table',
  imports: [NgClass],
  template: `<table [ngClass]="'min-w-full ' + className"><ng-content></ng-content></table>`,
})
export class Table {
  @Input() className = '';
}
