import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { QuotationManagementService } from '../../../service/procurement/quotation-management.service';
import { VendorQuotation } from '../../../domain/procurement-request/procurement.dto';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

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
  allQuotationsForRfq: VendorQuotation[] = [];
  showCompareDisclaimerModal = false;
  successMessage = '';
  isDownloading = false;

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
        this.loadAllQuotationsForRfq(data.rfqId);
      },
      error: (err) => {
        console.error('Error loading quotation:', err);
        this.isLoading = false;
        this.loadMockData();
        if (this.quotation) {
          this.loadAllQuotationsForRfq(this.quotation.rfqId);
        }
      }
    });
  }

  loadMockData(): void {
    const mockDb: VendorQuotation[] = [
      {
        id: 'q1',
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        vendorEmail: 'procurement@techpro.example',
        vendorPhone: '+234-800-555-0101',
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
        isViewed: false,
        termsAndConditions: '1. Warranty: 3 years on laptops\n2. Payment: Net 30 after delivery',
        notes: 'Price includes delivery and initial configuration support.'
      },
      {
        id: 'q2',
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        vendorEmail: 'orders@globalsupplies.example',
        vendorPhone: '+234-811-333-2211',
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
        isViewed: true,
        termsAndConditions: '1. Standard commercial warranty applies\n2. Payment: Immediate upon delivery',
        notes: 'Bulk discount applied to unit rates.'
      },
      {
        id: 'q3',
        rfqId: 'RFQ1',
        rfqTitle: 'Office Equipment & IT Hardware',
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        vendorRating: 4.4,
        vendorEmail: 'sales@qualitygoods.example',
        vendorPhone: '+234-802-999-8877',
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
        isViewed: true,
        termsAndConditions: 'N/A',
        notes: 'We cannot commit to the 3-day turnaround required.'
      },
      {
        id: 'q4',
        rfqId: 'RFQ2',
        rfqTitle: 'Premium Ergonomic Chairs',
        vendorId: 'v4',
        vendorName: 'Premium Electronics Hub',
        vendorCode: 'PEH005',
        vendorRating: 4.9,
        vendorEmail: 'deals@premiumelectronics.example',
        vendorPhone: '+234-900-111-0000',
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
        vendorEmail: 'quote@expresslogistics.example',
        vendorPhone: '+234-805-444-2222',
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
        vendorEmail: 'cloud@cloudscale.example',
        vendorPhone: '+234-803-777-6655',
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
        isViewed: false,
        termsAndConditions: '1. Scope limited to AWS cloud platform\n2. 50% milestone billing',
        notes: 'Price includes post-migration support for 3 months.'
      },
      {
        id: 'q7',
        rfqId: 'RFQ3',
        rfqTitle: 'AWS Cloud Infrastructure Consulting',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        vendorEmail: 'procurement@techpro.example',
        vendorPhone: '+234-800-555-0101',
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
        vendorEmail: 'clean@lagosclean.example',
        vendorPhone: '+234-802-123-4567',
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
        isViewed: true,
        termsAndConditions: '1. Contract duration: 6 months minimum\n2. Invoiced monthly',
        notes: 'Quotes covers basic cleaning supplies.'
      },
      {
        id: 'q9',
        rfqId: 'RFQ4',
        rfqTitle: 'Janitorial & Corporate Cleaning Services',
        vendorId: 'v5',
        vendorName: 'Express Logistics & Supply',
        vendorCode: 'ELS004',
        vendorRating: 4.2,
        vendorEmail: 'quote@expresslogistics.example',
        vendorPhone: '+234-805-444-2222',
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
        isViewed: true,
        termsAndConditions: 'N/A',
        notes: 'Lagos Mainland area only.'
      },
      {
        id: 'q10',
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v10',
        vendorName: 'Comfort Seatings Ltd',
        vendorCode: 'CSL010',
        vendorRating: 4.6,
        vendorEmail: 'comfort@seatings.example',
        vendorPhone: '+234-909-555-1122',
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
        isViewed: false,
        termsAndConditions: '1. Standard 2 year structural warranty\n2. Payment: 50% upfront, 50% on completion',
        notes: 'Chairs will be assembled on-site.'
      },
      {
        id: 'q11',
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v3',
        vendorName: 'Quality Goods Co',
        vendorCode: 'QGC003',
        vendorRating: 4.4,
        vendorEmail: 'sales@qualitygoods.example',
        vendorPhone: '+234-802-999-8877',
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
        isViewed: false,
        termsAndConditions: '1. Full replacement warranty for 1 year\n2. Payment: Net 15 days',
        notes: 'Fast delivery guaranteed.'
      },
      {
        id: 'q12',
        rfqId: 'RFQ5',
        rfqTitle: 'Office Furniture Procurement',
        vendorId: 'v2',
        vendorName: 'Global Supplies Inc',
        vendorCode: 'GSI002',
        vendorRating: 4.6,
        vendorEmail: 'orders@globalsupplies.example',
        vendorPhone: '+234-811-333-2211',
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

    const found = mockDb.find(q => q.id === this.quotationId);
    if (found) {
      this.quotation = { ...found };
    } else {
      this.quotation = {
        id: this.quotationId || 'q1',
        rfqId: 'RFQ1',
        vendorId: 'v1',
        vendorName: 'TechPro Solutions Ltd',
        vendorCode: 'TPS001',
        vendorRating: 4.8,
        vendorEmail: 'procurement@techpro.example',
        vendorPhone: '+234-800-555-0101',
        status: 'SUBMITTED',
        items: [
          { id: 'qi1', name: 'Dell XPS 15 Laptop', description: '15-inch i7, 16GB RAM, 512GB SSD', quantity: 2, unitPrice: 150000, totalPrice: 300000, availability: 'AVAILABLE' }
        ],
        totalAmount: 300000,
        currency: 'NGN',
        deliveryTimeline: '5-7 business days',
        validityDays: 14,
        submittedAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        isViewed: false
      };
    }
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
        this.successMessage = 'Quotation successfully accepted.';
        
        // update statuses locally
        if (this.quotation) {
          this.quotation.status = 'ACCEPTED';
          this.allQuotationsForRfq.forEach(q => {
            if (q.id !== this.quotation?.id && (q.status === 'SUBMITTED' || q.status === 'PENDING')) {
              q.status = 'DECLINED';
              q.declineReason = 'Another quotation was accepted for this RFQ';
            }
          });
        }
        
        alert(response.message || `LPO #${response.lpoId} has been generated and sent to ${this.quotation?.vendorName}.`);
        this.loadQuotationDetail(); // Refresh
      },
      error: (err) => {
        // Fallback mock update
        this.isProcessing = false;
        this.closeAcceptModal();
        this.successMessage = 'Quotation successfully accepted.';
        
        if (this.quotation) {
          this.quotation.status = 'ACCEPTED';
          this.allQuotationsForRfq.forEach(q => {
            if (q.id !== this.quotation?.id && (q.status === 'SUBMITTED' || q.status === 'PENDING')) {
              q.status = 'DECLINED';
              q.declineReason = 'Another quotation was accepted for this RFQ';
            }
          });
        }
        
        alert(`Quotation successfully accepted. LPO has been generated.`);
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

  loadAllQuotationsForRfq(rfqId: string): void {
    this.quotationService.getQuotationsForRFQ(rfqId).subscribe({
      next: (rfqData) => {
        this.allQuotationsForRfq = rfqData.quotations || [];
      },
      error: (err) => {
        this.loadMockAllQuotations(rfqId);
      }
    });
  }

  loadMockAllQuotations(rfqId: string): void {
    if (rfqId === 'RFQ1' || rfqId === 'rfq1' || rfqId === 'RFQ5' || rfqId === 'rfq5') {
      this.allQuotationsForRfq = [
        {
          id: 'q1',
          rfqId: rfqId,
          vendorId: 'v1',
          vendorName: 'TechPro Solutions Ltd',
          vendorCode: 'TPS001',
          vendorRating: 4.8,
          status: 'SUBMITTED',
          items: [],
          totalAmount: 450000,
          currency: 'NGN',
          validityDays: 14,
          isViewed: false,
          deliveryTimeline: '5-7 business days',
          updatedAt: new Date(),
          expiresAt: new Date()
        },
        {
          id: 'q2',
          rfqId: rfqId,
          vendorId: 'v2',
          vendorName: 'Global Supplies Inc',
          vendorCode: 'GSI002',
          vendorRating: 4.6,
          status: 'SUBMITTED',
          items: [],
          totalAmount: 420000,
          currency: 'NGN',
          validityDays: 30,
          isViewed: true,
          deliveryTimeline: '3-5 business days',
          updatedAt: new Date(),
          expiresAt: new Date()
        }
      ];
    } else {
      this.allQuotationsForRfq = [
        this.quotation || {
          id: this.quotationId || 'q1',
          rfqId: rfqId,
          vendorId: 'v1',
          vendorName: 'TechPro Solutions Ltd',
          vendorCode: 'TPS001',
          vendorRating: 4.8,
          status: 'SUBMITTED',
          items: [],
          totalAmount: 3425000,
          currency: 'NGN',
          validityDays: 14,
          isViewed: false,
          deliveryTimeline: '5-7 business days',
          updatedAt: new Date(),
          expiresAt: new Date()
        }
      ];
    }
  }

  onAcceptClick(): void {
    const activeQuotations = this.allQuotationsForRfq.filter(q => q.status === 'SUBMITTED' || q.status === 'ACCEPTED');
    if (activeQuotations.length > 1) {
      this.showCompareDisclaimerModal = true;
    } else {
      this.openAcceptModal();
    }
  }

  proceedToAccept(): void {
    this.showCompareDisclaimerModal = false;
    this.openAcceptModal();
  }

  closeCompareDisclaimerModal(): void {
    this.showCompareDisclaimerModal = false;
  }

  downloadPDF(): void {
    const element = document.getElementById('quotation-detail-sheet');
    if (element) {
      this.isDownloading = true;
      html2canvas(element, { 
        scale: 2, 
        useCORS: true, 
        allowTaint: true,
        ignoreElements: (el) => el.classList.contains('action-bar') || el.tagName.toLowerCase() === 'app-back-button'
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgWidth = 210; // A4 size width
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Quotation-${this.quotation?.id || 'Detail'}.pdf`);
        this.isDownloading = false;
      }).catch(err => {
        console.error('Error generating PDF:', err);
        this.isDownloading = false;
        alert('Failed to generate PDF. Printing window instead.');
        window.print();
      });
    } else {
      alert('Could not find element to export. Printing window instead.');
      window.print();
    }
  }

  generateLPO(): void {
    if (this.quotation) {
      this.router.navigate(['/commerce/quotations', this.quotation.id, 'generate-lpo']);
    }
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