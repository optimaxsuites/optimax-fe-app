import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { TenantService } from './tenant.service';

@Injectable({
  providedIn: 'root'
})
export class TenantInit {

  constructor(private tenantService: TenantService) {}
  async init(): Promise<any>  {
    console.log('AppInitService: initializing...');
    try {
      return await this.tenantService.loadFullTenants();
    } catch {
      return await Promise.resolve();
    };
  }
 
}