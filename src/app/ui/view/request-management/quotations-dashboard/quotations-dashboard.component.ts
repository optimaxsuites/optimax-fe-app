import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { QuotationManagementService } from '../../../service/procurement/quotation-management.service';
import { VendorQuotation } from '../../../domain/procurement-request/procurement.dto';

@Component({
  selector: 'app-quotations-dashboard',
  templateUrl: './quotations-dashboard.component.html',
  styleUrls: ['./quotations-dashboard.component.scss']
})
export class QuotationsDashboardComponent implements OnInit, OnDestroy {
  Math = Math;
  quotations: VendorQuotation[] = [];
  filteredQuotations: VendorQuotation[] = [];
  paginatedQuotations: VendorQuotation[] = [];
  selectedQuotations: VendorQuotation[] = [];
  isLoading = false;

  selectedStatus: string = 'ALL';
  searchTerm: string = '';
  dateRange: string = 'month';
  dateFrom: string = '';
  dateTo: string = '';

  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;

  sortField = 'submittedAt';
  sortAsc = false;
  
  statusOptions = [
    { value: 'ALL', label: 'All Quotations' },
    { value: 'SUBMITTED', label: 'Submitted', color: '#3b82f6' },
    { value: 'ACCEPTED', label: 'Accepted', color: '#22c55e' },
    { value: 'DECLINED', label: 'Declined', color: '#ef4444' },
    { value: 'PENDING', label: 'Pending Response', color: '#f59e0b' },
    { value: 'EXPIRED', label: 'Expired', color: '#6b7280' }
  ];

  stats = {
    total: 0,
    pending: 0,
    submitted: 0,
    accepted: 0,
    declined: 0,
    expired: 0
  };

  private destroy$ = new Subject<void>();

  constructor(
    private quotationService: QuotationManagementService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadQuotations();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQuotations(): void {
    this.isLoading = true;
    this.quotationService.getQuotationsDashboard().pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.quotations = data.quotations;
        this.calculateStats();
        this.applyFilters();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading quotations:', err);
        this.isLoading = false;
        // Load mock data for demo
        this.loadMockData();
      }
    });
  }

  loadMockData(): void {
    this.quotations = [
      {
        id: 'q1',
        rfqId: 'RFQ1',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        status: 'SUBMITTED',
        items: [],
        totalAmount: 450000,
        currency: 'NGN',
        deliveryTimeline: '5-7 business days',
        validityDays: 14,
        submittedAt: new Date('2024-01-15T10:30:00'),
        updatedAt: new Date('2024-01-15T10:30:00'),
        expiresAt: new Date('2024-01-29T23:59:59'),
        isViewed: false
      },
      {
        id: 'q2',
        rfqId: 'RFQ1',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        status: 'ACCEPTED',
        items: [],
        totalAmount: 420000,
        currency: 'NGN',
        deliveryTimeline: '3-5 business days',
        validityDays: 30,
        submittedAt: new Date('2024-01-14T14:20:00'),
        updatedAt: new Date('2024-01-16T09:00:00'),
        expiresAt: new Date('2024-02-13T23:59:59'),
        isViewed: true
      },
      {
        id: 'q3',
        rfqId: 'RFQ1',
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        vendorRating: 4.4,
        status: 'DECLINED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        declineReason: 'Unable to meet delivery timeline',
        submittedAt: new Date('2024-01-13T08:15:00'),
        updatedAt: new Date('2024-01-13T08:15:00'),
        expiresAt: new Date('2024-01-27T23:59:59'),
        isViewed: true
      },
      {
        id: 'q4',
        rfqId: 'RFQ2',
        vendorId: 'v4',
        vendorName: 'Premium Electronics Hub',
        vendorCode: 'PEH005',
        vendorRating: 4.9,
        status: 'PENDING',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 7,
        expiresAt: new Date('2026-01-30T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2026-01-16T00:00:00')
      },
      {
        id: 'q5',
        rfqId: 'RFQ2',
        vendorId: 'v5',
        vendorName: 'Express Logistics & Supply',
        vendorCode: 'ELS004',
        vendorRating: 4.2,
        status: 'EXPIRED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 7,
        expiresAt: new Date('2026-12-10T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2024-01-11T00:00:00')
      }
    ];
    this.calculateStats();
    this.applyFilters();
  }

  calculateStats(): void {
    this.stats.total = this.quotations.length;
    this.stats.pending = this.quotations.filter(q => q.status === 'PENDING').length;
    this.stats.submitted = this.quotations.filter(q => q.status === 'SUBMITTED').length;
    this.stats.accepted = this.quotations.filter(q => q.status === 'ACCEPTED').length;
    this.stats.declined = this.quotations.filter(q => q.status === 'DECLINED').length;
    this.stats.expired = this.quotations.filter(q => q.status === 'EXPIRED').length;
  }

  applyFilters(): void {
    let filtered = [...this.quotations];
    
    if (this.selectedStatus !== 'ALL') {
      filtered = filtered.filter(q => q.status === this.selectedStatus);
    }
    
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(q => 
        q.vendorName.toLowerCase().includes(term) ||
        q.vendorCode.toLowerCase().includes(term) ||
        q.rfqId.toLowerCase().includes(term)
      );
    }

    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      filtered = filtered.filter(q => q.submittedAt && new Date(q.submittedAt) >= from);
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(q => q.submittedAt && new Date(q.submittedAt) <= to);
    }

    // Sort
    if (this.sortField) {
      filtered.sort((a, b) => {
        let valA = (a as any)[this.sortField];
        let valB = (b as any)[this.sortField];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (valA instanceof Date) valA = valA.getTime();
        if (valB instanceof Date) valB = valB.getTime();

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }
    
    this.filteredQuotations = filtered;
    this.currentPage = 0;
    this.updatePagination();
  }

  changeDateRange(range: string): void {
    this.dateRange = range;
    const now = new Date();
    let fromDate = new Date();
    if (range === 'week') {
      fromDate.setDate(now.getDate() - 7);
    } else if (range === 'month') {
      fromDate.setMonth(now.getMonth() - 1);
    } else if (range === 'quarter') {
      fromDate.setMonth(now.getMonth() - 3);
    } else if (range === 'year') {
      fromDate.setFullYear(now.getFullYear() - 1);
    }
    this.dateFrom = fromDate.toISOString().split('T')[0];
    this.dateTo = now.toISOString().split('T')[0];
    this.applyFilters();
  }

  resetFilters(): void {
    this.selectedStatus = 'ALL';
    this.searchTerm = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilters();
  }

  setSort(field: string): void {
    if (this.sortField === field) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortField = field;
      this.sortAsc = true;
    }
    this.applyFilters();
  }

  getSortIcon(field: string): string {
    if (this.sortField !== field) {
      return 'fa-sort';
    }
    return this.sortAsc ? 'fa-sort-up' : 'fa-sort-down';
  }

  // Checkbox helpers
  isAllSelected(): boolean {
    return this.filteredQuotations.length > 0 && this.selectedQuotations.length === this.filteredQuotations.length;
  }

  isSomeSelected(): boolean {
    return this.selectedQuotations.length > 0 && this.selectedQuotations.length < this.filteredQuotations.length;
  }

  isSelected(id: string): boolean {
    return this.selectedQuotations.some(q => q.id === id);
  }

  toggleSelection(id: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    const quote = this.filteredQuotations.find(q => q.id === id);
    if (!quote) return;

    if (checked) {
      if (!this.isSelected(id)) {
        this.selectedQuotations.push(quote);
      }
    } else {
      this.selectedQuotations = this.selectedQuotations.filter(q => q.id !== id);
    }
  }

  toggleSelectAll(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    if (checked) {
      this.selectedQuotations = [...this.filteredQuotations];
    } else {
      this.selectedQuotations = [];
    }
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.updatePagination();
  }

  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 0;
    this.updatePagination();
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 0; i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  updatePagination(): void {
    this.totalElements = this.filteredQuotations.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);
    this.paginatedQuotations = this.filteredQuotations.slice(
      this.currentPage * this.pageSize,
      (this.currentPage + 1) * this.pageSize
    );
  }

  onStatusFilter(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  onSearch(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.applyFilters();
  }

  viewQuotationDetail(quotationId: string): void {
    this.router.navigate(['/commerce/quotations', quotationId]);
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      'PENDING': 'status-pending',
      'SUBMITTED': 'status-submitted',
      'ACCEPTED': 'status-accepted',
      'DECLINED': 'status-declined',
      'EXPIRED': 'status-expired',
      'WITHDRAWN': 'status-withdrawn'
    };
    return classes[status] || 'status-expired';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pending Response',
      'SUBMITTED': 'Submitted',
      'ACCEPTED': 'Accepted',
      'DECLINED': 'Declined',
      'EXPIRED': 'Expired',
      'WITHDRAWN': 'Withdrawn'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      'PENDING': 'fa-clock',
      'SUBMITTED': 'fa-paper-plane',
      'ACCEPTED': 'fa-check-circle',
      'DECLINED': 'fa-times-circle',
      'EXPIRED': 'fa-hourglass-end',
      'WITHDRAWN': 'fa-times'
    };
    return icons[status] || 'fa-circle';
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: currency || 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getDaysRemaining(expiresAt: Date): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  isExpired(expiresAt: Date): boolean {
    return new Date(expiresAt) < new Date();
  }
}