import { Component } from '@angular/core';
import { MenuItem } from 'primeng/api';

@Component({
  selector: 'app-reconcillation',
  templateUrl: './reconcillation.component.html',
  styleUrls: ['./reconcillation.component.scss']
})
export class ReconcillationComponent {
  fromDate: Date | null = null;
  toDate: Date | null = null;
  loading = false;
  selectedAccount: any;
  accounts = [
    { name: 'Main Business Account', id: '1' },
    { name: 'Savings Account', id: '2' },
    { name: 'Payroll Account', id: '3' }
  ];
  status = 'Unreconciled';
  items: MenuItem[];
  loadingItem = false;
  sidebarCollapsed = false;
  difference = '₦0.00';

  // Sample data
  bankTransactions = [
    { date: 'Jan 5', description: 'POS PAYMENT 1234', debit: 15000, credit: null, status: 'Unmatched' },
    { date: 'Jan 7', description: 'TRANSFER FROM CLIENT', debit: null, credit: 50000, status: 'Matched' },
    { date: 'Jan 10', description: 'BANK FEE', debit: 500, credit: null, status: 'Unmatched' }
  ];

  erpTransactions = [
    { date: 'Jan 5', reference: 'INV-1001', description: 'Office Supplies', debit: 15000, credit: null, account: 'Expenses' },
    { date: 'Jan 7', reference: 'CUST-45', description: 'Payment Received', debit: null, credit: 50000, account: 'Accounts Rec.' },
    { date: 'Jan 10', reference: 'BANK-FEE-001', description: 'Monthly Fee', debit: 500, credit: null, account: 'Bank Charges' }
  ];

  constructor() {
    this.items = [
      { 
        label: 'Auto-match', 
        icon: 'pi pi-link',
        command: () => this.autoMatchTransactions()
      },
      { 
        label: 'Fetch Transactions', 
        icon: 'pi pi-download',
        command: () => this.loadTransactions()
      },
      { separator: true },
      { 
        label: 'Finalize Reconciliation', 
        icon: 'pi pi-check-circle',
        command: () => this.finalizeReconciliation()
      },
      { separator: true },
      { 
        label: 'Save & Exit', 
        icon: 'pi pi-sign-out',
        command: () => this.saveAndExit()
      }
    ];
  }

  toggleSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  load() {
    this.loadingItem = true;
    setTimeout(() => {
      this.loadingItem = false;
    }, 2000);
  }

  loadTransactions() {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      this.status = 'Partially Reconciled';
    }, 2000);
  }

  autoMatchTransactions() {
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
      // Simulate matching
      this.bankTransactions.forEach(t => {
        if (t.status === 'Unmatched') {
          t.status = 'Matched';
        }
      });
    }, 1500);
  }

  matchTransaction(transaction: any) {
    transaction.status = 'Matched';
  }

  finalizeReconciliation() {
    this.status = 'Completed';
  }

  saveAndExit() {
    // Add save and exit logic here
  }

  getStatusSeverity(status: string): string | any {
    switch(status.toLowerCase()) {
      case 'completed': return 'success';
      case 'partially reconciled': return 'warning';
      case 'unreconciled': return 'danger';
      default: return 'info';
    }
  }
}