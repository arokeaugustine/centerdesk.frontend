import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * Ported from the angular template's ui/modal component (see `angular template/src/app/shared/components/ui/modal`).
 * The stub that used to live here just rendered "modal works!" — this is the real
 * backdrop + escape-to-close + body-scroll-lock implementation, adapted to this app's
 * naming conventions (class `Modal`, standalone `imports: []`).
 */
@Component({
  selector: 'app-modal',
  imports: [NgClass],
  templateUrl: './modal.html',
})
export class Modal implements OnInit, OnChanges, OnDestroy {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Input() className = 'max-w-lg';
  @Input() showCloseButton = true;
  @Input() isFullscreen = false;

  constructor(private readonly el: ElementRef) {}

  ngOnInit(): void {
    if (this.isOpen) {
      document.body.style.overflow = 'hidden';
    }
  }

  ngOnDestroy(): void {
    document.body.style.overflow = 'unset';
  }

  ngOnChanges(): void {
    document.body.style.overflow = this.isOpen ? 'hidden' : 'unset';
  }

  protected onBackdropClick(): void {
    if (!this.isFullscreen) {
      this.close.emit();
    }
  }

  protected onContentClick(event: MouseEvent): void {
    event.stopPropagation();
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.isOpen) {
      this.close.emit();
    }
  }
}
