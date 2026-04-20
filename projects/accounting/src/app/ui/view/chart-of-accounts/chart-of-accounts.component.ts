import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { AccountDTO, AccountType, PaginationResult } from '../../domain/accounting.dto';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-chart-of-accounts',
  templateUrl: './chart-of-accounts.component.html',
  styleUrl: './chart-of-accounts.component.scss'
})
export class ChartOfAccountsComponent implements OnInit {
  // Data
  accounts: AccountDTO[] = [];
  filteredAccounts: AccountDTO[] = [];
  paginatedAccounts: AccountDTO[] = [];
  
  // Selection
  selectedAccounts: AccountDTO[] = [];
  
  // State
  loading = false;
  rows = 10;
  first = 0;

  // Add Account Modal
  showAddAccountModal = false;
  showTypeDropdown = false;
  newAccount: Partial<AccountDTO> = {
    accountCode: 0,
    accountName: '',
    accountType: AccountType.ASSET,
    description: '',
    active: true,
    currency: 'NGN'
  };

  accountTypes = Object.keys(AccountType).map(key => ({
    label: key.charAt(0) + key.slice(1).toLowerCase(),
    value: key
  }));

  // View Register sidebar
  showRegisterSidebar = false;
  selectedAccount: AccountDTO | null = null;
  accountTransactions: any[] = [];

  constructor(
    private router: Router,
    private confirmationService: ConfirmationService,
    private accountingService: AccountingService,
    private toastService: ToastService
  ) {}

  ngOnInit() {
    this.loadAccounts();
  }

  loadAccounts() {
    this.loading = true;
    this.accountingService.getAccounts(0, 500).subscribe({ // Load larger set for local filtering
      next: (data: PaginationResult<AccountDTO>) => {
        this.accounts = (data.content || []).map(a => ({ ...a, selected: false }));
        this.filteredAccounts = [...this.accounts];
        this.updatePaginatedAccounts();
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Failed to load chart of accounts');
        this.loading = false;
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.toLowerCase();
    this.filteredAccounts = this.accounts.filter(account =>
      account.accountCode?.toString().includes(filterValue) ||
      account.accountName?.toLowerCase().includes(filterValue) ||
      account.accountType?.toLowerCase().includes(filterValue) ||
      (account.description && account.description.toLowerCase().includes(filterValue))
    );
    this.first = 0;
    this.updatePaginatedAccounts();
  }

  updatePaginatedAccounts() {
    this.paginatedAccounts = this.filteredAccounts.slice(this.first, this.first + this.rows);
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
    return this.selectedAccounts.length;
  }

  // Pagination helpers
  getCurrentPage(): number { return Math.floor(this.first / this.rows) + 1; }
  getTotalPages(): number { return Math.ceil(this.filteredAccounts.length / this.rows) || 1; }
  getPageStart(): number { return this.filteredAccounts.length === 0 ? 0 : this.first + 1; }
  getPageEnd(): number { return Math.min(this.first + this.rows, this.filteredAccounts.length); }

  previousPage() { if (this.first > 0) { this.first -= this.rows; this.updatePaginatedAccounts(); } }
  nextPage() { if (this.first + this.rows < this.filteredAccounts.length) { this.first += this.rows; this.updatePaginatedAccounts(); } }
  onRowsChange() { this.first = 0; this.updatePaginatedAccounts(); }

  // Modal logic
  toggleTypeDropdown() { this.showTypeDropdown = !this.showTypeDropdown; }
  selectType(type: any) { this.newAccount.accountType = type; this.showTypeDropdown = false; }
  
  closeModalOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.showAddAccountModal = false;
  }

  addAccount() {
    if (!this.newAccount.accountName || !this.newAccount.accountCode) {
      this.toastService.warn('Account Name and Code are required');
      return;
    }
    this.loading = true;
    this.accountingService.createAccount(this.newAccount).subscribe({
      next: () => {
        this.toastService.success('Account created successfully');
        this.showAddAccountModal = false;
        this.loadAccounts();
      },
      error: () => {
        this.toastService.error('Failed to create account');
        this.loading = false;
      }
    });
  }

  deleteSelected() {
    const count = this.getSelectedCount();
    if (count === 0) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to delete ${count} selected account(s)?`,
      header: 'Delete Confirmation',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loading = true;
        // In a real app, you'd use forkJoin for batch deletion
        const accountsToDelete = this.selectedAccounts;
        let deleted = 0;
        accountsToDelete.forEach(acc => {
          this.accountingService.deleteAccount(acc.id).subscribe({
            next: () => {
              deleted++;
              if (deleted === count) {
                this.toastService.success('Accounts retired successfully');
                this.loadAccounts();
              }
            }
          });
        });
      }
    });
  }

  viewRegister(account: AccountDTO) {
    this.selectedAccount = account;
    this.showRegisterSidebar = true;
    this.loading = true;
    this.accountingService.getLedgerEntries(0, 100, account.id).subscribe({
      next: (data: PaginationResult<any>) => {
        this.accountTransactions = (data.content || []).map(entry => ({
          ...entry,
          date: entry.entryDate,
          description: entry.description || entry.journalEntryLine?.description || 'System Entry',
          balance: entry.balanceAfter
        }));
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Failed to load register');
        this.loading = false;
      }
    });
  }

  viewDeletedRecords() {
    this.router.navigate(['/deleted-records']);
  }
}
