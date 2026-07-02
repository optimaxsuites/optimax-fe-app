import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { QuotationManagementService } from '../../../service/procurement/quotation-management.service';
import { VendorQuotation } from '../../../domain/procurement-request/procurement.dto';

@Component({
  selector: 'app-quotation-detail',
  templateUrl: './quotation-detail.component.html',
  styleUrls: ['./quotation-detail.component.scss']
})
export class QuotationDetailComponent implements OnInit, OnDestroy {
  quotationId: string | null = null;
  quotation: VendorQuotation | null = null;
  isLoading = false;
  isProcessing = false;
  showAcceptModal = false;
  showRejectModal = false;
  rejectReason = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quotationService: QuotationManagementService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.quotationId = params.get('id');
      if (this.quotationId) {
        this.loadQuotationDetail();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadQuotationDetail(): void {
    if (!this.quotationId) return;

    this.isLoading = true;
    this.quotationService.getQuotationDetail(this.quotationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.quotation = data;
        this.isLoading = false;
        // Mark as viewed
        if (!data.isViewed) {
          this.quotationService.markAsViewed(data.id).subscribe();
        }
      },
      error: (err) => {
        console.error('Error loading quotation:', err);
        this.isLoading = false;
        this.loadMockData();
      }
    });
  }

  loadMockData(): void {
    this.quotation = {
      id: this.quotationId || 'q1',
      rfqId: 'rfq1',
      vendorId: 'v1',
      vendorName: 'TechPro Solutions Ltd',
      vendorCode: 'TPS001',
      vendorRating: 4.8,
      vendorEmail: 'procurement@techpro.example',
      vendorPhone: '+234-800-555-0101',
      status: 'SUBMITTED',
      items: [
        {
          id: 'qi1',
          name: 'Dell XPS 15 Laptop',
          description: '15-inch laptop with i7 processor, 16GB RAM, 512GB SSD',
          quantity: 10,
          unitPrice: 145000,
          totalPrice: 1450000,
          availability: 'AVAILABLE',
          deliveryDate: new Date('2024-02-10'),
          notes: 'Includes 3-year warranty'
        },
        {
          id: 'qi2',
          name: 'HP LaserJet Pro Printer',
          description: 'Multifunction laser printer with scanner and copier',
          quantity: 5,
          unitPrice: 95000,
          totalPrice: 475000,
          availability: 'AVAILABLE',
          deliveryDate: new Date('2024-02-12'),
          notes: 'Includes starter toner cartridges'
        },
        {
          id: 'qi3',
          name: 'Office Ergonomic Chairs',
          description: 'High-back ergonomic office chairs with lumbar support',
          quantity: 20,
          unitPrice: 75000,
          totalPrice: 1500000,
          availability: 'PARTIAL',
          deliveryDate: new Date('2024-02-15'),
          notes: 'Only 15 available immediately, remaining 5 in 2 weeks'
        }
      ],
      totalAmount: 3425000,
      currency: 'NGN',
      deliveryTimeline: '5-7 business days after LPO',
      validityDays: 14,
      termsAndConditions: `
        1. Payment Terms: 30% advance, 70% upon delivery
        2. Delivery: Free delivery within Lagos metropolitan area
        3. Warranty: 12 months on all products
        4. Installation: Installation and setup included
        5. Training: 1-day staff training included
      `,
      notes: 'Special discount applied for bulk purchase. Price valid for 14 days.',
      submittedAt: new Date('2026-09-15T10:30:00'),
      updatedAt: new Date('2026-09-15T10:30:00'),
      expiresAt: new Date('2026-09-29T23:59:59'),
      isViewed: false
    };
  }

  openAcceptModal(): void {
    this.showAcceptModal = true;
  }

  closeAcceptModal(): void {
    this.showAcceptModal = false;
  }

  openRejectModal(): void {
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal(): void {
    this.showRejectModal = false;
    this.rejectReason = '';
  }

  confirmAccept(): void {
    if (!this.quotation) return;

    this.isProcessing = true;
    this.quotationService.acceptQuotation(this.quotation.id).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.closeAcceptModal();
        alert(`LPO #${response.lpoId} has been generated and sent to ${this.quotation?.vendorName}.`);
        this.loadQuotationDetail(); // Refresh
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Error accepting quotation:', err);
        alert('Failed to accept quotation. Please try again.');
      }
    });
  }

  confirmReject(): void {
    if (!this.quotation) return;

    if (!this.rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }

    this.isProcessing = true;
    this.quotationService.rejectQuotation(this.quotation.id, this.rejectReason.trim()).subscribe({
      next: () => {
        this.isProcessing = false;
        this.closeRejectModal();
        alert(`Quotation from ${this.quotation?.vendorName} has been rejected.`);
        this.loadQuotationDetail(); // Refresh
      },
      error: (err) => {
        this.isProcessing = false;
        console.error('Error rejecting quotation:', err);
        alert('Failed to reject quotation. Please try again.');
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/commerce/quotations']);
  }

  goToRFQ(): void {
    if (this.quotation?.rfqId) {
      this.router.navigate(['/commerce/requests', this.quotation.rfqId]);
    }
  }

  formatTerms(terms: string | undefined): string {
    return terms ? terms.replace(/\n/g, '<br>') : '';
  }

  formatCurrency(amount: number): string {
    const currency = this.quotation?.currency || 'NGN';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  }

  formatDate(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatDateTime(date: any): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStatusClass(status: string): string {
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
      'PENDING': 'Pending',
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

  getAvailabilityColor(availability: string): string {
    const colors: Record<string, string> = {
      'AVAILABLE': '#059669',
      'PARTIAL': '#d97706',
      'UNAVAILABLE': '#dc2626'
    };
    return colors[availability] || '#6b7280';
  }

  getAvailabilityLabel(availability: string): string {
    const labels: Record<string, string> = {
      'AVAILABLE': 'Available',
      'PARTIAL': 'Partial',
      'UNAVAILABLE': 'Unavailable'
    };
    return labels[availability] || availability;
  }

  getDaysRemaining(): number {
    if (!this.quotation?.expiresAt) return 0;
    const now = new Date();
    const expiry = new Date(this.quotation.expiresAt);
    const diff = expiry.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  isExpired(): boolean {
    if (!this.quotation?.expiresAt) return false;
    return new Date(this.quotation.expiresAt) < new Date();
  }
}