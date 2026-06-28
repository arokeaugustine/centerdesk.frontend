import { Component, inject } from '@angular/core';
import { TenantService } from '../../core/tenant/tenant.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
})
export class NotFound {
  protected readonly slug = inject(TenantService).tenantSlug;
}
