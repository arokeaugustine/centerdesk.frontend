import { Injectable, computed, inject } from '@angular/core';
import { TenantPermission } from './auth.models';
import { AuthService } from './auth.service';

const PACK_TAG = 'H4-';

function decodeJwtPayload(token: string): Record<string, unknown> {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return {};
  }
}

function unpackPermissions(packed: string): Set<TenantPermission> {
  const set = new Set<TenantPermission>();
  if (!packed?.startsWith(PACK_TAG)) return set;

  const hex = packed.slice(PACK_TAG.length);
  const validValues = new Set(Object.values(TenantPermission) as number[]);

  for (let i = 0; i + 4 <= hex.length; i += 4) {
    const value = parseInt(hex.slice(i, i + 4), 16);
    if (validValues.has(value)) set.add(value as TenantPermission);
  }
  return set;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  private readonly permissions = computed<Set<TenantPermission>>(() => {
    const token = this.auth.token();
    if (!token) return new Set();
    const payload = decodeJwtPayload(token);
    const packed = payload['Permissions'] as string | undefined;
    return packed ? unpackPermissions(packed) : new Set();
  });

  has(permission: TenantPermission): boolean {
    return this.permissions().has(permission);
  }

  getAll(): Set<TenantPermission> {
    return this.permissions();
  }
}
