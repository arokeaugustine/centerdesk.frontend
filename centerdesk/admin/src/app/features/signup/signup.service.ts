import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { API_BASE_URL } from '../../core/config/api.config';
import { ApiResult } from '../../core/auth/auth.models';
import { SILENT_ERRORS } from '../../core/http/error.interceptor';

export interface SignupRequest {
  companyName: string;
  slug: string;
  adminEmail: string;
  adminFirstName: string;
  adminLastName: string;
  password: string;
}

export interface SignupResult {
  requiresVerification?: false;
  tenantUid: string;
  companyName: string;
  slug: string;
  workspaceUrl: string;
  adminPassword: string | null;
  trialEndsAt: string;
  message: string;
}

/**
 * What a self-service sign-up gets back: nothing exists yet, a 6-digit code is on its way to the
 * address, and the workspace is built once that code is confirmed.
 */
export interface SignupStarted {
  requiresVerification: true;
  email: string;
  slug: string;
  /** When the code stops working. */
  expiresAt: string;
  /** Not before this instant will another code be sent. */
  resendAvailableAt: string;
  message: string;
}

/** A system admin's own sign-up skips the code and gets the finished workspace straight back. */
export type SignupStartResult = SignupStarted | SignupResult;

export interface SlugCheck {
  available: boolean;
  slug: string;
  reason: string | null;
}

/** Self-service sign-up: creates a trial workspace with the person as its owner (TenantAdmin). */
@Injectable({ providedIn: 'root' })
export class SignupService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly silent = () => ({ context: new HttpContext().set(SILENT_ERRORS, true) });

  checkSlug(slug: string) {
    return this.http.get<ApiResult<SlugCheck>>(
      `${this.apiBaseUrl}/api/register/check-slug/${encodeURIComponent(slug)}`, this.silent());
  }

  register(body: SignupRequest) {
    return this.http.post<ApiResult<SignupStartResult>>(`${this.apiBaseUrl}/api/register`, body, this.silent());
  }

  /** The code from the email: this is the call that actually creates the workspace. */
  verify(email: string, code: string) {
    return this.http.post<ApiResult<SignupResult>>(
      `${this.apiBaseUrl}/api/register/verify`, { email, code }, this.silent());
  }

  resendCode(email: string) {
    return this.http.post<ApiResult<SignupStarted>>(
      `${this.apiBaseUrl}/api/register/resend-code`, { email }, this.silent());
  }
}

/** "Ọ̀yọ́ Foods & Co." → "oyo-foods-and-co": a starting suggestion for the workspace address. */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/g, '');
}

export const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;
