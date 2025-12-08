import { Component } from '@angular/core';
import { TenantService } from './service/tenant.service';

@Component({
  selector: 'app-tenants',
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss'
})
export class TenantsComponent {
tenants: any = []
selectedTenant: any = null
openDetailsModal: boolean = false
 tenants$ = this.tenantService.tenants$;
loading$ = this.tenantService.loading$;

constructor(private tenantService: TenantService){}

ngOnInit(){

}

formatDate(parts: any): Date | null {
  if (!parts) return null;
  if (Array.isArray(parts)) return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  if (typeof parts === 'string' || parts instanceof Date) {
    const d = new Date(parts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

openDetails(order: any){
  this.selectedTenant = order;
  this.openDetailsModal = true
}

}
