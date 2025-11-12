import { Component } from '@angular/core';
import { PosServiceService } from '../../../../service/pos-service.service';
import { MetadataService } from '../../../../service/metadata.service';
import { TaxDTO } from '../../../../models/interface';
import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-tax',
  templateUrl: './tax.component.html',
  styleUrl: './tax.component.scss'
})
export class TaxComponent {
  taxes: TaxDTO[] =[]
  taxData: TaxDTO = {
    name: '',
    rate: 0
  }
constructor(private posService: PosServiceService, private metadataService: MetadataService, private messageService: MessageService){

}

ngOnInit(){
  this.metadataService.taxes$.subscribe(data => (this.taxes = data));

}

 removeTax(id: number|undefined) {
    this.posService.deleteTax(id).subscribe(async (data) => {
      if (data) {
        this.messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Failed to delete supplier.',
          key: 'tl',
          life: 3000,
        });
      } else {
        this.taxes = this.taxes.filter(tax => tax.id !== id);
        this.messageService.add({
          severity: 'success',
          summary: 'Tax deleted',
          detail: 'Tax deleted successfully.',
          key: 'tl',
          life: 3000,
        });

        this.metadataService.removeTaxFromState(id);
      }
    });
  }

 addTax() {


    this.posService.addTax(this.taxData).subscribe(
      async (data) => {
        console.log(data);
        if (data) {
          this.messageService.add({
            severity: 'success',
            summary: 'Tax Added',
            detail: 'Tax added successfully.',
            key: 'tl',
            life: 3000,
          });
          // this.getDiscounts();
          // TODO: Check whether this piece of code is worth it...
          this.taxes.push(data)
          this.taxData = {
            name: '',
            rate: 0,
            
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


}
