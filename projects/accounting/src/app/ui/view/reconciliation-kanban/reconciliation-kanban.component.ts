import { Component } from '@angular/core';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  source: 'Bank' | 'POS' | 'Transfer' | 'Expense';
  type: 'bank' | 'erp';
  matchScore?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  predictionText?: string;
  status: 'unmatched' | 'auto-matched' | 'needs-review' | 'resolved';
}

@Component({
  selector: 'app-reconciliation-kanban',
  templateUrl: './reconciliation-kanban.component.html',
  styleUrls: ['./reconciliation-kanban.component.scss']
})
export class ReconciliationKanbanComponent {
  selectedPeriod = 'January 2026';
  selectedAccount = 'GTBank - Main Account';
  searchText = '';
  activeTab: 'all' | 'unmatched' | 'auto-matched' | 'needs-review' | 'resolved' = 'all';
  
  selectedCard: Transaction | null = null;
  showDrawer = false;

  bankFeed: Transaction[] = [
    { 
      id: 'B1', 
      date: '2026-01-28', 
      description: 'ATM Withdrawal - Allen Avenue', 
      amount: -50000, 
      source: 'Bank', 
      type: 'bank',
      matchScore: 92,
      riskLevel: 'low',
      predictionText: 'This looks like a petty cash withdrawal based on past behavior.',
      status: 'unmatched'
    },
    { 
      id: 'B2', 
      date: '2026-01-27', 
      description: 'POS Deposit - Store 001', 
      amount: 85000, 
      source: 'POS', 
      type: 'bank',
      matchScore: 95,
      riskLevel: 'low',
      predictionText: 'Looks like POS settlement from retail location.',
      status: 'unmatched'
    },
    { 
      id: 'B3', 
      date: '2026-01-26', 
      description: 'Bank Charges - Service Fee', 
      amount: -1500, 
      source: 'Bank', 
      type: 'bank',
      matchScore: 88,
      riskLevel: 'low',
      predictionText: 'Standard monthly bank charges.',
      status: 'unmatched'
    },
    { 
      id: 'B4', 
      date: '2026-01-25', 
      description: 'Transfer from Sales', 
      amount: 300000, 
      source: 'Transfer', 
      type: 'bank',
      matchScore: 78,
      riskLevel: 'medium',
      predictionText: 'Large transfer - verify with sales records.',
      status: 'unmatched'
    },
    { 
      id: 'B5', 
      date: '2026-01-24', 
      description: 'POS Transaction - Terminal 05', 
      amount: 125000, 
      source: 'POS', 
      type: 'bank',
      matchScore: 91,
      riskLevel: 'low',
      predictionText: 'Regular POS settlement pattern detected.',
      status: 'unmatched'
    },
  ];

  erpTransactions: Transaction[] = [
    { 
      id: 'E1', 
      date: '2026-01-28', 
      description: 'Petty Cash Withdrawal', 
      amount: -50000, 
      source: 'Expense', 
      type: 'erp',
      matchScore: 92,
      riskLevel: 'low',
      predictionText: 'Matches bank ATM withdrawal pattern.',
      status: 'unmatched'
    },
    { 
      id: 'E2', 
      date: '2026-01-27', 
      description: 'Sales Receipt - Store 001', 
      amount: 85000, 
      source: 'POS', 
      type: 'erp',
      matchScore: 95,
      riskLevel: 'low',
      predictionText: 'Direct match with POS deposit.',
      status: 'unmatched'
    },
    { 
      id: 'E3', 
      date: '2026-01-26', 
      description: 'Supplier Payment - ABC Ltd', 
      amount: -120000, 
      source: 'Transfer', 
      type: 'erp',
      matchScore: 65,
      riskLevel: 'high',
      predictionText: 'No matching bank transaction found.',
      status: 'unmatched'
    },
    { 
      id: 'E4', 
      date: '2026-01-25', 
      description: 'Customer Payment Received', 
      amount: 301500, 
      source: 'Transfer', 
      type: 'erp',
      matchScore: 76,
      riskLevel: 'medium',
      predictionText: 'Amount differs by ₦1,500 from bank record.',
      status: 'unmatched'
    },
  ];

  needsReview: Transaction[] = [];
  resolved: Transaction[] = [];

  // Dragging state
  draggingItem: Transaction | null = null;
  dragOverColumn: string | null = null;

  get stats() {
    const total = this.bankFeed.length + this.erpTransactions.length + this.needsReview.length + this.resolved.length;
    const autoMatched = this.getAllTransactions().filter(t => t.status === 'auto-matched').length;
    const needsReviewCount = this.needsReview.length;
    const resolvedCount = this.resolved.length;
    
    // Calculate difference (mock)
    const bankTotal = this.bankFeed.reduce((sum, t) => sum + t.amount, 0);
    const erpTotal = this.erpTransactions.reduce((sum, t) => sum + t.amount, 0);
    const difference = Math.abs(bankTotal - erpTotal);

    return {
      totalImported: total,
      autoMatched,
      needsReview: needsReviewCount,
      resolved: resolvedCount,
      difference
    };
  }

  get filteredBankFeed() {
    return this.filterByTab(this.bankFeed);
  }

  get filteredErpTransactions() {
    return this.filterByTab(this.erpTransactions);
  }

  get filteredNeedsReview() {
    return this.filterByTab(this.needsReview);
  }

  get filteredResolved() {
    return this.filterByTab(this.resolved);
  }

  getAllTransactions(): Transaction[] {
    return [...this.bankFeed, ...this.erpTransactions, ...this.needsReview, ...this.resolved];
  }

  filterByTab(transactions: Transaction[]): Transaction[] {
    if (this.activeTab === 'all') return transactions;
    return transactions.filter(t => t.status === this.activeTab);
  }

  setActiveTab(tab: 'all' | 'unmatched' | 'auto-matched' | 'needs-review' | 'resolved') {
    this.activeTab = tab;
  }

  onDragStarted(item: Transaction) {
    this.draggingItem = item;
  }

  onDragEnded() {
    this.draggingItem = null;
    this.dragOverColumn = null;
  }

  onDragEntered(columnName: string) {
    this.dragOverColumn = columnName;
  }

  onDragExited() {
    this.dragOverColumn = null;
  }

  drop(event: CdkDragDrop<Transaction[]>, targetList: string) {
    const sourceList = this.getListName(event.previousContainer.data);
    const item = event.previousContainer.data[event.previousIndex];

    if (event.previousContainer === event.container) {
      // Same container - just reorder
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
      console.log(`Reordered ${item.id} within ${targetList}`);
    } else {
      // Different container - transfer
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );

      // Update status based on target
      if (targetList === 'Needs Review') {
        item.status = 'needs-review';
        console.log(`Moved to Review: ${item.id}`);
      } else if (targetList === 'Resolved') {
        item.status = 'resolved';
        console.log(`Resolved transaction: ${item.id}`);
      } else {
        item.status = 'unmatched';
        console.log(`Moved ${item.id} from ${sourceList} to ${targetList}`);
      }
    }

    this.dragOverColumn = null;
  }

  onCardClick(transaction: Transaction) {
    this.selectedCard = transaction;
    this.showDrawer = true;
  }

  closeDrawer() {
    this.showDrawer = false;
    setTimeout(() => {
      this.selectedCard = null;
    }, 300);
  }

  getListName(list: Transaction[]): string {
    if (list === this.bankFeed) return 'Bank Feed';
    if (list === this.erpTransactions) return 'ERP Transactions';
    if (list === this.needsReview) return 'Needs Review';
    if (list === this.resolved) return 'Resolved';
    return 'Unknown';
  }

  formatCurrency(amount: number): string {
    return `₦${Math.abs(amount).toLocaleString()}`;
  }

  getAmountClass(amount: number): string {
    return amount >= 0 ? 'positive' : 'negative';
  }

  getRiskBadgeClass(risk?: string): string {
    switch (risk) {
      case 'high': return 'risk-high';
      case 'medium': return 'risk-medium';
      case 'low': return 'risk-low';
      default: return '';
    }
  }

  getSourceBadgeClass(source: string): string {
    const classMap: { [key: string]: string } = {
      'Bank': 'source-bank',
      'POS': 'source-pos',
      'Transfer': 'source-transfer',
      'Expense': 'source-expense'
    };
    return classMap[source] || '';
  }

  refreshData() {
    console.log('Refreshing data...');
    // Mock refresh
  }

  applyFilters() {
    console.log('Applying filters...');
    // Mock filter application
  }
}
