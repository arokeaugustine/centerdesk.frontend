import { Component, OnDestroy, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { SidebarService } from '../../core/sidebar/sidebar.service';
import { ThemeService } from '../../core/theme/theme.service';
import { AuthService } from '../../core/auth/auth.service';
import { NotificationClientService } from '../../core/notifications/notification-client.service';
import { NotificationItem } from '../../core/notifications/notification.models';

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
  protected readonly notifications = inject(NotificationClientService);
  private readonly router = inject(Router);
  protected readonly user = this.auth.user;

  protected readonly isApplicationMenuOpen = signal(false);
  protected readonly isUserDropdownOpen = signal(false);
  protected readonly isNotificationsOpen = signal(false);

  protected readonly unreadBadge = computed(() => {
    const count = this.notifications.unreadCount();
    return count > 9 ? '9+' : String(count);
  });

  private readonly keyDownHandler = (event: KeyboardEvent): void => {
    if (event.key === 'Escape') {
      this.isUserDropdownOpen.set(false);
      this.isNotificationsOpen.set(false);
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

  toggleNotifications(): void {
    this.isNotificationsOpen.update(v => !v);
    if (this.isNotificationsOpen()) {
      this.notifications.markAllRead();
    }
  }

  openNotification(item: NotificationItem): void {
    this.isNotificationsOpen.set(false);
    if (item.link) {
      this.router.navigate(item.link);
    }
  }

  timeAgo(iso: string): string {
    const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  signOut(): void {
    this.auth.logout();
  }
}
