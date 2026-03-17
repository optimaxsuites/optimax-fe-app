import { Component } from '@angular/core';
import { PosServiceService } from '../../../../../../../../POS/src/app/ui/service/pos-service.service';
import { HttpErrorResponse } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { MetadataService } from '../../../../../../../../POS/src/app/ui/service/metadata.service';

@Component({
  selector: 'app-discount',
  templateUrl: './discount.component.html',
  styleUrl: './discount.component.scss'
})
export class DiscountComponent {
  // discount: [null],
  // discountMinQuantity: [0],
  // discountName: [''],
	openAddDiscount: boolean = false;

discountTypes: any[] = [
  { id: 1, name: 'Periodic' },
  { id: 2, name: 'Quantity Based' }
];
  discount: {
  id: number;
  name: string;
  value: number;
  startDate: Date;
  endDate: Date;
  minQuantity: number;
  discountType: number[];  // ✅ Changed to array of IDs
} = {
  id: 0,
  name: '',
  value: 0,
  startDate: new Date(),
  endDate: new Date(),
  minQuantity: 0,
  discountType: [],  // ✅ Initialize as empty array
};
discounts: any[] = [];
savingDiscount: boolean = false
editingDiscount: any = {}

constructor(private posService: PosServiceService, private messageService: MessageService, private metadataService: MetadataService){
}

ngOnInit() {
  this.metadataService.discount$.subscribe((data: any[]) => (this.discounts = data));
}

  addDiscount() {
    let discountObj = this.discount;

    const discountDetails = {
      id: discountObj.id,
      name: discountObj.name,
      value: discountObj.value,
      // discountType: discountObj.discountType,
      startDate: new Date(discountObj.startDate).toISOString(),
      endDate: new Date(discountObj.endDate).toISOString(),
      minQuantity: discountObj.minQuantity,
    };

    this.posService.addDiscount(discountDetails).subscribe(
      async (data) => {
        console.log(data);
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Discount Added',
            detail: 'Discount added successfully.',
            key: 'tl',
            life: 3000,
          });
          // this.getDiscounts();
          // TODO: Check whether this piece of code is worth it...
          discountObj = {
            id: 0,
            name: '',
            value: 0,
            startDate: new Date(),
            endDate: new Date(),
            minQuantity: 0,
            discountType:[],
          };

          this.metadataService.addDiscountToState(data)

          discountObj = {
            id: 0,
            name: '',
            value: 0,
            startDate: new Date(),
            endDate: new Date(),
            minQuantity: 0,
            discountType:[],
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

  removeDiscount(id: number) {
    this.posService.deleteDiscount(id).subscribe(async (data) => {
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Discount Removed',
            detail: 'Discount removed successfully.',
            key: 'tl',
            life: 3000,
          });
          // this.getDiscounts();
          this.metadataService.removeDiscountFromState(id);
          this.discount = {
            id: 0,
            name: '',
            value: 0,
            startDate: new Date(),
            endDate: new Date(),
            minQuantity: 0,
            discountType: [],
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
    );
  }

  updateDiscount() {
    if (!this.discount.name || this.discount.value === null) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Discount name and value are required.',
        key: 'tl',
        life: 3000,
      });
      return;
    }
  
    this.savingDiscount = true;
    const supplierPayload = {
      id: this.editingDiscount.id,
      name: this.discount.name,
      value: this.discount.value,
      startDate: new Date(this.discount.startDate).toISOString(),
      endDate: new Date(this.discount.endDate).toISOString(),
      minQuantity: this.discount.minQuantity,

    };
  
    this.posService.addDiscount(supplierPayload).subscribe(
      (data) => {
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Supplier Updated',
            detail: 'Supplier updated successfully.',
            key: 'tl',
            life: 3000,
          });
          
          // this.refreshTaxes();
          // this.cancelEditTax();
          this.editingDiscount.name = supplierPayload.name
          this.editingDiscount.value = supplierPayload.value
          this.editingDiscount.startDate = supplierPayload.startDate
          this.editingDiscount.endDate = supplierPayload.endDate
          this.editingDiscount.minQuantity = supplierPayload.minQuantity
  
          this.editingDiscount = {}
          this.savingDiscount = false
        } else {
          this.messageService.add({
            severity: 'error',
            summary: 'Failed',
            detail: 'Failed to update supplier. Please try again.',
            key: 'tl',
            life: 3000,
          });
        }
        this.savingDiscount = false;
      },
      (error: HttpErrorResponse) => {
        this.savingDiscount = false;
        this.handleError(error, 'supplier');
      }
    );
  }
  
   editDiscount(discount: any) {
        this.editingDiscount = discount;
        this.discount = discount
      }
  
  
   private handleError(error: HttpErrorResponse, type: string) {
      if (error.status === 500) {
        this.messageService.add({
          severity: 'error',
          summary: 'Server Error',
          detail: `Failed to process ${type}. Please check the details and try again.`,
          key: 'tl',
          life: 3000,
        });
      } else if (error.status === 404) {
        this.messageService.add({
          severity: 'error',
          summary: 'Not Found',
          detail: `Failed to process ${type}. The service is unavailable.`,
          key: 'tl',
          life: 3000,
        });
      } else if (error.status === 0) {
        this.messageService.add({
          severity: 'error',
          summary: 'Connection Error',
          detail: 'Unable to connect to the server. Please check your internet connection.',
          key: 'tl',
          life: 3000,
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error?.message || `An unexpected error occurred while processing ${type}.`,
          key: 'tl',
          life: 3000,
        });
      }
    }


  cancelEdit() {
    this.editingDiscount = {};
    this.discount =  {
  id: 0,
  name: '',
  value: 0,
  startDate: new Date(),
  endDate: new Date(),
  minQuantity: 0,
  discountType: [],  
};
  }
}


