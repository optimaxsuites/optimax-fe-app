import { Injectable } from '@angular/core';
import { MetadataService } from './metadata.service';
import { firstValueFrom } from 'rxjs';
import { TenantService } from '../../../../../../src/app/ui/tenants/service/tenant.service';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {

  constructor(private metadataService: MetadataService, private tenantService: TenantService) {}
  async init(): Promise<any>  {
    console.log('AppInitService: initializing...');
    try {
      const meta = await this.metadataService.fetchMetaData();
      const tenants =  this.tenantService.loadFullTenants();
      return { meta, tenants };
    } catch {
      return await Promise.resolve();
    };
  }

  
  
}
