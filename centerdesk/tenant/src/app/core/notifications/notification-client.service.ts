import { Injectable, effect, inject, signal } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { API_BASE_URL } from '../config/api.config';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  NotificationItem,
  SubTicketForwardedPayload,
  SubTicketReturnedPayload,
  TicketAssignedPayload,
} from './notification.models';

const MAX_RECENT = 30;

/**
 * Connects to the CenterDesk.API NotificationHub (SignalR) whenever the user is authenticated,
 * and disconnects on logout. The hub is push-only — clients never invoke a method on it, they
 * just listen for server-pushed events (see NotificationHub's doc comment on the backend).
 *
 * This service is instantiated (and its connection lifecycle effect starts running) the first
 * time it's injected — Shell injects it purely to trigger that, since Shell is only ever
 * mounted for an authenticated user.
 */
@Injectable({ providedIn: 'root' })
export class NotificationClientService {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  private connection: HubConnection | null = null;
  private idCounter = 0;

  readonly recent = signal<NotificationItem[]>([]);
  readonly unreadCount = signal(0);

  constructor() {
    effect(() => {
      if (this.auth.isAuthenticated() && this.auth.token()) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  markAllRead(): void {
    this.recent.update((items) => items.map((i) => ({ ...i, read: true })));
    this.unreadCount.set(0);
  }

  private connect(): void {
    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) return;

    this.connection = new HubConnectionBuilder()
      .withUrl(`${this.apiBaseUrl}/hubs/notifications`, {
        accessTokenFactory: () => this.auth.token() ?? '',
        // SignalR's client sends credentialed requests by default, and a browser refuses a
        // credentialed response carrying `Access-Control-Allow-Origin: *` — which is exactly
        // what the API's AllowAnyOrigin policy returns, so the hub is a different origin
        // (localhost:7213) from the app (localhost:4200) and every connection was blocked.
        // Nothing here rides on cookies: the JWT goes via accessTokenFactory, so the
        // connection doesn't need credentials at all.
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();

    this.connection.on('TicketAssigned', (payload: TicketAssignedPayload) => {
      this.push({
        event: 'TicketAssigned',
        message: `Ticket ${payload.ticketNumber} assigned to you: ${payload.subject}`,
        link: ['/tickets', payload.ticketUid],
      });
      this.toast.info(`New ticket assigned: ${payload.ticketNumber}`);
    });

    this.connection.on('SubTicketForwarded', (payload: SubTicketForwardedPayload) => {
      this.push({
        event: 'SubTicketForwarded',
        message: `${payload.forwardedBy} forwarded sub-ticket ${payload.subTicketNumber} to you`,
        link: ['/sub-tickets', payload.subTicketUid],
      });
      this.toast.info(`Sub-ticket forwarded: ${payload.subTicketNumber}`);
    });

    this.connection.on('SubTicketReturned', (payload: SubTicketReturnedPayload) => {
      this.push({
        event: 'SubTicketReturned',
        message: `Sub-ticket ${payload.subTicketNumber} was returned to you${payload.remark ? `: ${payload.remark}` : ''}`,
        link: ['/tickets', payload.ticketUid],
      });
      this.toast.info(`Sub-ticket returned: ${payload.subTicketNumber}`);
    });

    this.connection.start().catch((error: unknown) => {
      // No toast — notifications are a convenience layer on top of REST, not a critical path,
      // and the reconnect policy handles transient drops. It does get logged, though: this
      // failing completely silently is why a hub that never connected at all went unnoticed.
      console.warn('[notifications] hub connection failed', error);
    });
  }

  private disconnect(): void {
    if (this.connection) {
      const conn = this.connection;
      this.connection = null;
      conn.stop().catch(() => {});
    }
  }

  private push(partial: Pick<NotificationItem, 'event' | 'message' | 'link'>): void {
    const item: NotificationItem = {
      id: String(++this.idCounter),
      receivedAt: new Date().toISOString(),
      read: false,
      ...partial,
    };
    this.recent.update((items) => [item, ...items].slice(0, MAX_RECENT));
    this.unreadCount.update((c) => c + 1);
  }
}
