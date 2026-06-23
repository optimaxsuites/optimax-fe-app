import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../service/sales/sales.service';

import { SharedOverlayModule } from '../../../../shared-overlay.module';
import { QuoteFormComponent } from '../quotations/quote-form/quote-form.component';
import { InvoiceFormComponent } from '../invoices/invoice-form/invoice-form.component';
import { CustomerFormComponent } from '../customer-management/customer-form/customer-form.component';
import { QuoteDetailComponent } from '../quotations/quote-detail/quote-detail.component';
import { InvoiceDetailComponent } from '../invoices/invoice-detail/invoice-detail.component';

@Component({
  selector: 'app-sales-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    SharedOverlayModule,
    QuoteFormComponent,
    InvoiceFormComponent,
    CustomerFormComponent,
    QuoteDetailComponent,
    InvoiceDetailComponent
  ],
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

  showQuoteModal = false;
  showInvoiceModal = false;
  showCustomerModal = false;
  showProductModal = false;
  showQuoteDetail = false;
  showInvoiceDetail = false;
  selectedItemId?: string;

  // Simple Product Form Data
  productForm = {
    name: '',
    sku: '',
    description: '',
    unitPrice: 0,
    costPrice: 0,
    currency: 'NGN',
    stockQuantity: 10,
    category: 'General',
    taxRate: 7.5
  };
  isSavingProduct = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private salesService: SalesService,
    private router: Router
  ) {}

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
    
    this.salesService.getDashboardStats(this.dateRange).subscribe({
      next: (stats: any) => {
        this.stats = stats;
      },
      error: (error: any) => {
        console.error('Error loading stats:', error);
        this.setMockStats();
      }
    });
    
    this.salesService.getRecentQuotes(5).subscribe({
      next: (quotes: any[]) => {
        this.recentQuotes = quotes;
      },
      error: (error: any) => {
        console.error('Error loading quotes:', error);
        this.setMockQuotes();
      }
    });
    
    this.salesService.getRecentInvoices(5).subscribe({
      next: (invoices: any[]) => {
        this.recentInvoices = invoices;
      },
      error: (error: any) => {
        console.error('Error loading invoices:', error);
        this.setMockInvoices();
      }
    });
    
    this.salesService.getTopProducts(5).subscribe({
      next: (products: any[]) => {
        this.topProducts = products;
      },
      error: (error: any) => {
        console.error('Error loading products:', error);
        this.setMockProducts();
      }
    });
    
    this.salesService.getRevenueChart(this.dateRange).subscribe({
      next: (data: any[]) => {
        this.revenueData = data;
        this.isLoading = false;
      },
      error: (error: any) => {
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

  // ============================================
  // NAVIGATION METHODS (Like HR Loans pattern)
  // ============================================
  
  navigateToNewQuote(): void {
    this.selectedItemId = undefined;
    this.showQuoteModal = true;
  }

  navigateToNewInvoice(): void {
    this.selectedItemId = undefined;
    this.showInvoiceModal = true;
  }

  navigateToNewCustomer(): void {
    this.showCustomerModal = true;
  }

  navigateToNewProduct(): void {
    this.showProductModal = true;
  }

  navigateToQuoteList(): void {
    this.router.navigate(['/sales/quotes']);
  }

  navigateToInvoiceList(): void {
    this.router.navigate(['/sales/invoices']);
  }

  navigateToProductList(): void {
    this.router.navigate(['/sales/products']);
  }

  navigateToQuoteDetail(quoteId: string): void {
    this.selectedItemId = quoteId;
    this.showQuoteDetail = true;
  }

  navigateToInvoiceDetail(invoiceId: string): void {
    this.selectedItemId = invoiceId;
    this.showInvoiceDetail = true;
  }

  closeQuoteModal(): void {
    this.showQuoteModal = false;
    this.selectedItemId = undefined;
  }

  closeInvoiceModal(): void {
    this.showInvoiceModal = false;
    this.selectedItemId = undefined;
  }

  closeCustomerModal(): void {
    this.showCustomerModal = false;
  }

  closeProductModal(): void {
    this.showProductModal = false;
  }

  closeQuoteDetail(): void {
    this.showQuoteDetail = false;
    this.selectedItemId = undefined;
  }

  closeInvoiceDetail(): void {
    this.showInvoiceDetail = false;
    this.selectedItemId = undefined;
  }

  onQuoteSaved(): void {
    this.closeQuoteModal();
    this.loadDashboardData();
  }

  onInvoiceSaved(): void {
    this.closeInvoiceModal();
    this.loadDashboardData();
  }

  onCustomerSaved(): void {
    this.closeCustomerModal();
    this.loadDashboardData();
  }

  saveProduct(): void {
    if (!this.productForm.name || !this.productForm.sku) {
      alert('Product Name and SKU are required');
      return;
    }
    this.isSavingProduct = true;
    this.salesService.createProduct(this.productForm).subscribe({
      next: () => {
        this.isSavingProduct = false;
        alert('Product created successfully!');
        this.showProductModal = false;
        this.productForm = {
          name: '',
          sku: '',
          description: '',
          unitPrice: 0,
          costPrice: 0,
          currency: 'NGN',
          stockQuantity: 10,
          category: 'General',
          taxRate: 7.5
        };
        this.loadDashboardData();
      },
      error: (err) => {
        console.error(err);
        this.isSavingProduct = false;
        alert('Failed to create product.');
      }
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

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

  // ============================================
  // MOCK DATA (for development)
  // ============================================

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