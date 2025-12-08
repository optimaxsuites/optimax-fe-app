import { Component } from '@angular/core';
import { TenantService } from './service/tenant.service';
import { ConfirmationService, MessageService } from 'primeng/api';

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

constructor(private tenantService: TenantService, private confirmationService: ConfirmationService, private messageService: MessageService){}

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



  confirmDelete(tenant: any, event: Event) {
    event.stopPropagation()

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${tenant.businessName} from the database`,
      header: `Delete tenant - ${tenant.businessName}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancel p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteTenant(tenant);
      },
      reject: () => {

      }
    });
  }

  deleteTenant(tenant: any){
     this.tenantService.deleteTenant(tenant.domain).subscribe({
      next: () => {
                this.tenantService.removeTenantFromState(tenant.id)
                this.messageService.add({ severity: 'success', summary: 'Successful', detail: 'Tenant Deleted', life: 3000, key:"tf" });
      }
     })
  }
}
