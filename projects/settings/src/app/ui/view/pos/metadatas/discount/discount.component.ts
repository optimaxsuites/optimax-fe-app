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
      endDate: discountObj.endDate,
      startDate: discountObj.startDate,
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

}


