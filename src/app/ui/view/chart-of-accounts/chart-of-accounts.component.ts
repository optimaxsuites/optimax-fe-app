import { Component } from '@angular/core';

@Component({
  selector: 'app-chart-of-accounts',
  templateUrl: './chart-of-accounts.component.html',
  styleUrl: './chart-of-accounts.component.scss'
})
export class ChartOfAccountsComponent {
  accounts = [
    // Assets
    { code: '1000', name: 'Current Assets', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '1100', name: 'Cash and Cash Equivalents', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '1110', name: 'Petty Cash', type: 'Current Asset', details: 'Physical cash on hand', balance: 0, bankBalance: 0 },
    { code: '1120', name: 'Main Operating Account', type: 'Bank', details: 'Primary business bank account', balance: 0, bankBalance: 0 },
    { code: '1130', name: 'Payroll Account', type: 'Bank', details: 'Dedicated payroll bank account', balance: 0, bankBalance: 0 },
    
    { code: '1200', name: 'Accounts Receivable', type: 'Current Asset', details: 'Customer outstanding payments', balance: 0, bankBalance: 0 },
    { code: '1210', name: 'POS Receivables', type: 'Current Asset', details: 'Point of sale transactions', balance: 0, bankBalance: 0 },
    { code: '1220', name: 'Room Receivables', type: 'Current Asset', details: 'Outstanding room charges', balance: 0, bankBalance: 0 },
    { code: '1230', name: 'Service Receivables', type: 'Current Asset', details: 'Outstanding service charges', balance: 0, bankBalance: 0 },
    
    { code: '1300', name: 'Inventory', type: 'Current Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '1310', name: 'Product Inventory', type: 'Current Asset', details: 'Retail products for sale', balance: 0, bankBalance: 0 },
    { code: '1320', name: 'Ingredient Inventory', type: 'Current Asset', details: 'Raw materials/ingredients', balance: 0, bankBalance: 0 },
    { code: '1330', name: 'Housekeeping Inventory', type: 'Current Asset', details: 'Cleaning supplies etc.', balance: 0, bankBalance: 0 },
    
    { code: '1400', name: 'Prepaid Expenses', type: 'Current Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '1500', name: 'Employee Advances', type: 'Current Asset', details: 'Staff cash advances', balance: 0, bankBalance: 0 },
    
    { code: '2000', name: 'Fixed Assets', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '2100', name: 'Property and Equipment', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2110', name: 'Land', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2120', name: 'Buildings', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2130', name: 'Leasehold Improvements', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2140', name: 'Furniture and Fixtures', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2150', name: 'POS Equipment', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2160', name: 'Computer Equipment', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    { code: '2170', name: 'Vehicles', type: 'Fixed Asset', details: '', balance: 0, bankBalance: 0 },
    
    { code: '2200', name: 'Accumulated Depreciation', type: 'Contra Asset', details: '', balance: 0, bankBalance: 0 },
    
    // Liabilities
    { code: '3000', name: 'Current Liabilities', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '3100', name: 'Accounts Payable', type: 'Current Liability', details: 'Vendor outstanding payments', balance: 0, bankBalance: 0 },
    { code: '3200', name: 'Payroll Liabilities', type: 'Current Liability', details: '', balance: 0, bankBalance: 0 },
    { code: '3210', name: 'Salary Payable', type: 'Current Liability', details: '', balance: 0, bankBalance: 0 },
    { code: '3220', name: 'PAYE Tax Payable', type: 'Current Liability', details: '', balance: 0, bankBalance: 0 },
    { code: '3230', name: 'Pension Payable', type: 'Current Liability', details: '', balance: 0, bankBalance: 0 },
    { code: '3240', name: 'Other Deductions Payable', type: 'Current Liability', details: '', balance: 0, bankBalance: 0 },
    
    { code: '3300', name: 'Sales Tax Payable', type: 'Current Liability', details: 'VAT/GST collected', balance: 0, bankBalance: 0 },
    { code: '3400', name: 'Short-term Loans', type: 'Current Liability', details: '', balance: 0, bankBalance: 0 },
    { code: '3500', name: 'Customer Deposits', type: 'Current Liability', details: 'Advance room bookings', balance: 0, bankBalance: 0 },
    
    { code: '4000', name: 'Long-term Liabilities', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '4100', name: 'Long-term Loans', type: 'Long-term Liability', details: '', balance: 0, bankBalance: 0 },
    
    // Equity
    { code: '5000', name: 'Owner\'s Equity', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '5100', name: 'Owner\'s Capital', type: 'Equity', details: '', balance: 0, bankBalance: 0 },
    { code: '5200', name: 'Owner\'s Drawings', type: 'Equity', details: '', balance: 0, bankBalance: 0 },
    { code: '5300', name: 'Retained Earnings', type: 'Equity', details: '', balance: 0, bankBalance: 0 },
    
    // Revenue
    { code: '6000', name: 'Revenue', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '6100', name: 'POS Sales', type: 'Revenue', details: 'Product sales revenue', balance: 0, bankBalance: 0 },
    { code: '6110', name: 'Product Sales', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    { code: '6120', name: 'Service Sales', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    
    { code: '6200', name: 'Room Revenue', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    { code: '6210', name: 'Standard Room Revenue', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    { code: '6220', name: 'Shortlet Revenue', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    { code: '6230', name: 'Suite Revenue', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    
    { code: '6300', name: 'Other Revenue', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    { code: '6310', name: 'Late Checkout Fees', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    { code: '6320', name: 'Cancellation Fees', type: 'Revenue', details: '', balance: 0, bankBalance: 0 },
    
    // Expenses
    { code: '7000', name: 'Operating Expenses', type: 'Header', details: '', balance: 0, bankBalance: 0 },
    { code: '7100', name: 'Cost of Goods Sold', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7110', name: 'Product COGS', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7120', name: 'Ingredient COGS', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    
    { code: '7200', name: 'Payroll Expenses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7210', name: 'Salaries and Wages', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7220', name: 'Overtime', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7230', name: 'Bonuses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7240', name: 'Employee Benefits', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7250', name: 'Payroll Taxes', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7260', name: 'Recruitment Expenses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7270', name: 'Training Expenses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    
    { code: '7300', name: 'Occupancy Expenses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7310', name: 'Rent', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7320', name: 'Utilities', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7330', name: 'Maintenance and Repairs', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7340', name: 'Housekeeping Supplies', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7350', name: 'Laundry', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    
    { code: '7400', name: 'Administrative Expenses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7410', name: 'Office Supplies', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7420', name: 'Software Subscriptions', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7430', name: 'Bank Charges', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7440', name: 'Professional Fees', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7450', name: 'Insurance', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7460', name: 'Licenses and Permits', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    
    { code: '7500', name: 'Marketing Expenses', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7600', name: 'Travel and Entertainment', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7700', name: 'Depreciation Expense', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7800', name: 'Interest Expense', type: 'Expense', details: '', balance: 0, bankBalance: 0 },
    { code: '7900', name: 'Refunds and Returns', type: 'Expense', details: '', balance: 0, bankBalance: 0 }
  ]; // Your accounts data
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
