import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-dropdown-item',
  imports: [NgClass],
  templateUrl: './dropdown-item.html',
})
export class DropdownItem {
  @Input() baseClassName = 'block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900';
  @Input() className = '';
  @Output() itemClick = new EventEmitter<void>();

  get combinedClasses(): string {
    return `${this.baseClassName} ${this.className}`.trim();
  }

  handleClick(event: Event): void {
    event.preventDefault();
    this.itemClick.emit();
  }
}
