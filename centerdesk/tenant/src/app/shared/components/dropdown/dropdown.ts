import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-dropdown',
  imports: [NgClass],
  templateUrl: './dropdown.html',
})
export class Dropdown implements AfterViewInit, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() className = '';

  @ViewChild('dropdownRef') dropdownRef!: ElementRef<HTMLDivElement>;

  private readonly handleClickOutside = (event: MouseEvent) => {
    if (
      this.isOpen &&
      this.dropdownRef?.nativeElement &&
      !this.dropdownRef.nativeElement.contains(event.target as Node) &&
      !(event.target as HTMLElement).closest('.dropdown-toggle')
    ) {
      this.close.emit();
    }
  };

  ngAfterViewInit(): void {
    document.addEventListener('mousedown', this.handleClickOutside);
  }

  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.handleClickOutside);
  }
}
