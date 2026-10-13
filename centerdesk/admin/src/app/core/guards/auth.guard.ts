import { CanActivateFn } from '@angular/router';
import { adminGuard } from './account.guards';

/** @deprecated The admin console's guard is {@link adminGuard}; kept for older imports. */
export const authGuard: CanActivateFn = adminGuard;
