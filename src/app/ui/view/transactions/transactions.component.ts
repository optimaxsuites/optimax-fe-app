import { Component, Type } from '@angular/core';
import { SalesOrderComponent } from '../sales-order/sales-order.component';
import { QuotationComponent } from '../quotation/quotation.component';
import { BookKeepingComponent } from '../book-keeping/book-keeping.component';

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
  id: number;
  date: Date;
  description: string;
  spent: number;
  received: number;
  assignedTo: string;
}

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrl: './transactions.component.scss'
})
export class TransactionsComponent {
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
      date: new Date(),
      description: 'Office supplies',
      spent: 2000,
      received: 0,
      assignedTo: 'Stationary Expenses'
    },
    {
      id: 2,
      date: new Date('2023-05-15'),
      description: 'Client payment',
      spent: 0,
      received: 50000,
      assignedTo: 'Accounts Receivable'
    },
    {
      id: 3,
      date: new Date('2023-05-10'),
      description: 'Employee salary',
      spent: 150000,
      received: 0,
      assignedTo: 'Salaries'
    }
  ];

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
