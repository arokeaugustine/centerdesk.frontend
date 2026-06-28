import { Component, ElementRef, OnDestroy, ViewChild, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SidebarService } from '../../core/sidebar/sidebar.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'app-topbar',
  imports: [NgClass, RouterLink],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar implements OnDestroy {
  protected readonly sidebar = inject(SidebarService);
  protected readonly theme = inject(ThemeService);
  private readonly auth = inject(AuthService);
  protected readonly user = this.auth.user;

  protected readonly isApplicationMenuOpen = signal(false);
  protected readonly isUserDropdownOpen = signal(false);

  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;

  private readonly keyDownHandler = (event: KeyboardEvent): void => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      this.searchInput?.nativeElement.focus();
    }
    if (event.key === 'Escape') {
      this.isUserDropdownOpen.set(false);
    }
  };

  constructor() {
    document.addEventListener('keydown', this.keyDownHandler);
  }

  ngOnDestroy(): void {
    document.removeEventListener('keydown', this.keyDownHandler);
  }

  handleToggle(): void {
    if (window.innerWidth >= 1280) {
      this.sidebar.toggleExpanded();
    } else {
      this.sidebar.toggleMobileOpen();
    }
  }

  toggleApplicationMenu(): void {
    this.isApplicationMenuOpen.update(v => !v);
  }

  toggleUserDropdown(): void {
    this.isUserDropdownOpen.update(v => !v);
  }

  signOut(): void {
    this.auth.logout();
  }
}
