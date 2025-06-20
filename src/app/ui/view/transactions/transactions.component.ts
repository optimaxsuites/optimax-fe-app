import { Component, OnInit, Type } from '@angular/core';
import { SalesOrderComponent } from '../sales-order/sales-order.component';
import { QuotationComponent } from '../quotation/quotation.component';
import { BookKeepingComponent } from '../book-keeping/book-keeping.component';

export interface TabConfig {
  name: string;
  component: any;
  hasDropdown?: boolean;
  dropdownOptions?: DropdownOption[];
  role?: string;
}

export interface DropdownOption {
  label: string;
  action: string;
  component: Type<any>;
}

interface Transaction {
  id: number;
  date: string;
  description: string;
  spent: number | null;
  received: number | null;
  assignedTo: string;
  reviewed?: boolean;
}

declare const MonoConnect: any;

@Component({
  selector: 'app-transactions',
  templateUrl: './transactions.component.html',
  styleUrls: ['./transactions.component.scss']
})
export class TransactionsComponent implements OnInit {


  searchTerm = '';
  selectedTransaction: Transaction | null = null;
  isReviewModalOpen = false;

  selectedFilter = '';
  dateFrom = '';
  dateTo = '';

  currentPage = 1;
  rowsPerPage = 5;

  transactions: Transaction[] = [
    {
      id: 1,
      date: '2024-10-30',
      description: 'Blending machine',
      spent: 4400.00,
      received: null,
      assignedTo: 'Review and Confirm',
      reviewed: false
    },
    // Add more transactions...
  ];

  filteredTransactions: Transaction[] = [];

  tabsConfig: TabConfig[] = [
    {
      name: 'Report',
      component: SalesOrderComponent
    },
    {
      name: 'Products',
      component: QuotationComponent
    },
    {
      name: 'Inventory',
      component: BookKeepingComponent
    }
  ];

  ngOnInit() {
    this.applyFilter();
  }

  get paginatedTransactions(): Transaction[] {
    const start = (this.currentPage - 1) * this.rowsPerPage;
    return this.filteredTransactions.slice(start, start + this.rowsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredTransactions.length / this.rowsPerPage);
  }

  applyFilter() {
    let filtered = [...this.transactions];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();

    if (this.selectedFilter === 'unreviewed') {
      filtered = filtered.filter(t => !t.reviewed);
    } else if (this.selectedFilter === 'today') {
      filtered = filtered.filter(t => new Date(t.date).toDateString() === today);
    } else if (this.selectedFilter === 'yesterday') {
      filtered = filtered.filter(t => new Date(t.date).toDateString() === yesterday);
    }

    if (this.dateFrom && this.dateTo) {
      const from = new Date(this.dateFrom);
      const to = new Date(this.dateTo);
      filtered = filtered.filter(t => {
        const date = new Date(t.date);
        return date >= from && date <= to;
      });
    }

    this.filteredTransactions = filtered;
    this.currentPage = 1;
  }

  openReviewModal(transaction: Transaction) {
    this.selectedTransaction = transaction;
    this.isReviewModalOpen = true;
  }

  closeReviewModal() {
    this.selectedTransaction = null;
    this.isReviewModalOpen = false;
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  get currencyFormatter() {
    return (amount: number | null): string => {
      if (!amount) return '';
      return `₦${amount.toLocaleString()}`;
    };
  }

  handleSearchChange(term: string) {
    this.searchTerm = term;
    this.filteredTransactions = this.transactions.filter(t =>
      t.description?.toLowerCase().includes(term.toLowerCase()) ||
      t.assignedTo?.toLowerCase().includes(term.toLowerCase()) ||
      t.date?.toLowerCase().includes(term.toLowerCase())
    );
  }
}
