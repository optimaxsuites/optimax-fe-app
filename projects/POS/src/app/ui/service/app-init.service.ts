import { Injectable } from '@angular/core';
import { MetadataService } from './metadata.service';
import { firstValueFrom } from 'rxjs';
import { TenantService } from '../../../../../../src/app/ui/tenants/service/tenant.service';
import { Location } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {

  constructor(private metadataService: MetadataService, private tenantService: TenantService,     private location: Location) {}
  async init(): Promise<any>  {
    console.log('AppInitService: initializing...');
    const excludedRoutes = ['/optmerce']
    const currentPath = this.location.path() || window.location.pathname;
    console.log(currentPath)

    if (currentPath.startsWith('/optimerce')) {
      console.log('Skipping init for /optimerce route', currentPath);
      return Promise.resolve();
    }
    try {
      const meta = await this.metadataService.fetchMetaData();
      const tenants =  this.tenantService.loadFullTenants();
      return { meta, tenants };
    } catch {
      return await Promise.resolve();
    };
  }

  
  
}
