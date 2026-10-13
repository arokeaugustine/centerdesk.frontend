import { Component, computed, input } from '@angular/core';
import { TicketAttachment } from '../../models/ticket.models';

type PreviewKind = 'image' | 'audio' | 'video' | 'file';

// File types worth a second look before opening: they can run code or carry scripts.
const RISKY_EXTENSIONS = new Set([
  'exe', 'dll', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'js', 'jse', 'vbs', 'vbe', 'wsf', 'ps1',
  'hta', 'lnk', 'reg', 'jar', 'apk', 'sh', 'html', 'htm', 'svg', 'docm', 'xlsm', 'pptm', 'iso',
]);

/**
 * The files on one message in the ticket thread: images as thumbnails, voice notes and audio
 * with a player, videos inline, everything else (PDFs, documents, forwarded emails) as a file
 * row with Open / Download. WhatsApp files still being fetched show as "downloading", and files
 * that couldn't be saved say why. Images embedded in an email's HTML are skipped — they're
 * already shown inside the message body.
 */
@Component({
  selector: 'app-message-attachments',
  templateUrl: './message-attachments.html',
})
export class MessageAttachments {
  readonly attachments = input.required<TicketAttachment[]>();

  // Ready inline email images are rendered inside the body itself.
  private readonly visible = computed(() =>
    this.attachments().filter((a) => !(a.isInline && a.status === 'ready')),
  );

  protected readonly images = computed(() => this.visible().filter((a) => this.kind(a) === 'image'));
  protected readonly audios = computed(() => this.visible().filter((a) => this.kind(a) === 'audio'));
  protected readonly videos = computed(() => this.visible().filter((a) => this.kind(a) === 'video'));
  protected readonly files = computed(() => this.visible().filter((a) => this.kind(a) === 'file'));
  protected readonly hasAny = computed(() => this.visible().length > 0);

  private static playableCache = new Map<string, boolean>();

  protected kind(a: TicketAttachment): PreviewKind {
    if (a.status !== 'ready' || !a.viewUrl) return 'file';
    const type = a.contentType.toLowerCase();
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('audio/')) return 'audio';
    if (type.startsWith('video/')) return 'video';
    return 'file';
  }

  /** Whether this browser can play the format (e.g. older Safari can't play WhatsApp's .ogg voice notes). */
  protected canPlay(a: TicketAttachment): boolean {
    const type = a.contentType.toLowerCase();
    const cached = MessageAttachments.playableCache.get(type);
    if (cached !== undefined) return cached;
    const element = document.createElement(type.startsWith('video/') ? 'video' : 'audio');
    const playable = element.canPlayType(type === 'audio/ogg' ? 'audio/ogg; codecs=opus' : type) !== '';
    MessageAttachments.playableCache.set(type, playable);
    return playable;
  }

  protected isVoiceNote(a: TicketAttachment): boolean {
    return a.fileName.toLowerCase().startsWith('voice-note-');
  }

  protected isRisky(a: TicketAttachment): boolean {
    const dot = a.fileName.lastIndexOf('.');
    return dot >= 0 && RISKY_EXTENSIONS.has(a.fileName.slice(dot + 1).toLowerCase());
  }

  protected formatSize(bytes: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
