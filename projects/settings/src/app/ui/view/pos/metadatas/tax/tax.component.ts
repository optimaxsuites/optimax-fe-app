import { Component, Output, EventEmitter } from '@angular/core';

import { MessageService } from 'primeng/api';
import { HttpErrorResponse } from '@angular/common/http';
import { TaxDTO } from '../../../../../../../../POS/src/app/ui/models/interface';
import { MetadataService } from '../../../../../../../../POS/src/app/ui/service/metadata.service';
import { PosServiceService } from '../../../../../../../../POS/src/app/ui/service/pos-service.service';

@Component({
  selector: 'app-tax',
  templateUrl: './tax.component.html',
  styleUrl: './tax.component.scss'
})
export class TaxComponent {
  @Output() close = new EventEmitter<void>();
  
  taxes: TaxDTO[] = [];
  
  taxData: any = {
    name: '',
    rate: 0,
    description: ''
  };
  
  editingTax: TaxDTO | null = null;
  savingTax = false;
  
  // Delete confirmation modal state
  showDeleteModal = false;
  taxToDelete: TaxDTO | null = null;
  deletingTax = false;

  constructor(
    private posService: PosServiceService, 
    private metadataService: MetadataService, 
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.metadataService.taxes$.subscribe(data => (this.taxes = data));
  }

  closeModal() {
    this.close.emit();
  }

  cancelEdit() {
    this.editingTax = null;
    this.taxData = { name: '', rate: 0, description: '' };
  }

  editTax(tax: TaxDTO) {
    this.editingTax = tax;
    this.taxData = {
      name: tax.name,
      rate: tax.rate,
      description: (tax as any).description || ''
    };
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
          this.metadataService.addTaxToState(data)
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


  updateTax() {
    if (!this.taxData.name || this.taxData.rate === null || this.taxData.rate === undefined) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Tax name and rate are required.',
        key: 'tl',
        life: 3000,
      });
      return;
    }

    this.savingTax = true;
    
    const taxPayload: any = {
      id: this.editingTax!.id,
      name: this.taxData.name,
      rate: this.taxData.rate
    };
    
    console.log(taxPayload)
    if (this.taxData.description && this.taxData.description.trim() !== '') {
      taxPayload.description = this.taxData.description;
    }

    this.posService.addTax(taxPayload).subscribe({
      next: (data) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Tax Updated',
          detail: 'Tax updated successfully.',
          key: 'tl',
          life: 3000,
        });
        // this.refreshTaxes();
        this.editingTax!.description = taxPayload.description
        this.editingTax!.name = taxPayload.name
        this.editingTax!.rate = taxPayload.rate

        this.cancelEdit();
        this.savingTax = false;
      },
      error: (error: HttpErrorResponse) => {
        this.savingTax = false;
        this.handleError(error, 'tax');
      }
    });
  }

  // Open delete confirmation modal
  confirmDeleteTax(tax: TaxDTO) {
    this.taxToDelete = tax;
    this.showDeleteModal = true;
  }

  // Close delete confirmation modal
  cancelDelete() {
    this.showDeleteModal = false;
    this.taxToDelete = null;
  }

  // Execute delete
  deleteTax() {
    if (!this.taxToDelete?.id) return;
    
    this.deletingTax = true;
    
    this.posService.deleteTax(this.taxToDelete.id).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Tax Deleted',
          detail: 'Tax deleted successfully.',
          key: 'tl',
          life: 3000,
        });
        // this.refreshTaxes();
        this.showDeleteModal = false;
        this.taxToDelete = null;
        this.deletingTax = false;
      },
      error: (error: HttpErrorResponse) => {
        this.deletingTax = false;
        
        if (error.status === 409 || error.error?.message?.includes('in use')) {
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot Delete',
            detail: 'This tax is currently in use by products and cannot be deleted.',
            key: 'tl',
            life: 5000,
          });
        } else if (error.status === 400) {
          this.messageService.add({
            severity: 'error',
            summary: 'Cannot Delete',
            detail: error.error?.message || 'This tax cannot be deleted as it is being used.',
            key: 'tl',
            life: 5000,
          });
        } else {
          this.handleError(error, 'tax');
        }
        
        this.showDeleteModal = false;
        this.taxToDelete = null;
      }
    });
  }

  private refreshTaxes() {
    this.posService.getTax().subscribe(taxes => {
      this.taxes = taxes;
    });
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
}