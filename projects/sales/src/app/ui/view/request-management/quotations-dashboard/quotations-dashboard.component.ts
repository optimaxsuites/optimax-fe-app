import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { QuotationManagementService } from '../../../service/procurement/quotation-management.service';
import { VendorQuotation } from '../../../domain/procurement-request/procurement.dto';

export interface RFQGroup {
  rfqId: string;
  rfqTitle: string;
  receivedCount: number;
  totalCount: number;
  quotes: VendorQuotation[];
}

@Component({
  selector: 'app-quotations-dashboard',
  templateUrl: './quotations-dashboard.component.html',
  styleUrls: ['./quotations-dashboard.component.scss']
})
export class QuotationsDashboardComponent implements OnInit, OnDestroy {
  Math = Math;
  quotations: VendorQuotation[] = [];
  rfqGroups: RFQGroup[] = [];
  filteredRfqGroups: RFQGroup[] = [];
  paginatedRfqGroups: RFQGroup[] = [];
  selectedRfqGroup: RFQGroup | null = null;
  showVendorSummaryModal = false;
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

  sortField = 'rfqId';
  sortAsc = true;

  statusOptions = [
    { value: 'ALL', label: 'All Requests' },
    { value: 'SUBMITTED', label: 'Submitted', color: '#3b82f6' },
    { value: 'ACCEPTED', label: 'Accepted', color: '#22c55e' },
    { value: 'LPO_GENERATED', label: 'LPO Draft', color: '#184440' },
    { value: 'LPO_SENT', label: 'LPO Sent', color: '#22c55e' },
    { value: 'DECLINED', label: 'Declined', color: '#ef4444' },
    { value: 'PENDING', label: 'Pending', color: '#f59e0b' },
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
  ) { }

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
        this.rfqGroups = this.groupQuotations(this.quotations);
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

  groupQuotations(quotes: VendorQuotation[]): RFQGroup[] {
    const groupsMap = new Map<string, VendorQuotation[]>();
    quotes.forEach(q => {
      const list = groupsMap.get(q.rfqId) || [];
      list.push(q);
      groupsMap.set(q.rfqId, list);
    });

    const groups: RFQGroup[] = [];
    groupsMap.forEach((list, rfqId) => {
      const rfqTitle = list[0]?.rfqTitle || 'Request for Quotation';
      const respondedCount = list.filter(q => q.status === 'SUBMITTED' || q.status === 'ACCEPTED' || q.status === 'DECLINED' || q.status === 'LPO_GENERATED' || q.status === 'LPO_SENT').length;
      groups.push({
        rfqId,
        rfqTitle,
        receivedCount: respondedCount,
        totalCount: list.length,
        quotes: list
      });
    });
    return groups;
  }

  loadMockData(): void {
    this.quotations = [
      {
        id: 'q1',
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        status: 'SUBMITTED',
        items: [
          { id: 'qi1', name: 'Dell XPS 15 Laptop', description: '15-inch i7, 16GB RAM, 512GB SSD', quantity: 2, unitPrice: 150000, totalPrice: 300000, availability: 'AVAILABLE' },
          { id: 'qi2', name: 'HP LaserJet Printer', description: 'Multifunction monochrome printer', quantity: 1, unitPrice: 150000, totalPrice: 150000, availability: 'AVAILABLE' }
        ],
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
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        status: 'ACCEPTED',
        items: [
          { id: 'qi3', name: 'Dell XPS 15 Laptop', description: '15-inch i7, 16GB RAM, 512GB SSD', quantity: 2, unitPrice: 140000, totalPrice: 280000, availability: 'AVAILABLE' },
          { id: 'qi4', name: 'HP LaserJet Printer', description: 'Multifunction monochrome printer', quantity: 1, unitPrice: 140000, totalPrice: 140000, availability: 'AVAILABLE' }
        ],
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
        rfqTitle: 'Office Equipment & IT Hardware',
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
        rfqTitle: 'Premium Ergonomic Chairs',
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
        rfqTitle: 'Premium Ergonomic Chairs',
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
      },
      {
        id: 'q6',
        rfqId: 'RFQ3',
        rfqTitle: 'AWS Cloud Infrastructure Consulting',
        vendorId: 'v6',
        vendorName: 'CloudScale Solutions',
        vendorCode: 'CSS008',
        vendorRating: 4.7,
        status: 'SUBMITTED',
        items: [
          { id: 'qi5', name: 'AWS Solutions Architecture Services', description: 'Migration setup, end-to-end audit, server deployment', quantity: 1, unitPrice: 12000000, totalPrice: 12000000, availability: 'AVAILABLE' }
        ],
        totalAmount: 12000000,
        currency: 'NGN',
        deliveryTimeline: '45 business days',
        validityDays: 60,
        submittedAt: new Date('2026-06-25T11:00:00'),
        updatedAt: new Date('2026-06-25T11:00:00'),
        expiresAt: new Date('2026-08-25T23:59:59'),
        isViewed: false
      },
      {
        id: 'q7',
        rfqId: 'RFQ3',
        rfqTitle: 'AWS Cloud Infrastructure Consulting',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        status: 'PENDING',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        expiresAt: new Date('2026-07-25T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2026-06-26T00:00:00')
      },
      {
        id: 'q8',
        rfqId: 'RFQ4',
        rfqTitle: 'Janitorial & Corporate Cleaning Services',
        vendorId: 'v8',
        vendorName: 'Lagos Clean Services',
        vendorCode: 'LCS009',
        vendorRating: 4.5,
        status: 'ACCEPTED',
        items: [
          { id: 'qi6', name: 'Office Cleaning Services', description: 'Monthly deep sanitisation and cleanup', quantity: 6, unitPrice: 400000, totalPrice: 2400000, availability: 'AVAILABLE' }
        ],
        totalAmount: 2400000,
        currency: 'NGN',
        deliveryTimeline: 'Recurring Monthly',
        validityDays: 90,
        submittedAt: new Date('2026-06-20T09:00:00'),
        updatedAt: new Date('2026-06-21T10:00:00'),
        expiresAt: new Date('2026-09-20T23:59:59'),
        isViewed: true
      },
      {
        id: 'q9',
        rfqId: 'RFQ4',
        rfqTitle: 'Janitorial & Corporate Cleaning Services',
        vendorId: 'v5',
        vendorName: 'Express Logistics & Supply',
        vendorCode: 'ELS004',
        vendorRating: 4.2,
        status: 'DECLINED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        declineReason: 'Out of region service region limitations',
        submittedAt: new Date('2026-06-18T16:45:00'),
        updatedAt: new Date('2026-06-18T16:45:00'),
        expiresAt: new Date('2026-07-02T23:59:59'),
        isViewed: true
      },
      {
        id: 'q10',
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v10',
        vendorName: 'Comfort Seatings Ltd',
        vendorCode: 'CSL010',
        vendorRating: 4.6,
        status: 'SUBMITTED',
        items: [
          { id: 'qi7', name: 'High-Back Ergonomic Desk Chairs', description: 'Adjustable dynamic mesh lumbar support chairs', quantity: 20, unitPrice: 90000, totalPrice: 1800000, availability: 'AVAILABLE' }
        ],
        totalAmount: 1800000,
        currency: 'NGN',
        deliveryTimeline: '10 business days',
        validityDays: 30,
        submittedAt: new Date('2026-06-28T14:00:00'),
        updatedAt: new Date('2026-06-28T14:00:00'),
        expiresAt: new Date('2026-07-28T23:59:59'),
        isViewed: false
      },
      {
        id: 'q11',
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        vendorRating: 4.4,
        status: 'SUBMITTED',
        items: [
          { id: 'qi8', name: 'High-Back Ergonomic Desk Chairs', description: 'Adjustable dynamic mesh lumbar support chairs', quantity: 20, unitPrice: 97500, totalPrice: 1950000, availability: 'AVAILABLE' }
        ],
        totalAmount: 1950000,
        currency: 'NGN',
        deliveryTimeline: '7 business days',
        validityDays: 14,
        submittedAt: new Date('2026-06-29T15:30:00'),
        updatedAt: new Date('2026-06-29T15:30:00'),
        expiresAt: new Date('2026-07-13T23:59:59'),
        isViewed: false
      },
      {
        id: 'q12',
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        status: 'EXPIRED',
        items: [],
        totalAmount: 0,
        currency: 'NGN',
        deliveryTimeline: '',
        validityDays: 0,
        expiresAt: new Date('2026-06-30T23:59:59'),
        isViewed: false,
        updatedAt: new Date('2026-06-15T00:00:00')
      }
    ];
    this.rfqGroups = this.groupQuotations(this.quotations);
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
    let filtered = [...this.rfqGroups];

    if (this.selectedStatus !== 'ALL') {
      filtered = filtered.filter(g => g.quotes.some(q => q.status === this.selectedStatus));
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(g =>
        g.rfqId.toLowerCase().includes(term) ||
        g.rfqTitle.toLowerCase().includes(term)
      );
    }

    if (this.dateFrom) {
      const from = new Date(this.dateFrom);
      filtered = filtered.filter(g => g.quotes.some(q => q.submittedAt && new Date(q.submittedAt) >= from));
    }

    if (this.dateTo) {
      const to = new Date(this.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(g => g.quotes.some(q => q.submittedAt && new Date(q.submittedAt) <= to));
    }

    // Sort
    if (this.sortField) {
      filtered.sort((a, b) => {
        let valA: any;
        let valB: any;

        if (this.sortField === 'rfqId') {
          valA = a.rfqId;
          valB = b.rfqId;
        } else if (this.sortField === 'rfqTitle') {
          valA = a.rfqTitle;
          valB = b.rfqTitle;
        } else if (this.sortField === 'receivedCount') {
          valA = a.receivedCount;
          valB = b.receivedCount;
        } else {
          valA = a.rfqId;
          valB = b.rfqId;
        }

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') {
          valA = valA.toLowerCase();
          valB = String(valB).toLowerCase();
        }

        if (valA < valB) return this.sortAsc ? -1 : 1;
        if (valA > valB) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    this.filteredRfqGroups = filtered;
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
    this.totalElements = this.filteredRfqGroups.length;
    this.totalPages = Math.ceil(this.totalElements / this.pageSize);
    this.paginatedRfqGroups = this.filteredRfqGroups.slice(
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
      'WITHDRAWN': 'status-withdrawn',
      'LPO_GENERATED': 'status-accepted',
      'LPO_SENT': 'status-accepted'
    };
    return classes[status] || 'status-expired';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'PENDING': 'Pending',
      'SUBMITTED': 'Submitted',
      'ACCEPTED': 'Accepted',
      'DECLINED': 'Declined',
      'EXPIRED': 'Expired',
      'WITHDRAWN': 'Withdrawn',
      'LPO_GENERATED': 'LPO Draft',
      'LPO_SENT': 'LPO Sent'
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
      'WITHDRAWN': 'fa-times',
      'LPO_GENERATED': 'fa-file-invoice',
      'LPO_SENT': 'fa-paper-plane'
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

  openVendorSummary(group: RFQGroup): void {
    this.selectedRfqGroup = group;
    this.showVendorSummaryModal = true;
  }

  closeVendorSummary(): void {
    this.showVendorSummaryModal = false;
    this.selectedRfqGroup = null;
  }

}