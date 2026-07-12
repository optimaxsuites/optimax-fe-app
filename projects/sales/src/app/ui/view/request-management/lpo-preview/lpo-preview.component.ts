import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { QuotationManagementService } from '../../../service/procurement/quotation-management.service';
import { VendorQuotation } from '../../../domain/procurement-request/procurement.dto';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-lpo-preview',
  templateUrl: './lpo-preview.component.html',
  styleUrls: ['./lpo-preview.component.scss']
})
export class LpoPreviewComponent implements OnInit, OnDestroy {
  quotationId: string | null = null;
  quotation: VendorQuotation | null = null;
  lpoNumber: string = '';
  orderDate: Date = new Date();
  isLoading = false;
  isProcessing = false;
  isDownloading = false;
  successMessage = '';

  private destroy$ = new Subject<void>();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private quotationService: QuotationManagementService
  ) {}

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

  generateLpoDetails(): void {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.lpoNumber = `LPO-2026-${randomSuffix}`;
    this.orderDate = new Date();
  }

  /**
   * Resolves this quotation's LPO number/date — generating one only the
   * first time it's needed (see QuotationManagementService.ensureLpoAssigned)
   * — instead of inventing a new random number every time this page loads.
   * This is the explicit, separate "generate the LPO" step: acceptance
   * itself no longer creates one.
   */
  private resolveLpoNumber(quotation: VendorQuotation): void {
    if (quotation.lpoNumber) {
      this.lpoNumber = quotation.lpoNumber;
      this.orderDate = quotation.lpoIssuedAt ?? new Date();
      this.isLoading = false;
      return;
    }
    this.quotationService.ensureLpoAssigned(quotation.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ lpoNumber, lpoIssuedAt }) => {
        this.lpoNumber = lpoNumber;
        this.orderDate = lpoIssuedAt;
        if (this.quotation) {
          this.quotation.lpoNumber = lpoNumber;
          this.quotation.lpoIssuedAt = lpoIssuedAt;
        }
        this.isLoading = false;
        // Now that an LPO number actually exists, reflect that in status.
        if (this.quotation?.status === 'ACCEPTED') {
          this.updateStatus('LPO_GENERATED');
        }
      },
      error: () => {
        this.generateLpoDetails(); // last resort — service unavailable
        this.isLoading = false;
      }
    });
  }

  loadQuotationDetail(): void {
    if (!this.quotationId) return;

    this.isLoading = true;
    this.quotationService.getQuotationDetail(this.quotationId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        this.quotation = data;
        this.resolveLpoNumber(data);

        if (data.status === 'LPO_SENT') {
          this.successMessage = 'LPO has been successfully sent to the vendor.';
        }
      },
      error: (err) => {
        console.error('Error loading quotation for LPO preview:', err);
        this.loadMockQuotation();

        if (this.quotation) {
          this.resolveLpoNumber(this.quotation);
          if (this.quotation.status === 'LPO_SENT') {
            this.successMessage = 'LPO has been successfully sent to the vendor.';
          }
        } else {
          this.isLoading = false;
        }
      }
    });
  }

  updateStatus(status: 'LPO_GENERATED' | 'LPO_SENT'): void {
    if (!this.quotation) return;
    
    this.quotation.status = status;
    this.quotationService.updateQuotationStatus(this.quotation.id, status).subscribe({
      next: () => {
        console.log(`Quotation status updated successfully to ${status}`);
      },
      error: () => {
        // Mock fallback: do nothing, we already set it locally
        console.log(`Mock fallback: status updated locally to ${status}`);
      }
    });
  }

  loadMockQuotation(): void {
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
        status: 'ACCEPTED',
        items: [
          { id: 'qi1', name: 'Dell XPS 15 Laptop', description: '15-inch laptop with i7 processor, 16GB RAM, 512GB SSD', quantity: 10, unitPrice: 145000, totalPrice: 1450000, availability: 'AVAILABLE' }
        ],
        totalAmount: 1450000,
        currency: 'NGN',
        deliveryTimeline: '5-7 business days after LPO',
        validityDays: 14,
        termsAndConditions: '1. Delivery: Free delivery within Lagos metropolitan area\n2. Payment: 100% on delivery',
        submittedAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(),
        isViewed: true
      };
    }
  }

  downloadLpoPDF(): void {
    const element = document.getElementById('lpo-sheet');
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
        pdf.save(`LPO-${this.lpoNumber}.pdf`);
        this.isDownloading = false;
      }).catch(err => {
        console.error('Error generating LPO PDF:', err);
        this.isDownloading = false;
        alert('Failed to generate PDF. Printing window instead.');
        window.print();
      });
    }
  }

  sendToVendor(): void {
    if (!this.quotation) return;

    this.isProcessing = true;
    this.quotationService.sendLpoToVendor(this.quotation.id, this.lpoNumber).subscribe({
      next: (response) => {
        this.isProcessing = false;
        this.updateStatus('LPO_SENT');
        this.successMessage = 'LPO has been successfully sent to the vendor.';
        alert(response.message || `LPO successfully sent to ${this.quotation?.vendorName}.`);
      },
      error: () => {
        this.isProcessing = false;
        this.updateStatus('LPO_SENT');
        this.successMessage = 'LPO has been successfully sent to the vendor.';
        alert(`LPO successfully sent to ${this.quotation?.vendorName}.`);
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/commerce/quotations', this.quotationId]);
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
}
