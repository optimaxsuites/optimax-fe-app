// quotation-management.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { delay } from 'rxjs/operators';
import { VendorQuotation, RFQWithQuotations, VendorQuotationStatus } from '../../domain/procurement-request/procurement.dto';

@Injectable({
  providedIn: 'root'
})
export class QuotationManagementService {
  private readonly STORAGE_KEY = 'vendor_quotations_db';
  private quotations: VendorQuotation[] = [];

  constructor(private http: HttpClient) {
    this.initData();
  }

  private initData(): void {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          this.quotations = parsed.map((q: any) => ({
            ...q,
            submittedAt: q.submittedAt ? new Date(q.submittedAt) : undefined,
            updatedAt: q.updatedAt ? new Date(q.updatedAt) : new Date(),
            expiresAt: q.expiresAt ? new Date(q.expiresAt) : new Date()
          }));
        } else {
          this.loadDefaultQuotations();
        }
      } catch (e) {
        console.error('Error parsing stored quotations:', e);
        this.loadDefaultQuotations();
      }
    } else {
      this.loadDefaultQuotations();
    }
  }

  private loadDefaultQuotations(): void {
    this.quotations = [
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
    this.saveToStorage();
  }

  private saveToStorage(): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.quotations));
  }

  // Get all quotations for an RFQ
  getQuotationsForRFQ(rfqId: string): Observable<RFQWithQuotations> {
    const matchingQuotes = this.quotations.filter(
      q => q.rfqId.toLowerCase() === rfqId.toLowerCase()
    );

    const responded = matchingQuotes.filter(
      q => ['SUBMITTED', 'ACCEPTED', 'DECLINED', 'LPO_GENERATED', 'LPO_SENT', 'REVIEW_REQUESTED'].includes(q.status)
    ).length;

    const pending = matchingQuotes.filter(q => q.status === 'PENDING').length;
    const accepted = matchingQuotes.filter(q => ['ACCEPTED', 'LPO_GENERATED', 'LPO_SENT'].includes(q.status)).length;
    const declined = matchingQuotes.filter(q => q.status === 'DECLINED').length;
    const expired = matchingQuotes.filter(q => q.status === 'EXPIRED').length;

    const rfqTitle = matchingQuotes[0]?.rfqTitle || 'Request for Quotation';

    const rfqData: RFQWithQuotations = {
      rfq: {
        id: rfqId,
        customerId: 'cust-101',
        customerName: 'Optimax Industries',
        procurementType: rfqId.toLowerCase() === 'rfq3' ? 'SERVICE' : 'PRODUCT',
        title: rfqTitle,
        description: `Procurement details for ${rfqTitle}.`,
        items: matchingQuotes[0]?.items.map((it, idx) => ({
          id: `item-${idx}`,
          name: it.name,
          description: it.description,
          quantity: it.quantity,
          unit: 'Pieces',
          estimatedBudget: it.totalPrice,
          attachments: []
        })) || [],
        totalBudget: matchingQuotes.reduce((acc, curr) => acc + curr.totalAmount, 0) || 1500000,
        currency: matchingQuotes[0]?.currency || 'NGN',
        deliveryLocation: 'Lagos, Nigeria',
        deliveryDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: accepted > 0 ? 'VENDOR_SELECTED' : 'VENDORS_QUOTING',
        attachments: [],
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(),
        selectedVendorId: matchingQuotes.find(q => q.status === 'ACCEPTED')?.vendorId || ''
      },
      quotations: matchingQuotes,
      summary: {
        totalVendors: matchingQuotes.length,
        responded,
        pending,
        accepted,
        declined,
        expired
      }
    };

    return of(rfqData).pipe(delay(100));
  }

  // Get detailed quotation by ID
  getQuotationDetail(quotationId: string): Observable<VendorQuotation> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (!found) {
      return throwError(() => new Error(`Quotation not found: ${quotationId}`));
    }
    return of({ ...found }).pipe(delay(100));
  }

  // Accept a quotation
  acceptQuotation(quotationId: string, notes?: string): Observable<{ lpoId: string; message: string }> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.status = 'ACCEPTED';
      found.updatedAt = new Date();

      // Decline other quotations for same RFQ
      this.quotations.forEach(q => {
        if (q.rfqId === found.rfqId && q.id !== found.id && (q.status === 'SUBMITTED' || q.status === 'PENDING' || q.status === 'REVIEW_REQUESTED')) {
          q.status = 'DECLINED';
          q.declineReason = 'Another quotation was accepted for this RFQ';
          q.updatedAt = new Date();
        }
      });

      this.saveToStorage();
      return of({
        lpoId: `LPO-${1000 + Math.floor(Math.random() * 9000)}`,
        message: 'Quotation successfully accepted.'
      }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Send LPO to vendor
  sendLpoToVendor(quotationId: string, lpoNumber: string): Observable<{ message: string }> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.status = 'LPO_SENT';
      found.updatedAt = new Date();
      this.saveToStorage();
      return of({ message: 'LPO has been successfully sent to the vendor.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Update quotation status
  updateQuotationStatus(quotationId: string, status: VendorQuotationStatus): Observable<{ message: string }> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.status = status;
      found.updatedAt = new Date();
      this.saveToStorage();
      return of({ message: `Quotation status updated to ${status}.` }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Reject a quotation
  rejectQuotation(quotationId: string, reason: string): Observable<{ message: string }> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.status = 'DECLINED';
      found.declineReason = reason;
      found.updatedAt = new Date();
      this.saveToStorage();
      return of({ message: 'Quotation declined successfully.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Request Changes (Review Requested)
  requestChanges(quotationId: string, notes: string): Observable<{ message: string }> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.status = 'REVIEW_REQUESTED';
      found.revisionRequestNote = notes;
      found.updatedAt = new Date();
      this.saveToStorage();
      return of({ message: 'Request changes notes sent to the vendor.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Simulate vendor resubmission (overwriting old quotation details)
  simulateVendorResubmit(quotationId: string, newTotal: number, newNotes?: string): Observable<{ message: string }> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.status = 'SUBMITTED';
      found.totalAmount = newTotal;
      found.notes = newNotes || 'Updated specifications and price matching client requests.';
      found.revisionRequestNote = undefined; // clear request note
      found.submittedAt = new Date();
      found.updatedAt = new Date();
      
      // Update item totals to reflect new total amount roughly (for visual consistency)
      if (found.items && found.items.length > 0) {
        const itemRatio = newTotal / found.items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);
        found.items.forEach(it => {
          it.unitPrice = Math.round(it.unitPrice * (itemRatio || 1));
          it.totalPrice = it.unitPrice * it.quantity;
        });
      }

      this.saveToStorage();
      return of({ message: 'New quotation sent from vendor.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Quotation not found: ${quotationId}`));
  }

  // Cancel pending quotation (vendor hasn't responded)
  cancelPendingQuotation(rfqId: string, vendorId: string): Observable<{ message: string }> {
    const matchingQuotes = this.quotations.filter(
      q => q.rfqId.toLowerCase() === rfqId.toLowerCase() && q.vendorId === vendorId
    );
    if (matchingQuotes.length > 0) {
      matchingQuotes.forEach(q => {
        q.status = 'WITHDRAWN';
        q.updatedAt = new Date();
      });
      this.saveToStorage();
      return of({ message: 'Pending quotation successfully cancelled.' }).pipe(delay(100));
    }
    return throwError(() => new Error(`Pending quotation not found for RFQ: ${rfqId}, Vendor: ${vendorId}`));
  }

  // Get all quotations dashboard
  getQuotationsDashboard(filters?: any): Observable<any> {
    return of({ quotations: this.quotations }).pipe(delay(100));
  }

  // Mark quotation as viewed
  markAsViewed(quotationId: string): Observable<void> {
    const found = this.quotations.find(q => q.id === quotationId);
    if (found) {
      found.isViewed = true;
      this.saveToStorage();
    }
    return of(void 0).pipe(delay(50));
  }
}