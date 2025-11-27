import { Component } from '@angular/core';
import { MessageService } from 'primeng/api';

import { HttpErrorResponse } from '@angular/common/http';
import { supplierData } from '../../../../../../../../POS/src/app/ui/models/interface';
import { MetadataService } from '../../../../../../../../POS/src/app/ui/service/metadata.service';
import { PosServiceService } from '../../../../../../../../POS/src/app/ui/service/pos-service.service';

@Component({
  selector: 'app-supplier',
  templateUrl: './supplier.component.html',
  styleUrl: './supplier.component.scss'
})
export class SupplierComponent {
  supplierData: supplierData = {
    name: '',
    contactPerson: '',
    email: '',
    phoneNumber: 0,
    address: '',
  }

  suppliers: supplierData[] = [];

constructor(private posService: PosServiceService, private messageService: MessageService, private metadataService: MetadataService){
  this.metadataService.supplier$.subscribe(data => (this.suppliers = data));

}

ngOnInit(): void {
  this.loadSuppliers();
}
  removeSupplier(id: number | undefined) {
    this.posService.deleteSupplier(id).subscribe(async (data) => {
      if (data) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Failed to delete supplier.',
          key: 'tl',
          life: 3000,
        });
      } else {
        // this.suppliers = this.suppliers.filter(supplier => supplier.id !== id);
        this.metadataService.removeSupplierFromState(id);
        this.messageService.add({
          severity: 'success',
          summary: 'Supplier deleted',
          detail: 'Supplier deleted successfully.',
          key: 'tl',
          life: 3000,
        });

      }
    });
  }

   addSupplier() {
  
  
      this.posService.addSupplier(this.supplierData).subscribe(
        async (data) => {
          console.log(data);
          if (data) {
            this.messageService.add({
              severity: 'success',
              summary: 'Supplier Added',
              detail: 'Supplier added successfully.',
              key: 'tl',
              life: 3000,
            });
           this.metadataService.addSupplierToState(data)
            this.supplierData = {
              name: '',
              contactPerson: '',
              email: '',
              phoneNumber: 0,
              address: '',
            };
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Failed',
              detail: 'Failed, please try again.',
              key: 'tl',
              life: 3000,
            });
          }
        },
        (error: HttpErrorResponse) => {
          if (error.status === 500) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Failed',
              detail: 'Check form details and try again.',
              key: 'tl',
              life: 3000,
            });
          } else if (error.status === 404) {
            this.messageService.add({
              severity: 'error',
              summary: 'Authentication Failed',
              detail: 'Error, try again.',
              key: 'tl',
              life: 3000,
            });
          } else if (error.status === 0) {
            this.messageService.add({
              severity: 'error',
              summary: 'Server Unreachable',
              detail:
                'Unable to connect to the server. Please check your internet connection.',
              key: 'tl',
              life: 3000,
            });
          } else {
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'An unexpected error occurred.',
              key: 'tl',
              life: 3000,
            });
          }
        }
      );
    } 
    loadSuppliers() {
      this.posService.getSupplier().subscribe(
        (data) => {
          console.log('Suppliers Data:', data);  // Check if the data is coming through correctly
          this.suppliers = data;
        },
        (error) => {
          console.error('Error loading suppliers:', error);
        }
      );
    }
}
