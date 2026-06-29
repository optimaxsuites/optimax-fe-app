import { Component, OnInit } from '@angular/core';

interface SalesTransaction {
  id: string;
  date: Date;
  reference: string;
  customer: string;
  amount: number;
  status: 'Matched' | 'Unmatched' | 'Pending' | 'Disputed';
  paymentMethod: 'Card' | 'Transfer' | 'Cash';
  erpMatch?: string;
  confidence?: number;
}

interface ErpSalesEntry {
  id: string;
  date: Date;
  invoiceNo: string;
  customer: string;
  amount: number;
  status: string;
}

@Component({
  selector: 'app-reconcile-sales',
  templateUrl: './reconcile-sales.component.html',
  styleUrls: ['./reconcile-sales.component.scss']
})
export class ReconcileSalesComponent implements OnInit {
  // State
  isLoading: boolean = false;
  showDropdown: boolean = false;
  showMatchModal: boolean = false;
  selectedTransaction: SalesTransaction | null = null;
  searchTerm: string = '';
  activeTab: 'all' | 'unmatched' | 'matched' = 'all';

  // Metrics
  stats = {
    totalSales: 4500000,
    matchedAmount: 3200000,
    unmatchedAmount: 1300000,
    matchRate: 71
  };

  // Sample Data
  salesTransactions: SalesTransaction[] = [
    {
      id: 'sls_1',
      date: new Date('2026-01-20'),
      reference: 'POS-10234',
      customer: 'Walk-in Customer',
      amount: 15000,
      status: 'Unmatched',
      paymentMethod: 'Card',
      confidence: 85
    },
    {
      id: 'sls_2',
      date: new Date('2026-01-21'),
      reference: 'TR-55421',
      customer: 'Mega Corp Ltd',
      amount: 450000,
      status: 'Matched',
      paymentMethod: 'Transfer',
      confidence: 100
    },
    {
      id: 'sls_3',
      date: new Date('2026-01-22'),
      reference: 'POS-10235',
      customer: 'John Doe',
      amount: 5200,
      status: 'Unmatched',
      paymentMethod: 'Cash',
      confidence: 60
    },
    {
      id: 'sls_4',
      date: new Date('2026-01-22'),
      reference: 'WEB-9901',
      customer: 'Sarah Smith',
      amount: 25000,
      status: 'Disputed',
      paymentMethod: 'Card',
      confidence: 40
    }
  ];

  constructor() { }

  ngOnInit(): void {
  }

  // Getters
  get filteredTransactions(): SalesTransaction[] {
    return this.salesTransactions.filter(tx => {
      const searchMatch = tx.reference.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                          tx.customer.toLowerCase().includes(this.searchTerm.toLowerCase());
      const statusMatch = this.activeTab === 'all' || 
                          (this.activeTab === 'matched' && tx.status === 'Matched') ||
                          (this.activeTab === 'unmatched' && tx.status !== 'Matched');
      return searchMatch && statusMatch;
    });
  }

  // Actions
  handleMatch(transaction: SalesTransaction): void {
    this.selectedTransaction = transaction;
    this.showMatchModal = true;
  }

  confirmMatch(): void {
    if (this.selectedTransaction) {
      this.salesTransactions = this.salesTransactions.map(tx => 
        tx.id === this.selectedTransaction!.id ? { ...tx, status: 'Matched' as const } : tx
      );
      this.closeModal();
    }
  }

  flagTransaction(): void {
    if (this.selectedTransaction) {
      this.salesTransactions = this.salesTransactions.map(tx => 
        tx.id === this.selectedTransaction!.id ? { ...tx, status: 'Disputed' as const } : tx
      );
      this.closeModal();
    }
  }

  bypassMatch(): void {
    this.closeModal();
  }

  closeModal(): void {
    this.showMatchModal = false;
    this.selectedTransaction = null;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'Matched': return 'bg-green-100 text-green-800';
      case 'Unmatched': return 'bg-yellow-100 text-yellow-800';
      case 'Disputed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
}
