import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { SidebarService } from '../../core/sidebar/sidebar.service';
import { NotificationClientService } from '../../core/notifications/notification-client.service';
import { Sidebar } from '../sidebar/sidebar';
import { Topbar } from '../topbar/topbar';

@Component({
  selector: 'app-shell',
  imports: [NgClass, RouterOutlet, Sidebar, Topbar],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly sidebar = inject(SidebarService);

  // Injected solely to start the SignalR connection lifecycle (see the service's doc comment) —
  // Shell is only ever mounted once the user is authenticated.
  private readonly notifications = inject(NotificationClientService);
}
