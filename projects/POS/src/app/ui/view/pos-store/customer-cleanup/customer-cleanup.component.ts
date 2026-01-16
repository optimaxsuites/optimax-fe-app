
import { Component, OnInit } from '@angular/core';
import { MessageService, ConfirmationService } from 'primeng/api';
import { StoreCustomerService } from '../../../service/store-customer.service';

@Component({
  selector: 'app-customer-cleanup',
  templateUrl: './customer-cleanup.component.html',
  styleUrls: ['./customer-cleanup.component.scss'],
  providers: [MessageService, ConfirmationService]
})
export class CustomerCleanupComponent implements OnInit {
  customers: any[] = [];
  loading: boolean = false;
  deleting: boolean = false;
  
  // Stats
  totalCustomers: number = 0;

  constructor(
    private storeCustomerService: StoreCustomerService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService
  ) {}

  ngOnInit(): void {
    this.loadCustomers();
  }

  loadCustomers(): void {
    this.loading = true;
    this.storeCustomerService.getCustomers().subscribe({
      next: (data: any) => {
        this.customers = data || [];
        this.totalCustomers = this.customers.length;
        this.loading = false;
        console.log('👥 Loaded customers:', this.totalCustomers);
      },
      error: (err: any) => {
        console.error('❌ Failed to load customers:', err);
        this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to load customers'});
        this.loading = false;
      }
    });
  }

  confirmDeleteAll(): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ALL ${this.totalCustomers} customers? This action cannot be undone.`,
      header: 'Hazardous Action Confirmation',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.deleteAllCustomers();
      }
    });
  }

  async deleteAllCustomers(): Promise<void> {
    if (this.customers.length === 0) return;

    this.deleting = true;
    let deletedCount = 0;
    let errorCount = 0;

    // Create a copy to iterate while modifying the original list for UI updates
    const targets = [...this.customers];

    this.messageService.add({severity: 'info', summary: 'Processing', detail: 'Starting mass deletion...'});

    for (const customer of targets) {
      if (!customer.id) continue;

      try {
        await this.deleteCustomerPromise(customer.id);
        deletedCount++;
        // Remove from local list to show progress
        this.customers = this.customers.filter(c => c.id !== customer.id);
      } catch (err) {
        console.error(`❌ Failed to delete customer ${customer.id}:`, err);
        errorCount++;
      }
    }

    this.deleting = false;
    this.totalCustomers = this.customers.length;
    
    if (errorCount > 0) {
        this.messageService.add({severity: 'warn', summary: 'Completed with Errors', detail: `Deleted ${deletedCount}, Failed ${errorCount}`});
    } else {
        this.messageService.add({severity: 'success', summary: 'Success', detail: `Successfully deleted all ${deletedCount} customers`});
    }
  }

  // Wrapper for observable-based delete to promise
  private deleteCustomerPromise(id: number): Promise<any> {
    return new Promise((resolve, reject) => {
      this.storeCustomerService.deleteCustomer(id).subscribe({
        next: (res: any) => resolve(res),
        error: (err: any) => reject(err)
      });
    });
  }

  deleteSingleCustomer(customer: any): void {
    this.confirmationService.confirm({
        message: `Delete customer "${customer.name}"?`,
        header: 'Confirm Deletion',
        icon: 'pi pi-info-circle',
        accept: () => {
             this.deleteCustomerPromise(customer.id).then(() => {
                 this.messageService.add({severity: 'success', summary: 'Deleted', detail: `Customer ${customer.name} deleted`});
                 this.customers = this.customers.filter(c => c.id !== customer.id);
                 this.totalCustomers = this.customers.length;
             }).catch(err => {
                this.messageService.add({severity: 'error', summary: 'Error', detail: 'Failed to delete customer'});
             });
        }
      });
  }
}
