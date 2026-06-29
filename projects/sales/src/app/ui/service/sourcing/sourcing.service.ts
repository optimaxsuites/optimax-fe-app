import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  BuyerRfq, VendorQuoteResponse, IssuedLpo,
  IssuedLpoItem, ProcurementStats,
} from '../../domain/sourcing/sourcing.dto';

@Injectable({ providedIn: 'root' })
export class SourcingService {

  private rfqs$$       = new BehaviorSubject<BuyerRfq[]>(this.seedRfqs());
  private quotes$$     = new BehaviorSubject<VendorQuoteResponse[]>(this.seedQuotes());
  private issuedLpos$$ = new BehaviorSubject<IssuedLpo[]>(this.seedIssuedLpos());

  readonly rfqs$       = this.rfqs$$.asObservable();
  readonly quotes$     = this.quotes$$.asObservable();
  readonly issuedLpos$ = this.issuedLpos$$.asObservable();

  // ── RFQs ──────────────────────────────────────────────────────────────────
  getRfqs(): Observable<BuyerRfq[]> {
    return this.rfqs$.pipe(
      map(l => [...l].sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime()))
    );
  }

  // ── Quotes for a specific RFQ ─────────────────────────────────────────────
  getQuotesForRfq(rfqId: string): Observable<VendorQuoteResponse[]> {
    return this.quotes$.pipe(
      map(l => l
        .filter(q => q.rfqId === rfqId)
        .sort((a, b) => a.total - b.total) // cheapest first
        .map((q, idx) => ({ ...q, priceRank: idx + 1 }))
      )
    );
  }

  getAllQuotes(): Observable<VendorQuoteResponse[]> {
    return this.quotes$.pipe(
      map(l => [...l].sort((a, b) => b.submittedDate.getTime() - a.submittedDate.getTime()))
    );
  }

  shortlistQuote(id: string): void {
    this.quotes$$.next(
      this.quotes$$.getValue().map(q =>
        q.id === id ? { ...q, status: 'shortlisted' as const } : q
      )
    );
  }

  rejectQuote(id: string): void {
    this.quotes$$.next(
      this.quotes$$.getValue().map(q =>
        q.id === id ? { ...q, status: 'rejected' as const } : q
      )
    );
  }

  awardQuote(quoteId: string, rfqId: string): void {
    // Mark the chosen quote as awarded
    this.quotes$$.next(
      this.quotes$$.getValue().map(q => {
        if (q.rfqId !== rfqId) return q;
        return { ...q, status: q.id === quoteId ? 'awarded' as const : 'rejected' as const };
      })
    );
    // Mark the RFQ as awarded
    this.rfqs$$.next(
      this.rfqs$$.getValue().map(r =>
        r.id === rfqId ? { ...r, status: 'awarded' as const } : r
      )
    );
  }

  // ── Issued LPOs ───────────────────────────────────────────────────────────
  getIssuedLpos(): Observable<IssuedLpo[]> {
    return this.issuedLpos$.pipe(
      map(l => [...l].sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime()))
    );
  }

  createLpo(lpo: Omit<IssuedLpo, 'id' | 'lpoNumber' | 'issuedDate' | 'status'>): IssuedLpo {
    const count    = this.issuedLpos$$.getValue().length + 1;
    const newLpo: IssuedLpo = {
      ...lpo,
      id:        `lpo-issued-${Date.now()}`,
      lpoNumber: `LPO-${new Date().getFullYear()}-${String(count).padStart(3, '0')}`,
      issuedDate: new Date(),
      status:    'sent',
    };
    this.issuedLpos$$.next([newLpo, ...this.issuedLpos$$.getValue()]);
    return newLpo;
  }

  cancelLpo(id: string): void {
    this.issuedLpos$$.next(
      this.issuedLpos$$.getValue().map(l =>
        l.id === id ? { ...l, status: 'cancelled' as const } : l
      )
    );
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  getSourcingStats(): Observable<ProcurementStats> {
    const rfqs   = this.rfqs$$.getValue();
    const quotes = this.quotes$$.getValue();
    const lpos   = this.issuedLpos$$.getValue();
    const now    = new Date();
    const threeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    return of({
      totalRfqs:       rfqs.length,
      openRfqs:        rfqs.filter(r => r.status === 'open').length,
      expiringSoon:    rfqs.filter(r => r.status === 'open' && r.expiryDate >= now && r.expiryDate <= threeDays).length,
      totalQuotes:     quotes.length,
      pendingReview:   quotes.filter(q => q.status === 'received' || q.status === 'under_review').length,
      awardsThisMonth: rfqs.filter(r => r.status === 'awarded' && r.issuedDate >= thisMonthStart).length,
      totalLposIssued: lpos.length,
      totalLpoValue:   lpos.filter(l => l.status !== 'cancelled').reduce((s, l) => s + l.total, 0),
    });
  }

  // ── Seed: Buyer RFQs ──────────────────────────────────────────────────────
  private seedRfqs(): BuyerRfq[] {
    return [
      {
        id: 'brfq-001', rfqNumber: 'RFQ-OUT-2026-001',
        title: 'Supply of IT Equipment — Q3 2026',
        orderName: 'Q3 IT Infrastructure Upgrade',
        department: 'Information Technology',
        category: 'Technology & IT',
        issuedDate: new Date('2026-06-01'),
        expiryDate: new Date('2026-06-15'),
        deliveryDeadline: new Date('2026-07-10'),
        deliveryAddress: 'Head Office, Lekki Phase 1, Lagos',
        status: 'open',
        currency: 'NGN',
        vendorTargeting: 'all',
        vendorsInvited: 12,
        quotesReceived: 4,
        totalBudgetEstimate: 8_500_000,
        paymentTerms: 'Net 30',
        specialInstructions: 'All equipment must include 1-year on-site warranty. Delivery must be accompanied by manufacturer receipts and test reports.',
        items: [
          { id: 'i1', name: 'Dell Latitude 5540 Laptop', description: '14" FHD, Intel Core i7, 16GB RAM, 512GB SSD, Windows 11 Pro', quantity: 20, unit: 'units', specifications: 'Must include Dell 3-year ProSupport warranty', budgetEstimate: 4_500_000 },
          { id: 'i2', name: '27" 4K Monitor', description: 'IPS panel, USB-C, 60Hz, HDR400 compatible', quantity: 20, unit: 'units', specifications: 'Must include HDMI and DisplayPort cables', budgetEstimate: 2_000_000 },
          { id: 'i3', name: 'USB-C Docking Station', description: '12-in-1, 100W PD, Dual 4K HDMI, 3× USB-A, SD card', quantity: 20, unit: 'units', budgetEstimate: 800_000 },
          { id: 'i4', name: 'Laptop Bag', description: '15.6" slim laptop backpack, waterproof, USB charging port', quantity: 20, unit: 'units', budgetEstimate: 280_000 },
        ],
      },
      {
        id: 'brfq-002', rfqNumber: 'RFQ-OUT-2026-002',
        title: 'Office Cleaning Supplies — Monthly Restock',
        orderName: 'June Cleaning Supplies',
        department: 'Facilities Management',
        category: 'Cleaning & Facilities',
        issuedDate: new Date('2026-06-03'),
        expiryDate: new Date('2026-06-10'),
        deliveryDeadline: new Date('2026-06-20'),
        deliveryAddress: 'Head Office, Lekki Phase 1, Lagos',
        status: 'awarded',
        currency: 'NGN',
        vendorTargeting: 'selected',
        vendorsInvited: 5,
        quotesReceived: 3,
        totalBudgetEstimate: 450_000,
        paymentTerms: 'Advance payment',
        items: [
          { id: 'i1', name: 'Industrial Floor Cleaner', description: '25L concentrate, pH neutral, suitable for marble & terrazzo', quantity: 10, unit: 'jerrycans', specifications: 'Must include SDS document', budgetEstimate: 185_000 },
          { id: 'i2', name: 'Microfibre Cleaning Cloths', description: '40×40cm, 300GSM, colour-coded', quantity: 200, unit: 'pcs', budgetEstimate: 170_000 },
          { id: 'i3', name: 'Hand Sanitiser 5L', description: '70% ethanol, dispenser-compatible', quantity: 20, unit: 'litres', budgetEstimate: 95_000 },
        ],
      },
      {
        id: 'brfq-003', rfqNumber: 'RFQ-OUT-2026-003',
        title: 'Executive Office Furniture — Board Room',
        orderName: 'Board Room Refurbishment',
        department: 'Administration',
        category: 'Furniture & Fixtures',
        issuedDate: new Date('2026-05-28'),
        expiryDate: new Date('2026-06-07'),
        deliveryDeadline: new Date('2026-07-30'),
        deliveryAddress: 'Head Office, Lekki Phase 1, Lagos — 5th Floor',
        status: 'open',
        currency: 'NGN',
        vendorTargeting: 'selected',
        vendorsInvited: 8,
        quotesReceived: 2,
        totalBudgetEstimate: 6_200_000,
        paymentTerms: '50% advance / 50% on delivery',
        specialInstructions: 'Vendor must carry out a site survey before submitting final quote. Assembly and installation must be included in the price.',
        items: [
          { id: 'i1', name: 'Boardroom Conference Table', description: '10-seat oval table, solid walnut veneer top, chrome legs', quantity: 1, unit: 'unit', budgetEstimate: 2_500_000 },
          { id: 'i2', name: 'Executive Leather Chair', description: 'High-back, full-grain leather, adjustable lumbar, chrome base', quantity: 12, unit: 'units', budgetEstimate: 3_000_000 },
          { id: 'i3', name: 'Credenza / Sideboard', description: '1.8m, matching walnut veneer, lockable', quantity: 2, unit: 'units', budgetEstimate: 700_000 },
        ],
      },
      {
        id: 'brfq-004', rfqNumber: 'RFQ-OUT-2026-004',
        title: 'Safety PPE — Site Operations',
        orderName: 'Site Safety Equipment Q2',
        department: 'Health, Safety & Environment',
        category: 'Safety & PPE',
        issuedDate: new Date('2026-05-15'),
        expiryDate: new Date('2026-05-25'),
        deliveryDeadline: new Date('2026-06-15'),
        deliveryAddress: 'Port Harcourt Site Office, GRA Phase 2',
        status: 'expired',
        currency: 'NGN',
        vendorTargeting: 'all',
        vendorsInvited: 15,
        quotesReceived: 6,
        totalBudgetEstimate: 1_800_000,
        items: [
          { id: 'i1', name: 'Hard Hat Class A', description: 'ANSI/ISEA Z89.1-2014 certified, adjustable ratchet', quantity: 100, unit: 'units', budgetEstimate: 600_000 },
          { id: 'i2', name: 'Safety Boot Size 38-46', description: 'EN ISO 20345 S3, steel toe, anti-slip', quantity: 50, unit: 'pairs', budgetEstimate: 750_000 },
          { id: 'i3', name: 'Hi-Vis Vest', description: 'EN ISO 20471 Class 2, orange/yellow, sizes S-XL', quantity: 100, unit: 'units', budgetEstimate: 450_000 },
        ],
      },
    ];
  }

  // ── Seed: Vendor Quote Responses ──────────────────────────────────────────
  private seedQuotes(): VendorQuoteResponse[] {
    return [
      // RFQ-OUT-2026-001: IT Equipment — 4 vendor quotes
      {
        id: 'qr-001', rfqId: 'brfq-001', rfqNumber: 'RFQ-OUT-2026-001',
        quotationNumber: 'QT-V001-2026-041',
        vendorId: 'V001', vendorName: 'TechSupply Nigeria Ltd', vendorEmail: 'sales@techsupply.ng',
        vendorRating: 4.8, vendorVerified: true,
        submittedDate: new Date('2026-06-04'), validUntil: new Date('2026-06-18'),
        status: 'shortlisted', currency: 'NGN',
        deliveryLeadDays: 14, paymentTerms: 'Net 30',
        notes: 'Includes free on-site setup and staff orientation. All items sourced from authorised distributors.',
        subtotal: 7_820_000, tax: 586_500, total: 8_406_500,
        items: [
          { rfqItemId: 'i1', itemName: 'Dell Latitude 5540 Laptop', description: '14" FHD i7 16GB 512GB', quantity: 20, unit: 'units', unitPrice: 280_000, totalPrice: 5_600_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: '27" 4K Monitor', description: 'IPS USB-C HDR400', quantity: 20, unit: 'units', unitPrice: 85_000, totalPrice: 1_700_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'USB-C Docking Station', description: '12-in-1 100W PD', quantity: 20, unit: 'units', unitPrice: 22_000, totalPrice: 440_000, availability: 'available' },
          { rfqItemId: 'i4', itemName: 'Laptop Bag', description: '15.6" waterproof backpack', quantity: 20, unit: 'units', unitPrice: 4_000, totalPrice: 80_000, availability: 'available' },
        ],
      },
      {
        id: 'qr-002', rfqId: 'brfq-001', rfqNumber: 'RFQ-OUT-2026-001',
        quotationNumber: 'QT-V002-2026-017',
        vendorId: 'V002', vendorName: 'ComputerLand NG', vendorEmail: 'procurement@computerlandng.com',
        vendorRating: 4.3, vendorVerified: true,
        submittedDate: new Date('2026-06-05'), validUntil: new Date('2026-06-19'),
        status: 'received', currency: 'NGN',
        deliveryLeadDays: 21, paymentTerms: 'Net 30',
        notes: 'Laptop bags are a different model than specified — equivalent quality.',
        subtotal: 7_600_000, tax: 570_000, total: 8_170_000,
        items: [
          { rfqItemId: 'i1', itemName: 'Dell Latitude 5540 Laptop', description: '14" FHD i7 16GB 512GB', quantity: 20, unit: 'units', unitPrice: 268_000, totalPrice: 5_360_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: '27" 4K Monitor', description: 'IPS USB-C HDR400', quantity: 20, unit: 'units', unitPrice: 88_000, totalPrice: 1_760_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'USB-C Docking Station', description: '12-in-1 100W PD', quantity: 20, unit: 'units', unitPrice: 20_500, totalPrice: 410_000, availability: 'available' },
          { rfqItemId: 'i4', itemName: 'Laptop Bag', description: '15.6" backpack (equivalent)', quantity: 20, unit: 'units', unitPrice: 3_500, totalPrice: 70_000, availability: 'available' },
        ],
      },
      {
        id: 'qr-003', rfqId: 'brfq-001', rfqNumber: 'RFQ-OUT-2026-001',
        quotationNumber: 'QT-V003-2026-089',
        vendorId: 'V003', vendorName: 'Apex Digital Solutions', vendorEmail: 'tenders@apexdigital.ng',
        vendorRating: 4.6, vendorVerified: true,
        submittedDate: new Date('2026-06-06'), validUntil: new Date('2026-06-20'),
        status: 'received', currency: 'NGN',
        deliveryLeadDays: 10, paymentTerms: 'Net 15',
        notes: 'Can deliver within 10 working days. Docking stations unavailable — recommended alternative from same spec range.',
        subtotal: 7_940_000, tax: 595_500, total: 8_535_500,
        items: [
          { rfqItemId: 'i1', itemName: 'Dell Latitude 5540 Laptop', description: '14" FHD i7 16GB 512GB', quantity: 20, unit: 'units', unitPrice: 275_000, totalPrice: 5_500_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: '27" 4K Monitor', description: 'IPS USB-C HDR400', quantity: 20, unit: 'units', unitPrice: 92_000, totalPrice: 1_840_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'USB-C Docking Station', description: 'Alternative model — same spec', quantity: 20, unit: 'units', unitPrice: 25_000, totalPrice: 500_000, availability: 'available', notes: 'Alternative: Anker 563 USB-C Hub — same connectivity spec' },
          { rfqItemId: 'i4', itemName: 'Laptop Bag', description: '15.6" waterproof backpack', quantity: 20, unit: 'units', unitPrice: 5_000, totalPrice: 100_000, availability: 'available' },
        ],
      },
      {
        id: 'qr-004', rfqId: 'brfq-001', rfqNumber: 'RFQ-OUT-2026-001',
        quotationNumber: 'QT-V004-2026-003',
        vendorId: 'V004', vendorName: 'SkyTech Imports Ltd', vendorEmail: 'bids@skytech.ng',
        vendorRating: 3.9, vendorVerified: false,
        submittedDate: new Date('2026-06-07'), validUntil: new Date('2026-06-21'),
        status: 'received', currency: 'NGN',
        deliveryLeadDays: 28, paymentTerms: '50% advance / 50% on delivery',
        subtotal: 7_200_000, tax: 540_000, total: 7_740_000,
        items: [
          { rfqItemId: 'i1', itemName: 'Dell Latitude 5540 Laptop', description: '14" FHD i7 16GB 512GB', quantity: 20, unit: 'units', unitPrice: 255_000, totalPrice: 5_100_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: '27" 4K Monitor', description: 'IPS USB-C HDR400', quantity: 20, unit: 'units', unitPrice: 79_000, totalPrice: 1_580_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'USB-C Docking Station', description: '12-in-1 100W PD', quantity: 20, unit: 'units', unitPrice: 19_000, totalPrice: 380_000, availability: 'available' },
          { rfqItemId: 'i4', itemName: 'Laptop Bag', description: '15.6" backpack', quantity: 20, unit: 'units', unitPrice: 7_000, totalPrice: 140_000, availability: 'unavailable', notes: 'Currently out of stock — can source in 4 weeks' },
        ],
      },
      // RFQ-OUT-2026-002: Cleaning — 3 quotes (awarded)
      {
        id: 'qr-005', rfqId: 'brfq-002', rfqNumber: 'RFQ-OUT-2026-002',
        quotationNumber: 'QT-V005-2026-022',
        vendorId: 'V005', vendorName: 'CleanPro Supplies NG', vendorEmail: 'sales@cleanpro.ng',
        vendorRating: 4.5, vendorVerified: true,
        submittedDate: new Date('2026-06-05'), validUntil: new Date('2026-06-12'),
        status: 'awarded', currency: 'NGN',
        deliveryLeadDays: 3, paymentTerms: 'Advance payment',
        subtotal: 390_000, tax: 29_250, total: 419_250,
        items: [
          { rfqItemId: 'i1', itemName: 'Industrial Floor Cleaner', description: '25L concentrate', quantity: 10, unit: 'jerrycans', unitPrice: 17_500, totalPrice: 175_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: 'Microfibre Cleaning Cloths', description: '40×40cm 300GSM', quantity: 200, unit: 'pcs', unitPrice: 900, totalPrice: 180_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'Hand Sanitiser 5L', description: '70% ethanol', quantity: 20, unit: 'litres', unitPrice: 1_750, totalPrice: 35_000, availability: 'available' },
        ],
      },
      {
        id: 'qr-006', rfqId: 'brfq-002', rfqNumber: 'RFQ-OUT-2026-002',
        quotationNumber: 'QT-V006-2026-008',
        vendorId: 'V006', vendorName: 'FacilitiesMart Ltd', vendorEmail: 'quotes@facilitiesmart.ng',
        vendorRating: 4.1, vendorVerified: true,
        submittedDate: new Date('2026-06-06'), validUntil: new Date('2026-06-13'),
        status: 'rejected', currency: 'NGN',
        deliveryLeadDays: 5, paymentTerms: 'Advance payment',
        subtotal: 420_000, tax: 31_500, total: 451_500,
        items: [
          { rfqItemId: 'i1', itemName: 'Industrial Floor Cleaner', description: '25L concentrate', quantity: 10, unit: 'jerrycans', unitPrice: 19_000, totalPrice: 190_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: 'Microfibre Cleaning Cloths', description: '40×40cm 300GSM', quantity: 200, unit: 'pcs', unitPrice: 950, totalPrice: 190_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'Hand Sanitiser 5L', description: '70% ethanol', quantity: 20, unit: 'litres', unitPrice: 2_000, totalPrice: 40_000, availability: 'available' },
        ],
      },
      // RFQ-OUT-2026-003: Furniture — 2 quotes
      {
        id: 'qr-007', rfqId: 'brfq-003', rfqNumber: 'RFQ-OUT-2026-003',
        quotationNumber: 'QT-V007-2026-014',
        vendorId: 'V007', vendorName: 'Executive Furnishings NG', vendorEmail: 'projects@execfurnish.ng',
        vendorRating: 4.7, vendorVerified: true,
        submittedDate: new Date('2026-06-01'), validUntil: new Date('2026-06-14'),
        status: 'shortlisted', currency: 'NGN',
        deliveryLeadDays: 45, paymentTerms: '50% advance / 50% on delivery',
        notes: 'Includes site survey, full installation and post-delivery touch-ups. Solid walnut available in 4-week lead time.',
        subtotal: 5_800_000, tax: 435_000, total: 6_235_000,
        items: [
          { rfqItemId: 'i1', itemName: 'Boardroom Conference Table', description: '10-seat oval solid walnut veneer', quantity: 1, unit: 'unit', unitPrice: 2_200_000, totalPrice: 2_200_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: 'Executive Leather Chair', description: 'High-back full-grain leather', quantity: 12, unit: 'units', unitPrice: 275_000, totalPrice: 3_300_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'Credenza / Sideboard', description: '1.8m walnut veneer', quantity: 2, unit: 'units', unitPrice: 150_000, totalPrice: 300_000, availability: 'available' },
        ],
      },
      {
        id: 'qr-008', rfqId: 'brfq-003', rfqNumber: 'RFQ-OUT-2026-003',
        quotationNumber: 'QT-V008-2026-031',
        vendorId: 'V008', vendorName: 'Lagos Interior Hub', vendorEmail: 'tenders@lagosinterior.ng',
        vendorRating: 4.2, vendorVerified: false,
        submittedDate: new Date('2026-06-03'), validUntil: new Date('2026-06-17'),
        status: 'received', currency: 'NGN',
        deliveryLeadDays: 60, paymentTerms: 'Net 30',
        subtotal: 6_400_000, tax: 480_000, total: 6_880_000,
        items: [
          { rfqItemId: 'i1', itemName: 'Boardroom Conference Table', description: '10-seat oval solid walnut', quantity: 1, unit: 'unit', unitPrice: 2_800_000, totalPrice: 2_800_000, availability: 'available' },
          { rfqItemId: 'i2', itemName: 'Executive Leather Chair', description: 'High-back full-grain leather', quantity: 12, unit: 'units', unitPrice: 295_000, totalPrice: 3_540_000, availability: 'available' },
          { rfqItemId: 'i3', itemName: 'Credenza / Sideboard', description: '1.8m walnut veneer', quantity: 2, unit: 'units', unitPrice: 30_000, totalPrice: 60_000, availability: 'unavailable', notes: 'Credenza lead time 8 weeks — can be delivered separately' },
        ],
      },
    ];
  }

  // ── Seed: Issued LPOs ─────────────────────────────────────────────────────
  private seedIssuedLpos(): IssuedLpo[] {
    return [
      {
        id: 'il-001', lpoNumber: 'LPO-OUT-2026-001',
        rfqId: 'brfq-002', rfqNumber: 'RFQ-OUT-2026-002',
        quotationId: 'qr-005', quotationNumber: 'QT-V005-2026-022',
        vendorName: 'CleanPro Supplies NG', vendorEmail: 'sales@cleanpro.ng',
        orderName: 'June Cleaning Supplies', department: 'Facilities Management',
        issuedDate: new Date('2026-06-07'),
        deliveryDeadline: new Date('2026-06-20'),
        deliveryAddress: 'Head Office, Lekki Phase 1, Lagos',
        paymentTerms: 'Advance payment',
        status: 'accepted', currency: 'NGN',
        subtotal: 390_000, tax: 29_250, total: 419_250,
        specialConditions: 'Items must be delivered in original sealed packaging. SDS documents required for floor cleaner. Delivery contact: Mrs. Adaeze Okafor (+234 803 111 2222).',
        items: [
          { id: 'li1', name: 'Industrial Floor Cleaner', description: '25L concentrate, pH neutral', quantity: 10, unit: 'jerrycans', unitPrice: 17_500, totalPrice: 175_000 },
          { id: 'li2', name: 'Microfibre Cleaning Cloths', description: '40×40cm 300GSM colour-coded', quantity: 200, unit: 'pcs', unitPrice: 900, totalPrice: 180_000 },
          { id: 'li3', name: 'Hand Sanitiser 5L', description: '70% ethanol, dispenser-compatible', quantity: 20, unit: 'litres', unitPrice: 1_750, totalPrice: 35_000 },
        ],
      },
    ];
  }
}