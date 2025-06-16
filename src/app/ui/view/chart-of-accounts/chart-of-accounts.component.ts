import { Component } from '@angular/core';

@Component({
  selector: 'app-chart-of-accounts',
  templateUrl: './chart-of-accounts.component.html',
  styleUrl: './chart-of-accounts.component.scss'
})
export class ChartOfAccountsComponent {
 accounts = [
  // 🧾 Assets
  { code: '1010', name: 'Cash', type: 'Asset', details: 'Physical cash on hand', balance: 10000, bankBalance: 0 },
  { code: '1020', name: 'Bank Accounts', type: 'Asset', details: '', balance: 0, bankBalance: 84750 },
  { code: '1030', name: 'Accounts Receivable', type: 'Asset', details: '', balance: 0, bankBalance: 0 },
  { code: '1040', name: 'POS Inventory (Products)', type: 'Asset', details: '', balance: 0, bankBalance: 0 },
  { code: '1050', name: 'Kitchen Inventory (Ingredients)', type: 'Asset', details: 'Ingredients in stock for cooking (raw materials).', balance: 0, bankBalance: 0 },
  { code: '1060', name: 'Hospitality Supplies Inventory', type: 'Asset', details: 'Items related to room operations (toiletries, bedsheets, etc.).', balance: 0, bankBalance: 0 },
  { code: '1070', name: 'Employee Advances', type: 'Asset', details: '', balance: 0, bankBalance: 0 },

  // 💸 Liabilities
  { code: '2010', name: 'Accounts Payable', type: 'Liability', details: '', balance: 0, bankBalance: 0 },
  { code: '2020', name: 'Salaries Payable', type: 'Liability', details: "Salaries you've incurred but haven't paid yet.", balance: 0, bankBalance: 0 },
  { code: '2030', name: 'Tax Payables', type: 'Liability', details: '', balance: 0, bankBalance: 0 },
  { code: '2040', name: 'Customer Refund Payables', type: 'Liability', details: '', balance: 0, bankBalance: 0 },
  { code: '2050', name: 'Room Booking Deposits', type: 'Liability', details: '', balance: 0, bankBalance: 0 },

  // 📈 Income
  { code: '3010', name: 'POS Sales', type: 'Income', details: '', balance: 0, bankBalance: 0 },
  { code: '3020', name: 'Kitchen Sales', type: 'Income', details: '', balance: 0, bankBalance: 0 },
  { code: '3030', name: 'Room Revenue', type: 'Income', details: '', balance: 0, bankBalance: 0 },
  { code: '3040', name: 'Refund Reversals', type: 'Income', details: '', balance: 0, bankBalance: 0 },
  { code: '3050', name: 'Miscellaneous Income', type: 'Income', details: '', balance: 0, bankBalance: 0 },

  // 💵 Expenses - Direct
  { code: '4010', name: 'Cost of Goods Sold (POS)', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4020', name: 'Kitchen Ingredients', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4030', name: 'Room Operations Expenses', type: 'Expense', details: 'Costs for maintaining rooms ', balance: 0, bankBalance: 0 },

  // 💵 Expenses - Payroll & HR
  { code: '4040', name: 'Salaries & Wages', type: 'Expense', details: 'Payments to staff.', balance: 0, bankBalance: 0 },
  { code: '4050', name: 'Employee Reimbursements', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4060', name: 'Employee Advances (Clearing)', type: 'Expense', details: '', balance: 0, bankBalance: 0 },

  // 💵 Expenses - General Admin
  { code: '4070', name: 'Utilities', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4080', name: 'Rent', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4090', name: 'Software & Tools', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4100', name: 'Marketing & Advertising', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
  { code: '4110', name: 'Maintenance & Repairs', type: 'Expense', details: '', balance: 0, bankBalance: 0 },

  // 📊 Equity
  { code: '5010', name: "Owner’s Capital", type: 'Equity', details: '', balance: 0, bankBalance: 0 },
  { code: '5020', name: 'Retained Earnings', type: 'Equity', details: 'Profits from previous years', balance: 0, bankBalance: 0 },
  { code: '5030', name: "Owner’s Drawings", type: 'Equity', details: '', balance: 0, bankBalance: 0 }
];

// Your accounts data
  selectedAccounts: any[] = [];
  filteredAccounts: any[] = [];
  paginatedAccounts: any[] = [];
  
  // Pagination variables
  rows = 10;
  first = 0;

  constructor() {
    // Initialize your accounts data here
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredAccounts = this.accounts.filter(account => 
      account.code.toLowerCase().includes(filterValue) ||
      account.name.toLowerCase().includes(filterValue) ||
      account.type.toLowerCase().includes(filterValue) ||
      (account.details && account.details.toLowerCase().includes(filterValue))
    );
    this.first = 0;
    this.updatePaginatedAccounts();
  }

  onPageChange(event: any) {
    this.first = event.first;
    this.rows = event.rows;
    this.updatePaginatedAccounts();
  }

  updatePaginatedAccounts() {
    const data = this.filteredAccounts.length ? this.filteredAccounts : this.accounts;
    this.paginatedAccounts = data.slice(this.first, this.first + this.rows);
  }

  // Initialize with your actual data
  ngOnInit() {
    // Load your accounts data
    this.filteredAccounts = [...this.accounts];
    this.updatePaginatedAccounts();
  }
}
