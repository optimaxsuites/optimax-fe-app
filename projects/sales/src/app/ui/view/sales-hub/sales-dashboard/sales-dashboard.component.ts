import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SalesService } from '../../../service/sales/sales.service';

import { SharedOverlayModule } from '../../../../shared-overlay.module';
import { QuoteFormComponent } from '../quotations/quote-form/quote-form.component';
import { InvoiceFormComponent } from '../invoices/invoice-form/invoice-form.component';
import { CustomerFormComponent } from '../customer-management/customer-form/customer-form.component';
import { QuoteDetailComponent } from '../quotations/quote-detail/quote-detail.component';
import { InvoiceDetailComponent } from '../invoices/invoice-detail/invoice-detail.component';
import { formatApiDate } from '../../../service/sales/date.util';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

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
    InvoiceDetailComponent,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './sales-dashboard.component.html',
  styleUrls: ['./sales-dashboard.component.scss']
})
export class SalesDashboardComponent implements OnInit, OnDestroy {
  Math = Math;
  customerAvatars: string[] = ['AO', 'FA', 'WL', 'KP'];

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
  error: string | null = null;

  showQuoteModal = false;
  showInvoiceModal = false;
  showCustomerModal = false;
  showProductModal = false;
  showQuoteDetail = false;
  showInvoiceDetail = false;
  selectedItemId?: string;

  // Customization
  showCustomizationModal = false;
  customization = {
    showRevenueChart: true,
    showTopProducts: true,
    showRecentQuotes: true,
    showRecentInvoices: true,
    chartType: 'bar' // 'bar' | 'line' | 'pie' | 'doughnut'
  };

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
    private messageService: MessageService,
    private salesService: SalesService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.loadCustomization();
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
    this.error = null;

    this.salesService.getDashboardStats(this.dateRange).subscribe({
      next: (stats: any) => { this.stats = stats; },
      error: (error: any) => {
        console.error('Error loading stats:', error);
        this.error = 'Failed to load sales dashboard data';
      }
    });

    this.salesService.getRecentQuotes(3).subscribe({
      next: (quotes: any[]) => { this.recentQuotes = quotes.slice(0, 3); },
      error: (error: any) => { console.error('Error loading quotes:', error); }
    });

    this.salesService.getRecentInvoices(3).subscribe({
      next: (invoices: any[]) => { this.recentInvoices = invoices.slice(0, 3); },
      error: (error: any) => { console.error('Error loading invoices:', error); }
    });

    this.salesService.getTopProducts(3).subscribe({
      next: (products: any[]) => { this.topProducts = products.slice(0, 3); },
      error: (error: any) => { console.error('Error loading products:', error); }
    });

    this.salesService.getRevenueChart(this.dateRange).subscribe({
      next: (data: any[]) => { this.revenueData = data; this.isLoading = false; },
      error: (error: any) => {
        console.error('Error loading chart:', error);
        this.error = 'Failed to load sales dashboard data';
        this.isLoading = false;
      }
    });
  }

  refreshData(): void {
    this.loadDashboardData();
  }

  changeDateRange(range: string): void {
    this.dateRange = range;
    this.loadDashboardData();
  }

  // ============================================
  // NAVIGATION METHODS (Like HR Loans pattern)
  // ============================================

  private switchToTab(tabName: string): void {
    sessionStorage.setItem('dashboard-catalog-quotes-invoices-orders-customers', tabName);
    const uuid = this.route.snapshot.paramMap.get('uuid');
    const path = uuid ? ['/admin/sales/sales-hub', uuid] : ['/admin/sales/sales-hub'];
    this.router.navigate(path).then(() => {
      window.location.reload();
    });
  }

  navigateToNewQuote(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/quotes/new', uuid]);
    } else {
      this.router.navigate(['/admin/sales/quotes/new']);
    }
  }

  navigateToNewInvoice(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/invoices/new', uuid]);
    } else {
      this.router.navigate(['/admin/sales/invoices/new']);
    }
  }

  navigateToNewCustomer(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/customers/new', uuid]);
    } else {
      this.router.navigate(['/admin/sales/customers/new']);
    }
  }

  navigateToNewProduct(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/products/new', uuid]);
    } else {
      this.router.navigate(['/admin/sales/products/new']);
    }
  }

  navigateToQuoteList(): void {
    this.switchToTab('Quotes');
  }

  navigateToInvoiceList(): void {
    this.switchToTab('Invoices');
  }

  navigateToProductList(): void {
    this.switchToTab('Catalog');
  }

  navigateToCustomerList(): void {
    this.switchToTab('Customers');
  }

  navigateToQuoteDetail(quoteId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/quotes', quoteId, uuid]);
    } else {
      this.router.navigate(['/admin/sales/quotes', quoteId]);
    }
  }

  navigateToInvoiceDetail(invoiceId: string): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate(['/admin/sales/invoices', invoiceId, uuid]);
    } else {
      this.router.navigate(['/admin/sales/invoices', invoiceId]);
    }
  }

  openEditInvoiceModal(id: string): void {
    this.selectedItemId = id;
    this.showInvoiceModal = true;
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
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Product Name and SKU are required' });
      return;
    }
    this.isSavingProduct = true;
    this.salesService.createProduct(this.productForm as any).subscribe({
      next: () => {
        this.isSavingProduct = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Product created successfully!' });
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
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to create product.' });
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
    return formatApiDate(date);
  }

  getStatusClass(status: string): string {
    return status ? status.toLowerCase() : 'draft';
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
  // CUSTOMIZATION & DYNAMIC CHART HELPERS
  // ============================================

  openCustomizationModal(): void {
    this.showCustomizationModal = true;
  }

  closeCustomizationModal(): void {
    this.showCustomizationModal = false;
  }

  saveCustomization(): void {
    localStorage.setItem('sales_dashboard_customization', JSON.stringify(this.customization));
  }

  loadCustomization(): void {
    const saved = localStorage.getItem('sales_dashboard_customization');
    if (saved) {
      try {
        this.customization = JSON.parse(saved);
      } catch (e) {
        console.error('Error parsing customization', e);
      }
    }
  }

  // getPointX(idx: number): number {
  //   const width = 440; // 480 - 40
  //   const count = this.revenueData.length || 1;
  //   const step = count > 1 ? width / (count - 1) : width;
  //   return 40 + idx * step;
  // }

  // getPointY(amount: number): number {
  //   const height = 140; // 160 - 20
  //   const max = this.getMaxRevenue() || 1;
  //   return 160 - (amount / max) * height;
  // }

  getLineChartPath(): string {
    if (!this.revenueData || this.revenueData.length === 0) return '';
    return this.revenueData.map((d, i) => {
      const x = this.getPointX(i);
      const y = this.getPointY(d.amount);
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    }).join(' ');
  }

  // getLineChartAreaPath(): string {
  //   const path = this.getLineChartPath();
  //   if (!path) return '';
  //   const firstX = this.getPointX(0);
  //   const lastX = this.getPointX(this.revenueData.length - 1);
  //   return `${path} L${lastX} 160 L${firstX} 160 Z`;
  // }

  getConicGradient(): string {
    if (!this.revenueData || this.revenueData.length === 0) return 'conic-gradient(#2E6276 0% 100%)';
    const total = this.revenueData.reduce((sum, d) => sum + d.amount, 0) || 1;
    let accumulatedPercent = 0;
    const colors = ['#2E6276', '#3a8fa8', '#2EB270', '#fbbf24', '#f97316', '#4f46e5'];
    const parts = this.revenueData.map((d, i) => {
      const percent = (d.amount / total) * 100;
      accumulatedPercent += percent;
      return `${colors[i % colors.length]} ${accumulatedPercent.toFixed(1)}%`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  getConicLegendColor(idx: number): string {
    const colors = ['#2E6276', '#3a8fa8', '#2EB270', '#fbbf24', '#f97316', '#4f46e5'];
    return colors[idx % colors.length];
  }

  getBarColor(idx: number): string {
    return this.getConicLegendColor(idx);
  }

  /** Resolves a display name off a quote/invoice's customerName/customerId, whichever is populated. */
  getCustomerName(item: any): string {
    if (!item) return 'N/A';
    if (typeof item.customerName === 'object' && item.customerName?.name) {
      return item.customerName.name;
    }
    if (typeof item.customerId === 'object' && item.customerId?.name) {
      return item.customerId.name;
    }
    return String(item.customerName || item.customerId || 'N/A');
  }

  getConicPercent(amount: number): string {
    const total = this.revenueData.reduce((sum, d) => sum + d.amount, 0) || 1;
    return ((amount / total) * 100).toFixed(1) + '%';
  }

  getInsightMetrics(): any[] {
    const totalRevenue = this.stats.totalRevenue;

    return [
      {
        label: 'Revenue Growth',
        value: this.formatCurrency(totalRevenue),
        trend: 'up',
        percent: 12.8,
        color: '#2E6276'
      },
      {
        label: 'Conversion Rate',
        value: `${this.stats.totalQuotes > 0 ? Math.round((this.stats.acceptedQuotes / this.stats.totalQuotes) * 100) : 0}%`,
        trend: 'up',
        percent: 5.2,
        color: '#2EB270'
      },
      {
        label: 'Average Deal Size',
        value: this.formatCurrency(this.stats.totalQuotes > 0 ? this.stats.totalRevenue / this.stats.totalQuotes : 0),
        trend: 'up',
        percent: 8.7,
        color: '#F5A623'
      },
      {
        label: 'Payment Collection',
        value: `${this.stats.totalInvoices > 0 ? Math.round((this.stats.paidInvoices / this.stats.totalInvoices) * 100) : 0}%`,
        trend: 'down',
        percent: 2.3,
        color: '#8B5CF6'
      }
    ];
  }

  // Update the getLineChartAreaPath method for the polygon area
  getLineChartAreaPath(): string {
    if (!this.revenueData || this.revenueData.length === 0) return '';
    const points = this.revenueData.map((d, i) => {
      const x = this.getPointX(i);
      const y = this.getPointY(d.amount);
      return `${x},${y}`;
    }).join(' ');
    const firstX = this.getPointX(0);
    const lastX = this.getPointX(this.revenueData.length - 1);
    return `${firstX},260 ${points} ${lastX},260`;
  }

  // Ensure getPointX returns correct values for the SVG
  getPointX(idx: number): number {
    const width = 440; // 480 - 40 (padding)
    const count = this.revenueData.length || 1;
    const step = count > 1 ? width / (count - 1) : width;
    return 40 + idx * step;
  }

  // Ensure getPointY returns correct values for the SVG
  getPointY(amount: number): number {
    const height = 200; // 260 - 60 (padding)
    const max = this.getMaxRevenue() || 1;
    return 260 - (amount / max) * height;
  }

  getChartCallouts(): any[] {
    if (!this.revenueData || this.revenueData.length === 0) return [];
    const total = this.revenueData.reduce((sum, d) => sum + d.amount, 0) || 1;
    let accumulatedPercent = 0;
    const colors = ['#2E6276', '#3a8fa8', '#2EB270', '#fbbf24', '#f97316', '#4f46e5'];
    
    const cx = 290;
    const cy = 180;
    const R = 125; // Chart radius matches 250px width/height circle
    const d1 = 20; // Length of diagonal extension
    
    return this.revenueData.map((d, i) => {
      const percent = (d.amount / total) * 100;
      const startPercent = accumulatedPercent;
      accumulatedPercent += percent;
      const endPercent = accumulatedPercent;
      
      const midPercent = (startPercent + endPercent) / 2;
      const midAngleRad = (midPercent / 100) * 2 * Math.PI - Math.PI / 2;
      
      const cos = Math.cos(midAngleRad);
      const sin = Math.sin(midAngleRad);
      
      // Start point at circle outer boundary
      const x0 = cx + R * cos;
      const y0 = cy + R * sin;
      
      // Bend point (diagonal pointer extension)
      const x1 = cx + (R + d1) * cos;
      const y1 = cy + (R + d1) * sin;
      
      // Horizontal connector end
      const isRight = cos >= 0;
      const x2 = isRight ? x1 + 25 : x1 - 25;
      const y2 = y1;
      
      const linePath = `M ${x0.toFixed(1)},${y0.toFixed(1)} L ${x1.toFixed(1)},${y1.toFixed(1)} H ${x2.toFixed(1)}`;
      const textX = isRight ? x2 + 6 : x2 - 6;
      const textY = y2;
      
      return {
        linePath,
        textX,
        textY,
        textAnchor: isRight ? 'start' : 'end',
        label: d.month,
        amount: this.formatCurrency(d.amount).replace('NGN', '₦'),
        percent: ((d.amount / total) * 100).toFixed(1) + '%',
        color: colors[i % colors.length]
      };
    });
  }
}