import { Routes } from '@angular/router';

export const whatsAppChannelsRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/whatsapp-channel-page/whatsapp-channel-page').then(m => m.WhatsAppChannelPage),
  },
];
