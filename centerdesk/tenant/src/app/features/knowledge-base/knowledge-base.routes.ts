import { Routes } from '@angular/router';

export const knowledgeBaseRoutes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/knowledge-base-page/knowledge-base-page').then(m => m.KnowledgeBasePage),
  },
];
