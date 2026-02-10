import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { AuthenticationService } from '../../sharedComponent/service/auth-service/authentication.service';
import { DeletedRecordsService } from '../../sharedComponent/service/deleted-records/deleted-records.service';

interface Account {
  code: string;
  name: string;
  type: string;
  details: string;
  balance: number;
  bankBalance: number;
  selected?: boolean;
}

@Component({
  selector: 'app-chart-of-accounts',
  templateUrl: './chart-of-accounts.component.html',
  styleUrl: './chart-of-accounts.component.scss'
})
export class ChartOfAccountsComponent {
  accounts: Account[] = [
    { code: '1010', name: 'Cash', type: 'Asset', details: 'Physical cash on hand', balance: 10000, bankBalance: 0, selected: false },
    { code: '1020', name: 'Bank Accounts', type: 'Asset', details: '', balance: 0, bankBalance: 84750, selected: false },
    { code: '1030', name: 'Accounts Receivable', type: 'Asset', details: '', balance: 0, bankBalance: 0, selected: false },
    { code: '2010', name: 'Accounts Payable', type: 'Liability', details: '', balance: 0, bankBalance: 0, selected: false },
    { code: '3010', name: 'POS Sales', type: 'Income', details: '', balance: 0, bankBalance: 0, selected: false },
    { code: '4010', name: 'Cost of Goods Sold (POS)', type: 'Expense', details: '', balance: 0, bankBalance: 0, selected: false },
    { code: '5010', name: "Owner's Capital", type: 'Equity', details: '', balance: 0, bankBalance: 0, selected: false },
  ];

  selectedAccounts: any[] = [];
  filteredAccounts: Account[] = [];
  paginatedAccounts: Account[] = [];
  rows = 10;
  first = 0;

  // Add Account Modal
  showAddAccountModal = false;
  showTypeDropdown = false;
  newAccount = {
    code: '',
    name: '',
    type: '',
    details: '',
    balance: 0,
    bankBalance: 0
  };
  accountTypes = [
    { label: 'Header', value: 'Header' },
    { label: 'Asset', value: 'Asset' },
    { label: 'Liability', value: 'Liability' },
    { label: 'Income', value: 'Income' },
    { label: 'Expense', value: 'Expense' },
    { label: 'Equity', value: 'Equity' }
  ];

  // View Register sidebar
  showRegisterSidebar = false;
  selectedAccount: any = null;
  accountTransactions: any[] = [];

  constructor(
    private router: Router,
    private confirmationService: ConfirmationService,
    private deletedRecordsService: DeletedRecordsService,
    private authService: AuthenticationService
  ) {}

  ngOnInit() {
    this.filteredAccounts = [...this.accounts];
    this.updatePaginatedAccounts();
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

  updatePaginatedAccounts() {
    const data = this.filteredAccounts.length ? this.filteredAccounts : this.accounts;
    this.paginatedAccounts = data.slice(this.first, this.first + this.rows);
  }

  // Pagination methods
  getCurrentPage(): number {
    return Math.floor(this.first / this.rows) + 1;
  }

  getTotalPages(): number {
    return Math.ceil(this.filteredAccounts.length / this.rows) || 1;
  }

  getPageStart(): number {
    if (this.filteredAccounts.length === 0) return 0;
    return this.first + 1;
  }

  getPageEnd(): number {
    const end = this.first + this.rows;
    return Math.min(end, this.filteredAccounts.length);
  }

  previousPage() {
    if (this.first > 0) {
      this.first -= this.rows;
      this.updatePaginatedAccounts();
    }
  }

  nextPage() {
    if (this.first + this.rows < this.filteredAccounts.length) {
      this.first += this.rows;
      this.updatePaginatedAccounts();
    }
  }

  onRowsChange() {
    this.first = 0;
    this.updatePaginatedAccounts();
  }

  // Type dropdown methods
  toggleTypeDropdown() {
    this.showTypeDropdown = !this.showTypeDropdown;
  }

  selectType(type: string) {
    this.newAccount.type = type;
    this.showTypeDropdown = false;
  }

  // Selection methods
  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.paginatedAccounts.forEach(account => account.selected = checked);
    this.onAccountSelectionChange();
  }

  onAccountSelectionChange() {
    this.selectedAccounts = this.accounts.filter(a => a.selected);
  }

  getSelectedCount(): number {
    return this.accounts.filter(a => a.selected).length;
  }

  deleteSelected() {
    if (this.getSelectedCount() === 0) return;
    
    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${this.getSelectedCount()} selected account(s)?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Get current user
        let username = 'Unknown User';
        // Try getting from sessionStorage first as per auth service logic
        const storedUser = sessionStorage.getItem('username');
        if (storedUser) {
             username = storedUser;
        } else {
            // Fallback to checking reg data if needed, or just keep 'Unknown User'
            const regData = sessionStorage.getItem('userInfoRegData');
            if(regData) {
                try {
                    const parsed = JSON.parse(regData);
                    username = parsed.username || parsed.email || 'Unknown User';
                } catch(e) {}
            }
        }

        // Process deletion
        const accountsToDelete = this.accounts.filter(a => a.selected);
        
        accountsToDelete.forEach(account => {
            this.deletedRecordsService.addRecord({
                originalData: account,
                deletedBy: username,
                recordType: 'ChartOfAccounts',
                reason: 'User deletion'
            });
        });

        this.accounts = this.accounts.filter(a => !a.selected);
        this.filteredAccounts = [...this.accounts];
        this.first = 0;
        this.updatePaginatedAccounts();
      },
      reject: () => {
        // Optional: handle rejection
      }
    });
  }

  viewDeletedRecords() {
    this.router.navigate(['/deleted-records']);
  }

  addAccount() {
    this.accounts.push({ ...this.newAccount, selected: false });
    this.showAddAccountModal = false;

    this.newAccount = {
      code: '',
      name: '',
      type: '',
      details: '',
      balance: 0,
      bankBalance: 0
    };
    this.filteredAccounts = [...this.accounts];
    this.updatePaginatedAccounts();
  }

  // Handle View Register button
  viewRegister(account: any) {
    this.selectedAccount = account;
    this.showRegisterSidebar = true;

    // In real app, fetch transactions from API.
    // For now, mock transactions:
    this.accountTransactions = [
      { date: '2024-06-01', description: 'Opening Balance', debit: 10000, credit: 0, balance: 10000 },
      { date: '2024-06-03', description: 'Sale', debit: 5000, credit: 0, balance: 15000 },
      { date: '2024-06-05', description: 'Purchase Supplies', debit: 0, credit: 1000, balance: 14000 }
    ];
  }

  closeModalOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      this.showAddAccountModal = false;
    }
  }
}
