import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { AccountDTO, AccountType, PaginationResult } from '../../domain/accounting.dto';
import { AccountingService } from '../../../services/accounting.service';
import { ToastService } from '../../../services/toast.service';

/**
 * Extended AccountDTO with visual/hierarchical properties
 */
export interface TreeAccountDTO extends AccountDTO {
  children?: TreeAccountDTO[];
  level?: number;
  expanded?: boolean;
}

@Component({
  selector: 'app-chart-of-accounts',
  templateUrl: './chart-of-accounts.component.html',
  styleUrl: './chart-of-accounts.component.scss'
})
export class ChartOfAccountsComponent implements OnInit {
  // Data
  accounts: TreeAccountDTO[] = [];
  treeAccounts: TreeAccountDTO[] = []; // Root accounts with children
  filteredAccounts: TreeAccountDTO[] = []; // Current display list (flattened roots)
  paginatedAccounts: TreeAccountDTO[] = [];
  
  // Selection
  selectedAccounts: TreeAccountDTO[] = [];
  
  // State
  loading = false;
  expandedNodes: Set<number> = new Set();
  searchTerm: string = '';
  rows = 10;
  first = 0;

  // Add Account Modal
  showAddAccountModal = false;
  showTypeDropdown = false;
  newAccount: Partial<AccountDTO> = {
    accountCode: 0,
    accountName: '',
    accountType: AccountType.ASSET,
    parentAccountId: 0,
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
    this.accountingService.getAccounts(0, 500).subscribe({
      next: (data: PaginationResult<AccountDTO>) => {
        const flatList = (data.content || []).map(a => ({ ...a, selected: false }));
        this.accounts = flatList as TreeAccountDTO[];
        this.updateAvailableParents(); // Initialize parents list
        this.buildTree();
        this.loading = false;
      },
      error: () => {
        this.toastService.error('Failed to load chart of accounts');
        this.loading = false;
      }
    });
  }

  buildTree() {
    const accountMap = new Map<number, TreeAccountDTO>();
    this.accounts.forEach(acc => {
      acc.children = [];
      accountMap.set(acc.id, acc);
    });

    const roots: TreeAccountDTO[] = [];
    this.accounts.forEach(acc => {
      const parentId = acc.parentAccountId || (acc.parentAccount ? acc.parentAccount.id : 0);
      if (parentId && accountMap.has(parentId)) {
        const parent = accountMap.get(parentId)!;
        parent.children = parent.children || [];
        parent.children.push(acc);
      } else {
        roots.push(acc);
      }
    });

    this.treeAccounts = roots;
    this.applyFiltering();
  }

  toggleNode(account: TreeAccountDTO) {
    if (this.expandedNodes.has(account.id)) {
      this.expandedNodes.delete(account.id);
    } else {
      this.expandedNodes.add(account.id);
    }
    this.updatePaginatedAccounts();
  }

  applyFiltering() {
    if (!this.searchTerm) {
      this.filteredAccounts = [...this.treeAccounts];
    } else {
      const term = this.searchTerm.toLowerCase();
      // Tree search: include matching nodes and their ancestors
      const matches = new Set<number>();
      
      const checkNode = (node: TreeAccountDTO): boolean => {
        const nodeMatches = 
          node.accountCode?.toString().includes(term) ||
          node.accountName?.toLowerCase().includes(term) ||
          node.accountType?.toLowerCase().includes(term) ||
          (node.description && node.description.toLowerCase().includes(term));
        
        let childMatches = false;
        if (node.children) {
          node.children.forEach(c => {
            if (checkNode(c)) childMatches = true;
          });
        }

        if (nodeMatches || childMatches) {
          matches.add(node.id);
          return true;
        }
        return false;
      };

      this.treeAccounts.forEach(root => checkNode(root));
      
      // Filter root list to only those that match or have matching descendants
      this.filteredAccounts = this.treeAccounts.filter(root => matches.has(root.id));
    }
    this.first = 0;
    this.updatePaginatedAccounts();
  }

  applyFilter(event: Event) {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFiltering();
  }

  updatePaginatedAccounts() {
    // Pagination happens on the filtered root accounts
    const paginatedRoots = this.filteredAccounts.slice(this.first, this.first + this.rows);
    
    // Flatten the paginated root nodes into a list for the table rows, respecting expansion
    const flattened: TreeAccountDTO[] = [];
    const flatten = (node: TreeAccountDTO, level: number) => {
      node.level = level;
      flattened.push(node);
      if (this.expandedNodes.has(node.id) && node.children && node.children.length > 0) {
        node.children.forEach(child => flatten(child, level + 1));
      }
    };

    paginatedRoots.forEach(root => flatten(root, 0));
    this.paginatedAccounts = flattened;
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

  availableParents: TreeAccountDTO[] = [];

  // Logic to update available parents based on current selection
  updateAvailableParents() {
    this.availableParents = this.accounts.filter(acc => 
      acc.accountType === this.newAccount.accountType && 
      acc.id !== this.newAccount.id
    );
  }

  // Modal logic
  toggleTypeDropdown() { this.showTypeDropdown = !this.showTypeDropdown; }
  selectType(type: any) { 
    this.newAccount.accountType = type; 
    this.newAccount.parentAccountId = 0; 
    this.updateAvailableParents(); // Update parent list when type changes
    this.showTypeDropdown = false; 
  }
  
  closeModalOnBackdrop(event: MouseEvent) {
    if (event.target === event.currentTarget) this.showAddAccountModal = false;
  }

  addAccount() {
    if (!this.newAccount.accountName || !this.newAccount.accountCode) {
      this.toastService.warn('Account Name and Code are required');
      return;
    }
    
    this.loading = true;
    
    // Sanitize payload: If parentAccountId is 0, set to undefined to satisfy TS and omit from JSON
    const payload = { 
      ...this.newAccount,
      parentAccountId: (this.newAccount.parentAccountId && this.newAccount.parentAccountId !== 0) 
        ? this.newAccount.parentAccountId 
        : undefined
    };

    console.log('[Optimax Diagnostic] Creating Account with payload:', payload);
    
    this.accountingService.createAccount(payload).subscribe({
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
