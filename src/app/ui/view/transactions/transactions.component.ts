import { Component, Type } from '@angular/core';
import { SalesOrderComponent } from '../sales-order/sales-order.component';
import { QuotationComponent } from '../quotation/quotation.component';
import { BookKeepingComponent } from '../book-keeping/book-keeping.component';
import { formatCurrency } from '@angular/common';

export interface TabConfig {
  name: string;
  component: any;
  hasDropdown?: boolean;
  dropdownOptions?: DropdownOption[]; 
  role?: string
}

export interface DropdownOption {
  label: string; 
  action: string; 
  component: Type<any>;
}

interface Transaction {
  date: string;
  description: string;
  spent: number | null;
  received: number | null;
  assignedTo: string;
  id: number;
};



@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {
searchTerm = '';
filteredTransactions: Transaction[] = []; // bind this to p-table

filterTransactions() {
  const term = this.searchTerm.toLowerCase();
  this.filteredTransactions = this.transactions.filter(t =>
    t.description?.toLowerCase().includes(term) ||
    t.assignedTo?.toLowerCase().includes(term) ||
    t.date?.toLowerCase().includes(term)
  );
}


  tabsConfig: TabConfig[] = [
    {
      name: 'Report',
      component: SalesOrderComponent,
    },
    { name: 'Products', component: QuotationComponent },
    { name: 'Inventory', component: BookKeepingComponent },

    // {
    //   name: 'Settings',
    //   component: null,
    //   hasDropdown: true,
    //   dropdownOptions: [
    //     { label: 'Configurations', action: 'configurations', component: ConfigurationComponent },
    //     { label: 'Users', action: 'users', component: ManageUsersComponent }
    //   ]
    // }
  ];
    transactions: Transaction[] = [
    {
      id: 1,
      date: '10/30/2024',
      description: 'Blending machine',
      spent: 4400,
      received: null,
      assignedTo: 'Kitchen'
    }
    // Add more transactions as needed
  ];

  selectedTransaction: Transaction | null = null;
  showReviewModal = false;

  openReviewModal(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.showReviewModal = true;
  }

  closeReviewModal() {
    this.showReviewModal = false;
    this.selectedTransaction = null;
  }

  get currencyFormatter() {
  return (amount: number | null): string => {
    if (!amount) return '';
    return `₦${amount.toLocaleString()}`;
  };
}
  // getSeverity(category: string): string {
  //   switch (category) {
  //     case 'Stationary Expenses':
  //       return 'warning';
  //     case 'Accounts Receivable':
  //       return 'success';
  //     case 'Salaries':
  //       return 'danger';
  //     default:
  //       return 'info';
  //   }
  // }
}
