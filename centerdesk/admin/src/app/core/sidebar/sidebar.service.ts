import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SidebarService {
  readonly isExpanded = signal(true);
  readonly isMobileOpen = signal(false);
  readonly isHovered = signal(false);

  toggleExpanded(): void {
    this.isExpanded.update(v => !v);
  }

  setExpanded(val: boolean): void {
    this.isExpanded.set(val);
  }

  toggleMobileOpen(): void {
    this.isMobileOpen.update(v => !v);
  }

  setMobileOpen(val: boolean): void {
    this.isMobileOpen.set(val);
  }

  setHovered(val: boolean): void {
    this.isHovered.set(val);
  }
}
