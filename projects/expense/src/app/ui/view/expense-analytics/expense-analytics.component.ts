import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ExpenseService, Expense, ExpenseStatus, CategoryDTO } from '../../service/expense.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { SkeletonModule } from 'primeng/skeleton';

export interface ExpenseStat {
  label: string;
  amount: number;
  count: number;
  approved: number;
  pending: number;
  rejected: number;
  percentage: number;
}

@Component({
  selector: 'app-expense-analytics',
  templateUrl: './expense-analytics.component.html',
  styleUrls: ['./expense-analytics.component.scss'],
  standalone: true,
  providers: [MessageService],
  imports: [CommonModule, FormsModule, ToastModule, DropdownModule, TableModule, SkeletonModule]
})
export class ExpenseAnalyticsComponent implements OnInit, OnDestroy {

  expenses: Expense[] = [];
  isLoading = true;
  private destroy$ = new Subject<void>();

  // Filters
  selectedYear: number = new Date().getFullYear();
  selectedGroupBy: 'month' | 'category' | 'status' | 'paidBy' | 'employee' = 'month';

  availableYears: number[] = [];
  groupByOptions = [
    { label: 'By Month', value: 'month' },
    { label: 'By Category', value: 'category' },
    { label: 'By Status', value: 'status' },
    { label: 'By Paid By', value: 'paidBy' },
    { label: 'By Employee', value: 'employee' },
  ];

  stats: ExpenseStat[] = [];

  // Report export
  isExporting = false;

  constructor(
    private expenseService: ExpenseService,
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.expenseService.getAllExpenses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.expenses = data;
          this.buildAvailableYears();
          this.computeStats();
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
          this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load expense data for analytics.' });
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private buildAvailableYears(): void {
    const years = new Set<number>();
    this.expenses.forEach(e => {
      const d = this.parseDate(e.eventDate);
      if (d) years.add(d.getFullYear());
    });
    const currentYear = new Date().getFullYear();
    years.add(currentYear);
    this.availableYears = Array.from(years).sort((a, b) => b - a);
    if (!this.availableYears.includes(this.selectedYear)) {
      this.selectedYear = this.availableYears[0] || currentYear;
    }
  }

  private parseDate(raw: any): Date | null {
    if (!raw) return null;
    if (Array.isArray(raw)) {
      const [year, month, day, h = 0, m = 0, s = 0] = raw;
      return new Date(year, month - 1, day, h, m, s);
    }
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  }

  get filteredExpenses(): Expense[] {
    return this.expenses.filter(e => {
      const d = this.parseDate(e.eventDate);
      return d ? d.getFullYear() === this.selectedYear : false;
    });
  }

  computeStats(): void {
    const expenses = this.filteredExpenses;

    const groupMap = new Map<string, Expense[]>();

    expenses.forEach(e => {
      let key = '';
      switch (this.selectedGroupBy) {
        case 'month':
          const d = this.parseDate(e.eventDate);
          key = d ? d.toLocaleString('default', { month: 'long' }) : 'Unknown';
          break;
        case 'category':
          key = (e.category as CategoryDTO)?.name || 'Uncategorized';
          break;
        case 'status':
          key = e.status || 'Unknown';
          break;
        case 'paidBy':
          key = String(e.paidBy) || 'Unknown';
          break;
        case 'employee':
          key = (e.expenseBy as any)?.fullname || 'Unknown';
          break;
      }

      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(e);
    });

    const totalAmount = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);

    const rawStats: ExpenseStat[] = [];
    groupMap.forEach((group, label) => {
      const amount = group.reduce((s, e) => s + Number(e.amount || 0), 0);
      rawStats.push({
        label,
        amount,
        count: group.length,
        approved: group.filter(e => e.status === ExpenseStatus.APPROVED).length,
        pending: group.filter(e => e.status === ExpenseStatus.PENDING).length,
        rejected: group.filter(e => e.status === ExpenseStatus.REJECTED).length,
        percentage: totalAmount > 0 ? Math.round((amount / totalAmount) * 100) : 0
      });
    });

    // Sort months chronologically
    if (this.selectedGroupBy === 'month') {
      const monthOrder = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      rawStats.sort((a, b) => monthOrder.indexOf(a.label) - monthOrder.indexOf(b.label));
    } else {
      rawStats.sort((a, b) => b.amount - a.amount);
    }

    this.stats = rawStats;
  }

  onFilterChange(): void {
    this.computeStats();
  }

  // Summary totals
  get totalAmount(): number { return this.filteredExpenses.reduce((s, e) => s + Number(e.amount || 0), 0); }
  get totalCount(): number { return this.filteredExpenses.length; }
  get approvedCount(): number { return this.filteredExpenses.filter(e => e.status === ExpenseStatus.APPROVED).length; }
  get pendingCount(): number { return this.filteredExpenses.filter(e => e.status === ExpenseStatus.PENDING).length; }
  get rejectedCount(): number { return this.filteredExpenses.filter(e => e.status === ExpenseStatus.REJECTED).length; }
  get approvedAmount(): number { return this.filteredExpenses.filter(e => e.status === ExpenseStatus.APPROVED).reduce((s, e) => s + Number(e.amount || 0), 0); }
  get approvalRate(): number { return this.totalCount > 0 ? Math.round((this.approvedCount / this.totalCount) * 100) : 0; }
  get avgExpenseAmount(): number { return this.totalCount > 0 ? this.totalAmount / this.totalCount : 0; }

  get selectedGroupLabel(): string {
    return this.groupByOptions.find(o => o.value === this.selectedGroupBy)?.label || '';
  }

  get maxBarAmount(): number {
    return Math.max(...this.stats.map(s => s.amount), 1);
  }

  barWidth(amount: number): number {
    return Math.round((amount / this.maxBarAmount) * 100);
  }

  formatAmount(value: number): string {
    if (value >= 1_000_000) return '₦' + (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return '₦' + (value / 1_000).toFixed(0) + 'K';
    return '₦' + value.toLocaleString();
  }

  formatFullAmount(value: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(value);
  }

  getBarColor(index: number): string {
    const colors = ['#0d9488', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#f97316', '#6366f1'];
    return colors[index % colors.length];
  }

  exportCSV(): void {
    this.isExporting = true;
    try {
      const headers = ['Group', 'Total Amount (NGN)', 'Count', 'Approved', 'Pending', 'Rejected', 'Share (%)'];
      const rows = this.stats.map(s => [
        s.label,
        s.amount.toFixed(2),
        s.count,
        s.approved,
        s.pending,
        s.rejected,
        s.percentage
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-report-${this.selectedYear}-${this.selectedGroupBy}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      this.messageService.add({ severity: 'success', summary: 'Exported', detail: 'Report downloaded as CSV.' });
    } finally {
      this.isExporting = false;
    }
  }

  exportDetailedCSV(): void {
    this.isExporting = true;
    try {
      const headers = ['ID', 'Name', 'Date', 'Amount', 'Currency', 'Category', 'Merchant', 'Status', 'Paid By', 'Employee', 'Description'];
      const rows = this.filteredExpenses.map(e => [
        e.id,
        `"${e.name || ''}"`,
        this.parseDate(e.eventDate)?.toLocaleDateString() || '',
        e.amount,
        e.currency,
        (e.category as any)?.name || '',
        (e.merchant as any)?.name || '',
        e.status,
        e.paidBy,
        (e.expenseBy as any)?.fullname || '',
        `"${e.description || ''}"`,
      ]);

      const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-detail-${this.selectedYear}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      this.messageService.add({ severity: 'success', summary: 'Exported', detail: 'Detailed report downloaded.' });
    } finally {
      this.isExporting = false;
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/expenses']);
  }
}