import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { QuotationManagementService } from '../../../service/procurement/quotation-management.service';
import { VendorQuotation, VendorQuotationStatus } from '../../../domain/procurement-request/procurement.dto';
import { ExtendedProcurementRequest } from '../../../service/procurement/rfq-quotation-bridge.util';

export interface LocalRFQWithQuotations {
  rfq: ExtendedProcurementRequest;
  quotations: VendorQuotation[];
  summary: any;
}

@Component({
  selector: 'app-rfq-detail-with-quotations',
  templateUrl: './rfq-detail-with-quotations.component.html',
  styleUrls: ['./rfq-detail-with-quotations.component.scss']
})
export class RfqDetailWithQuotationsComponent implements OnInit, OnDestroy {
  rfqId: string | null = null;
  rfqData: LocalRFQWithQuotations | null = null;
  isLoading = false;
  showVendorSummaryModal = false;
  selectedQuotation: VendorQuotation | null = null;
  showQuotationDetailModal = false;
  isProcessing = false;

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private quotationService: QuotationManagementService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.rfqId = params.get('id');
      if (this.rfqId) {
        this.loadRFQDetails();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRFQDetails(): void {
    if (!this.rfqId) return;

    this.isLoading = true;
    this.quotationService.getQuotationsForRFQ(this.rfqId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.rfqData = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading RFQ details:', err);
        this.isLoading = false;
        this.loadMockData();
      }
    });
  }

  loadMockData(): void {
    this.rfqData = {
      rfq: {
        id: Number(this.rfqId) || 1,
        customerId: 'cust1',
        customerName: 'Optimax Industries',
        procurementType: 'PRODUCT',
        title: 'Office Equipment & IT Hardware',
        description: 'Procurement of laptops, printers, and office furniture',
        items: [
          {
            id: 1,
            name: 'Dell XPS 15 Laptop',
            description: '15-inch laptop with i7 processor',
            quantity: 10,
            unit: 'Pieces',
            estimatedBudget: 1500000
          },
          {
            id: 2,
            name: 'HP LaserJet Printer',
            description: 'Multifunction laser printer',
            quantity: 5,
            unit: 'Pieces',
            estimatedBudget: 500000
          }
        ],
        totalBudget: 2000000,
        currency: 'NGN',
        status: 'VENDORS_QUOTING',
        createdAt: new Date('2024-01-10'),
        createdBy: 'ADMIN',
        updatedAt: new Date('2024-01-10'),
        updatedBy: 'ADMIN',
        suggestedVendorIds: [],
        suggestedVendors: [],
        selectedVendorId: '',
        selectedVendorName: '',
        selectedQuotationId: '',
        approvalStatus: 'APPROVED',
        approvedBy: 'ADMIN',
        approvedAt: new Date(),
        rfqExpiryDate: new Date('2024-01-30')
      },
      quotations: [
        {
          id: 1,
          quotationId: 'q1',
          rfqId: this.rfqId || 'rfq1',
          vendorId: 'v1',
          vendorName: 'TechPro Solutions Ltd',
          vendorCode: 'TPS001',
          vendorRating: 4.8,
          status: 'SUBMITTED',
          items: [
            { id: 'qi1' as any, name: 'Dell XPS 15', description: '15-inch i7 laptop', quantity: 10, unitPrice: 145000, totalPrice: 1450000, availability: 'AVAILABLE' },
            { id: 'qi2' as any, name: 'HP LaserJet', description: 'Multifunction printer', quantity: 5, unitPrice: 95000, totalPrice: 475000, availability: 'AVAILABLE' }
          ],
          totalAmount: 1925000,
          currency: 'NGN',
          deliveryTimeline: '5-7 business days',
          validityDays: 14,
          submittedAt: new Date('2024-01-15T10:30:00'),
          updatedAt: new Date('2024-01-15T10:30:00'),
          expiresAt: new Date('2024-01-29T23:59:59'),
          isViewed: false
        },
        {
          id: 2,
          quotationId: 'q2',
          rfqId: this.rfqId || 'rfq1',
          vendorId: 'v2',
          vendorName: 'Global Supplies Inc',
          vendorCode: 'GSI002',
          vendorRating: 4.6,
          status: 'ACCEPTED',
          items: [
            { id: 'qi3' as any, name: 'Dell XPS 15', description: '15-inch i7 laptop', quantity: 10, unitPrice: 142000, totalPrice: 1420000, availability: 'AVAILABLE' },
            { id: 'qi4' as any, name: 'HP LaserJet', description: 'Multifunction printer', quantity: 5, unitPrice: 88000, totalPrice: 440000, availability: 'AVAILABLE' }
          ],
          totalAmount: 1860000,
          currency: 'NGN',
          deliveryTimeline: '3-5 business days',
          validityDays: 30,
          submittedAt: new Date('2024-01-14T14:20:00'),
          updatedAt: new Date('2024-01-16T09:00:00'),
          expiresAt: new Date('2024-02-13T23:59:59'),
          isViewed: true
        },
        {
          id: 3,
          quotationId: 'q3',
          rfqId: this.rfqId || 'rfq1',
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
          declineReason: 'Unable to source the specified laptop model within required timeline',
          submittedAt: new Date('2024-01-13T08:15:00'),
          updatedAt: new Date('2024-01-13T08:15:00'),
          expiresAt: new Date('2024-01-27T23:59:59'),
          isViewed: true
        },
        {
          id: 4,
          quotationId: 'q4',
          rfqId: this.rfqId || 'rfq1',
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
          expiresAt: new Date('2024-01-30T23:59:59'),
          isViewed: false,
          updatedAt: new Date('2024-01-16T00:00:00')
        }
      ],
      summary: {
        totalVendors: 4,
        responded: 3,
        pending: 1,
        accepted: 1,
        declined: 1,
        expired: 0
      }
    };
  }

  openVendorSummary(): void {
    this.showVendorSummaryModal = true;
  }

  closeVendorSummary(): void {
    this.showVendorSummaryModal = false;
  }

  viewQuotationDetail(quotation: VendorQuotation): void {
    this.selectedQuotation = quotation;
    this.showQuotationDetailModal = true;

    // Mark as viewed
    if (!quotation.isViewed) {
      this.quotationService.markAsViewed(quotation.id).subscribe();
    }
  }

  closeQuotationDetail(): void {
    this.showQuotationDetailModal = false;
    this.selectedQuotation = null;
  }

  acceptQuotation(quotationId: string | number): void {
    if (confirm('Are you sure you want to accept this quotation? You\'ll generate and send the LPO as a separate step afterward.')) {
      this.isProcessing = true;
      this.quotationService.acceptQuotation(quotationId).subscribe({
        next: (response) => {
          this.isProcessing = false;
          this.closeQuotationDetail();
          this.loadRFQDetails(); // Refresh data
          alert(response.message || 'Quotation accepted. You can now generate the LPO from the LPO preview screen.');
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error accepting quotation:', err);
          alert('Failed to accept quotation. Please try again.');
        }
      });
    }
  }

  rejectQuotation(quotationId: string | number): void {
    const reason = prompt('Please provide a reason for rejecting this quotation:');
    if (reason !== null && reason.trim()) {
      this.isProcessing = true;
      this.quotationService.rejectQuotation(quotationId, reason.trim()).subscribe({
        next: () => {
          this.isProcessing = false;
          this.closeQuotationDetail();
          this.loadRFQDetails(); // Refresh data
          alert('Quotation has been rejected.');
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error rejecting quotation:', err);
          alert('Failed to reject quotation. Please try again.');
        }
      });
    }
  }

  cancelPendingVendor(rfqId: number, vendorId: string, vendorName: string): void {
    if (confirm(`Are you sure you want to cancel the RFQ sent to ${vendorName}? This action cannot be undone.`)) {
      this.isProcessing = true;
      this.quotationService.cancelPendingQuotation(String(rfqId), vendorId).subscribe({
        next: () => {
          this.isProcessing = false;
          this.loadRFQDetails(); // Refresh data
          alert(`RFQ to ${vendorName} has been cancelled.`);
        },
        error: (err) => {
          this.isProcessing = false;
          console.error('Error cancelling vendor:', err);
          alert('Failed to cancel. Please try again.');
        }
      });
    }
  }

  getStatusColor(status: VendorQuotationStatus): string {
    const colors: Record<VendorQuotationStatus, string> = {
      'PENDING': '#f59e0b',
      'SUBMITTED': '#3b82f6',
      'ACCEPTED': '#22c55e',
      'DECLINED': '#ef4444',
      'EXPIRED': '#6b7280',
      'WITHDRAWN': '#8b5cf6',
      'LPO_GENERATED': '#184440',
      'LPO_SENT': '#22c55e',
      'REVIEW_REQUESTED': '#f97316'
    };
    return colors[status] || '#6b7280';
  }

  getStatusLabel(status: VendorQuotationStatus): string {
    const labels: Record<VendorQuotationStatus, string> = {
      'PENDING': 'Pending',
      'SUBMITTED': 'Submitted',
      'ACCEPTED': 'Accepted',
      'DECLINED': 'Declined',
      'EXPIRED': 'Expired',
      'WITHDRAWN': 'Withdrawn',
      'LPO_GENERATED': 'LPO Draft',
      'LPO_SENT': 'LPO Sent',
      'REVIEW_REQUESTED': 'Review Requested'
    };
    return labels[status] || status;
  }

  getStatusIcon(status: VendorQuotationStatus): string {
    const icons: Record<VendorQuotationStatus, string> = {
      'PENDING': 'fa-clock',
      'SUBMITTED': 'fa-paper-plane',
      'ACCEPTED': 'fa-check-circle',
      'DECLINED': 'fa-times-circle',
      'EXPIRED': 'fa-hourglass-end',
      'WITHDRAWN': 'fa-times',
      'LPO_GENERATED': 'fa-file-invoice',
      'LPO_SENT': 'fa-paper-plane',
      'REVIEW_REQUESTED': 'fa-reply'
    };
    return icons[status] || 'fa-circle';
  }

  formatCurrency(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'NGN'
    }).format(amount || 0);
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getDaysRemaining(expiresAt: Date): number {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}