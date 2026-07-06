import { Injectable, computed, inject } from '@angular/core';
import { AdminPermission } from './auth.models';
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

function unpackPermissions(packed: string): Set<AdminPermission> {
  const set = new Set<AdminPermission>();
  if (!packed?.startsWith(PACK_TAG)) return set;

  const hex = packed.slice(PACK_TAG.length);
  const validValues = new Set(Object.values(AdminPermission) as number[]);

  for (let i = 0; i + 4 <= hex.length; i += 4) {
    const value = parseInt(hex.slice(i, i + 4), 16);
    if (validValues.has(value)) set.add(value as AdminPermission);
  }
  return set;
}

@Injectable({ providedIn: 'root' })
export class PermissionService {
  private readonly auth = inject(AuthService);

  private readonly permissions = computed<Set<AdminPermission>>(() => {
    const token = this.auth.token();
    if (!token) return new Set();
    const payload = decodeJwtPayload(token);
    const packed = payload['AdminPermissions'] as string | undefined;
    return packed ? unpackPermissions(packed) : new Set();
  });

  has(permission: AdminPermission): boolean {
    return this.permissions().has(permission);
  }

  getAll(): Set<AdminPermission> {
    return this.permissions();
  }
}

export { decodeJwtPayload };
