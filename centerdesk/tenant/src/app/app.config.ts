import {
  ApplicationConfig,
  ErrorHandler,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/http/auth.interceptor';
import { tenantInterceptor } from './core/http/tenant.interceptor';
import { errorInterceptor } from './core/http/error.interceptor';
import { TenantService } from './core/tenant/tenant.service';
import { GlobalErrorHandler } from './core/handlers/error.handler';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([authInterceptor, tenantInterceptor, errorInterceptor])
    ),
    provideAppInitializer(() => inject(TenantService).init()),
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
  ],
};
