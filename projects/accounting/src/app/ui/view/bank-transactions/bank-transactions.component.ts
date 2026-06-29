import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { ToastService } from '../../../services/toast.service';

export interface BankTransaction {
  id: string;
  transactionDate: Date;
  description: string;
  externalReference: string;
  transactionType: 'DEBIT' | 'CREDIT';
  amount: number;
  status: 'UNMATCHED' | 'MATCHED' | 'PARTIALLY_MATCHED';
  bankAccount: {
    accountName: string;
  };
  source: 'HR' | 'POS' | 'HOSPITALITY' | 'BANK' | 'EXPENSE' | 'MANUAL';
  category?: string;
  matchedWith?: string;
  confidence?: number;
}

@Component({
  selector: 'app-bank-transactions',
  templateUrl: './bank-transactions.component.html',
  styleUrls: ['./bank-transactions.component.scss']
})
export class BankTransactionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Bank selector properties
  bankAccounts = [
    { name: 'Access Bank', accountNumber: '23343455667', logo: 'https://nbl.xyz/library/access-bank.svg', balance: 5420300.50 },
    { name: 'Wema Bank', accountNumber: '0123456789', logo: 'https://nbl.xyz/library/wema-bank.svg', balance: 1250000.00 },
    { name: 'Zenith Bank', accountNumber: '1122334455', logo: 'https://nbl.xyz/library/zenith-bank.svg', balance: 8900450.75 },
    { name: 'GTBank', accountNumber: '0987654321', logo: 'https://nbl.xyz/library/gtbank.svg', balance: 367000.00 }
  ];
  selectedBank = this.bankAccounts[0];
  dropdownSearchText = '';
  showDropdown = false;

  // Balance visibility and sync properties
  showBalance = true;
  syncingBalance = false;
  lastSyncedDate = new Date();

  toggleBalanceVisibility(): void {
    this.showBalance = !this.showBalance;
  }

  syncBalance(): void {
    if (this.syncingBalance) return;
    this.syncingBalance = true;
    setTimeout(() => {
      this.syncingBalance = false;
      // Slightly fluctuate the balance for realism
      this.selectedBank.balance += Math.floor(Math.random() * 20000) - 10000;
      this.lastSyncedDate = new Date();
    }, 1000);
  }

  logoErrors: { [key: string]: boolean } = {};

  handleLogoError(bankName: string): void {
    this.logoErrors[bankName] = true;
  }

  // UI state
  loading = false;
  searchText = '';
  selectedStatus = 'All';
  selectedType = 'All';
  startDate = '';
  endDate = '';
  showDetailModal = false;
  selectedTransaction: BankTransaction | null = null;

  // Pagination
  currentPage = 1;
  rowsPerPage = 10;

  // Categories for transactions
  categories = ['Income', 'Withdrawal', 'Utilities', 'Transfer', 'Operations', 'Uncategorized'];

  // Dummy Bank Transactions Data
  transactions: BankTransaction[] = [
    {
      id: 'TX-1001',
      transactionDate: new Date(2026, 4, 19),
      description: 'TRANSFER FROM JOHN DOE',
      externalReference: 'FT26121ABC123',
      transactionType: 'CREDIT',
      amount: 50000.00,
      status: 'UNMATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'HR',
      category: 'Income'
    },
    {
      id: 'TX-1002',
      transactionDate: new Date(2026, 4, 18),
      description: 'POS Settlement – Store 001',
      externalReference: 'FT26138XYZ456',
      transactionType: 'CREDIT',
      amount: 320000.00,
      status: 'MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'POS',
      category: 'Income',
      matchedWith: 'JE-2026-088',
      confidence: 98
    },
    {
      id: 'TX-1003',
      transactionDate: new Date(2026, 4, 17),
      description: 'STAFF SALARIES - MAY BATCH',
      externalReference: 'FT26137PAY777',
      transactionType: 'DEBIT',
      amount: 1200000.00,
      status: 'MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'HR',
      category: 'Operations',
      matchedWith: 'JE-2026-085',
      confidence: 100
    },
    {
      id: 'TX-1004',
      transactionDate: new Date(2026, 4, 15),
      description: 'CATERING SERVICE INFLOW',
      externalReference: 'FT26135HOS112',
      transactionType: 'CREDIT',
      amount: 85000.00,
      status: 'PARTIALLY_MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'HOSPITALITY',
      category: 'Income',
      confidence: 65
    },
    {
      id: 'TX-1005',
      transactionDate: new Date(2026, 4, 12),
      description: 'MTN INTERNET FIBER',
      externalReference: 'FT26132ISP883',
      transactionType: 'DEBIT',
      amount: 25000.00,
      status: 'MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'EXPENSE',
      category: 'Utilities',
      matchedWith: 'JE-2026-081',
      confidence: 95
    },
    {
      id: 'TX-1006',
      transactionDate: new Date(2026, 4, 10),
      description: 'UTILITIES - EKEDC BILL',
      externalReference: 'FT26130UTI994',
      transactionType: 'DEBIT',
      amount: 85000.00,
      status: 'UNMATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'EXPENSE',
      category: 'Utilities'
    },
    {
      id: 'TX-1007',
      transactionDate: new Date(2026, 4, 8),
      description: 'SUPPLIER PAYMENT - GLOBAL MART',
      externalReference: 'FT26128SPL332',
      transactionType: 'DEBIT',
      amount: 230000.00,
      status: 'PARTIALLY_MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'EXPENSE',
      category: 'Operations'
    },
    {
      id: 'TX-1008',
      transactionDate: new Date(2026, 4, 5),
      description: 'HOTEL RESERVATION SETTLEMENT',
      externalReference: 'FT26125HOS220',
      transactionType: 'CREDIT',
      amount: 450000.00,
      status: 'MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'HOSPITALITY',
      category: 'Income',
      matchedWith: 'JE-2026-074',
      confidence: 100
    },
    {
      id: 'TX-1009',
      transactionDate: new Date(2026, 4, 3),
      description: 'OFFICE SUPPLIES DEPOT',
      externalReference: 'FT26123OPS011',
      transactionType: 'DEBIT',
      amount: 45000.00,
      status: 'UNMATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'EXPENSE',
      category: 'Operations'
    },
    {
      id: 'TX-1010',
      transactionDate: new Date(2026, 4, 1),
      description: 'REFUND FROM JUMIA OUTLET',
      externalReference: 'FT26121REF001',
      transactionType: 'CREDIT',
      amount: 18500.00,
      status: 'UNMATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'EXPENSE',
      category: 'Income'
    },
    {
      id: 'TX-1011',
      transactionDate: new Date(2026, 3, 28), // April 28
      description: 'CONSULTING INFLOW - ACME CORP',
      externalReference: 'FT26118CNS771',
      transactionType: 'CREDIT',
      amount: 500000.00,
      status: 'MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'MANUAL',
      category: 'Income',
      matchedWith: 'JE-2026-068',
      confidence: 99
    },
    {
      id: 'TX-1012',
      transactionDate: new Date(2026, 3, 25), // April 25
      description: 'LOAN RECOVERY INSTALLMENT',
      externalReference: 'FT26115LON441',
      transactionType: 'CREDIT',
      amount: 150000.00,
      status: 'MATCHED',
      bankAccount: { accountName: 'Main Business Account' },
      source: 'HR',
      category: 'Income',
      matchedWith: 'JE-2026-062',
      confidence: 100
    }
  ];

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    document.addEventListener('click', () => {
      this.showDropdown = false;
    });
    this.fetchLogos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchLogos(): void {
    fetch('https://api.nigerianbanklogos.xyz?limit=25')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          this.bankAccounts.forEach(bank => {
            const apiBank = data.find((b: any) => 
              b.title.toLowerCase().includes(bank.name.toLowerCase()) || 
              bank.name.toLowerCase().includes(b.title.toLowerCase())
            );
            if (apiBank && apiBank.route) {
              bank.logo = apiBank.route;
            }
          });
        }
      })
      .catch(err => console.log('Error fetching live logos:', err));
  }

  toggleDropdown(): void {
    this.showDropdown = !this.showDropdown;
  }

  getFilteredBankAccounts() {
    return this.bankAccounts.filter(bank => 
      bank.name.toLowerCase().includes(this.dropdownSearchText.toLowerCase()) ||
      bank.accountNumber.includes(this.dropdownSearchText)
    );
  }

  selectBank(bank: any): void {
    this.selectedBank = bank;
    this.showDropdown = false;
    this.toastService.info(`Switched active account to ${bank.name}`);
    
    // Simulate loading new bank transactions
    this.loading = true;
    setTimeout(() => {
      this.loading = false;
    }, 800);
  }

  // Sync / Refresh bank transactions with simulated loaders
  syncTransactions(): void {
    this.loading = true;
    this.toastService.info('Syncing bank transactions...');
    setTimeout(() => {
      this.loading = false;
      this.toastService.success('Transactions synchronized successfully!');
    }, 2000);
  }

  // Filter bank transactions
  filterTransactions(): BankTransaction[] {
    return this.transactions.filter(t => {
      const matchesStatus = this.selectedStatus === 'All' || t.status === this.selectedStatus;
      const matchesType = this.selectedType === 'All' || t.transactionType === this.selectedType;
      
      const matchesSearch = this.searchText === '' || 
        t.description.toLowerCase().includes(this.searchText.toLowerCase()) ||
        t.externalReference.toLowerCase().includes(this.searchText.toLowerCase()) ||
        t.bankAccount.accountName.toLowerCase().includes(this.searchText.toLowerCase()) ||
        t.source.toLowerCase().includes(this.searchText.toLowerCase());

      // Date Range Filter
      let matchesDate = true;
      if (this.startDate) {
        const start = new Date(this.startDate);
        start.setHours(0, 0, 0, 0);
        matchesDate = matchesDate && t.transactionDate >= start;
      }
      if (this.endDate) {
        const end = new Date(this.endDate);
        end.setHours(23, 59, 59, 999);
        matchesDate = matchesDate && t.transactionDate <= end;
      }

      return matchesStatus && matchesType && matchesSearch && matchesDate;
    });
  }

  // Clear filters
  clearFilters(): void {
    this.searchText = '';
    this.selectedStatus = 'All';
    this.selectedType = 'All';
    this.startDate = '';
    this.endDate = '';
    this.currentPage = 1;
    this.toastService.info('Filters cleared successfully.');
  }

  // Pagination helper
  getPaginatedTransactions(): BankTransaction[] {
    const filtered = this.filterTransactions();
    const startIndex = (this.currentPage - 1) * this.rowsPerPage;
    return filtered.slice(startIndex, startIndex + this.rowsPerPage);
  }

  getTotalPages(): number {
    const filtered = this.filterTransactions();
    return Math.ceil(filtered.length / this.rowsPerPage) || 1;
  }

  getPageStart(): number {
    if (this.filterTransactions().length === 0) return 0;
    return ((this.currentPage - 1) * this.rowsPerPage) + 1;
  }

  getPageEnd(): number {
    const filtered = this.filterTransactions();
    return Math.min(this.currentPage * this.rowsPerPage, filtered.length);
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // Statistics getters
  getStats() {
    const all = this.transactions;
    const totalCount = all.length;
    const matched = all.filter(t => t.status === 'MATCHED').length;
    const unmatched = all.filter(t => t.status === 'UNMATCHED').length;
    const partiallyMatched = all.filter(t => t.status === 'PARTIALLY_MATCHED').length;

    const totalInflow = all.filter(t => t.transactionType === 'CREDIT').reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = all.filter(t => t.transactionType === 'DEBIT').reduce((sum, t) => sum + t.amount, 0);

    return { totalCount, matched, unmatched, partiallyMatched, totalInflow, totalOutflow };
  }

  // Actions
  viewTransactionDetail(tx: BankTransaction): void {
    this.selectedTransaction = tx;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedTransaction = null;
  }

  matchTransaction(tx: BankTransaction): void {
    this.toastService.info(`Initiating matching process for ${tx.id}...`);
    this.loading = true;
    setTimeout(() => {
      tx.status = 'MATCHED';
      tx.matchedWith = 'JE-2026-' + Math.floor(Math.random() * 900 + 100);
      tx.confidence = Math.floor(Math.random() * 20) + 80;
      this.loading = false;
      this.toastService.success(`Successfully matched ${tx.id} with Journal Entry!`);
    }, 1500);
  }

  // Class helpers
  getStatusClass(status: string): string {
    switch (status) {
      case 'MATCHED': return 'status-matched';
      case 'PARTIALLY_MATCHED': return 'status-pending';
      default: return 'status-unmatched';
    }
  }

  formatNaira(amount: number | null): string {
    if (amount === null) return '—';
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
  }
}
