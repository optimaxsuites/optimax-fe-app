import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../service/sales/sales.service';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './sales-dashboard.component.html',
  styleUrls: ['./sales-dashboard.component.scss']
})
export class SalesDashboardComponent implements OnInit, OnDestroy {
  
  // Dashboard Stats
  stats = {
    totalRevenue: 0,
    totalQuotes: 0,
    pendingQuotes: 0,
    acceptedQuotes: 0,
    totalInvoices: 0,
    paidInvoices: 0,
    overdueInvoices: 0,
    totalCustomers: 0
  };
  
  // Recent Data
  recentQuotes: any[] = [];
  recentInvoices: any[] = [];
  topProducts: any[] = [];
  
  // Chart Data
  revenueData: { month: string; amount: number }[] = [];
  
  // Filters
  dateRange = 'month';
  isLoading = true;
  
  private destroy$ = new Subject<void>();

  constructor(private salesService: SalesService) {}

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  getMaxRevenue(): number {
  return Math.max(...this.revenueData.map(d => d.amount));
}

  private loadDashboardData(): void {
    this.isLoading = true;
    
    // Load all dashboard data in parallel
    this.salesService.getDashboardStats(this.dateRange).subscribe({
      next: (stats) => {
        this.stats = stats;
      },
      error: (error) => {
        console.error('Error loading stats:', error);
        this.setMockStats();
      }
    });
    
    this.salesService.getRecentQuotes(5).subscribe({
      next: (quotes) => {
        this.recentQuotes = quotes;
      },
      error: (error) => {
        console.error('Error loading quotes:', error);
        this.setMockQuotes();
      }
    });
    
    this.salesService.getRecentInvoices(5).subscribe({
      next: (invoices) => {
        this.recentInvoices = invoices;
      },
      error: (error) => {
        console.error('Error loading invoices:', error);
        this.setMockInvoices();
      }
    });
    
    this.salesService.getTopProducts(5).subscribe({
      next: (products) => {
        this.topProducts = products;
      },
      error: (error) => {
        console.error('Error loading products:', error);
        this.setMockProducts();
      }
    });
    
    this.salesService.getRevenueChart(this.dateRange).subscribe({
      next: (data) => {
        this.revenueData = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading chart:', error);
        this.setMockChartData();
        this.isLoading = false;
      }
    });
  }

  changeDateRange(range: string): void {
    this.dateRange = range;
    this.loadDashboardData();
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(amount);
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'DRAFT': 'status-draft',
      'SENT': 'status-sent',
      'ACCEPTED': 'status-accepted',
      'DECLINED': 'status-declined',
      'EXPIRED': 'status-expired',
      'PAID': 'status-paid',
      'UNPAID': 'status-unpaid',
      'OVERDUE': 'status-overdue',
      'PENDING': 'status-pending',
      'COMPLETED': 'status-completed'
    };
    return classes[status] || 'status-draft';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'DRAFT': 'Draft',
      'SENT': 'Sent',
      'ACCEPTED': 'Accepted',
      'DECLINED': 'Declined',
      'EXPIRED': 'Expired',
      'PAID': 'Paid',
      'UNPAID': 'Unpaid',
      'OVERDUE': 'Overdue',
      'PENDING': 'Pending',
      'COMPLETED': 'Completed'
    };
    return labels[status] || status;
  }

  // Mock data methods (for development)
  private setMockStats(): void {
    this.stats = {
      totalRevenue: 2845000,
      totalQuotes: 24,
      pendingQuotes: 8,
      acceptedQuotes: 16,
      totalInvoices: 18,
      paidInvoices: 12,
      overdueInvoices: 2,
      totalCustomers: 45
    };
  }

  private setMockQuotes(): void {
    this.recentQuotes = [
      { id: 'QT-001', customerName: 'Mama Nkechi Enterprises', total: 500000, status: 'ACCEPTED', date: new Date('2026-06-10') },
      { id: 'QT-002', customerName: 'Tech Solutions Ltd', total: 1250000, status: 'SENT', date: new Date('2026-06-09') },
      { id: 'QT-003', customerName: 'Global Services NG', total: 350000, status: 'PENDING', date: new Date('2026-06-08') },
      { id: 'QT-004', customerName: 'Furniture Hub', total: 750000, status: 'ACCEPTED', date: new Date('2026-06-07') },
      { id: 'QT-005', customerName: 'Office Supplies Ltd', total: 250000, status: 'DECLINED', date: new Date('2026-06-06') }
    ];
  }

  private setMockInvoices(): void {
    this.recentInvoices = [
      { id: 'INV-001', customerName: 'Mama Nkechi Enterprises', total: 500000, status: 'PAID', dueDate: new Date('2026-06-20') },
      { id: 'INV-002', customerName: 'Tech Solutions Ltd', total: 1250000, status: 'UNPAID', dueDate: new Date('2026-06-25') },
      { id: 'INV-003', customerName: 'Furniture Hub', total: 750000, status: 'PAID', dueDate: new Date('2026-06-15') },
      { id: 'INV-004', customerName: 'Global Services NG', total: 350000, status: 'OVERDUE', dueDate: new Date('2026-06-01') },
      { id: 'INV-005', customerName: 'Office Supplies Ltd', total: 250000, status: 'PENDING', dueDate: new Date('2026-06-28') }
    ];
  }

  private setMockProducts(): void {
    this.topProducts = [
      { name: 'Executive Office Chair', quantity: 45, revenue: 2250000 },
      { name: 'Standing Desk', quantity: 28, revenue: 1400000 },
      { name: 'Laptop - Dell XPS', quantity: 12, revenue: 1800000 },
      { name: 'Conference Table', quantity: 8, revenue: 1200000 },
      { name: 'Printer - HP LaserJet', quantity: 15, revenue: 750000 }
    ];
  }

  private setMockChartData(): void {
    this.revenueData = [
      { month: 'Jan', amount: 450000 },
      { month: 'Feb', amount: 520000 },
      { month: 'Mar', amount: 480000 },
      { month: 'Apr', amount: 610000 },
      { month: 'May', amount: 580000 },
      { month: 'Jun', amount: 2845000 }
    ];
  }
}