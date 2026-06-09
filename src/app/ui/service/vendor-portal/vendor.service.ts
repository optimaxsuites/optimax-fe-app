import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  Rfq, Quotation, QuotationItem,
  VendorStats, ItemAvailability,
} from '../../domain/vendor-portal/vendor.dto';

@Injectable({ providedIn: 'root' })
export class VendorService {

  private rfqs$$       = new BehaviorSubject<Rfq[]>(this.seedRfqs());
  private quotations$$ = new BehaviorSubject<Quotation[]>(this.seedQuotations());

  readonly rfqs$       = this.rfqs$$.asObservable();
  readonly quotations$ = this.quotations$$.asObservable();

  // ── RFQ ─────────────────────────────────────────────────────────────────────
  getRfqs(): Observable<Rfq[]> {
    return this.rfqs$.pipe(
      map(list => [...list].sort((a, b) => b.issuedDate.getTime() - a.issuedDate.getTime()))
    );
  }

  markRfqAsRead(id: string): void {
    this.rfqs$$.next(
      this.rfqs$$.getValue().map(r => r.id === id ? { ...r, isRead: true } : r)
    );
  }

  rfqHasQuotation(rfqId: string): boolean {
    return this.quotations$$.getValue().some(q => q.rfqId === rfqId);
  }

  // ── Quotation ────────────────────────────────────────────────────────────────
  getQuotations(): Observable<Quotation[]> {
    return this.quotations$.pipe(
      map(list => [...list].sort((a, b) => b.createdDate.getTime() - a.createdDate.getTime()))
    );
  }

  createQuotationFromRfq(rfq: Rfq): Quotation {
    const items: QuotationItem[] = rfq.items.map(item => ({
      rfqItemId:    item.id,
      name:         item.name,
      description:  item.description,
      quantity:     item.quantity,
      unit:         item.unit,
      unitPrice:    null,
      totalPrice:   null,
      availability: 'available' as ItemAvailability,
    }));

    const quotation: Quotation = {
      id:              `quot-${Date.now()}`,
      quotationNumber: `QT-${new Date().getFullYear()}-${String(this.quotations$$.getValue().length + 1).padStart(3, '0')}`,
      rfqId:           rfq.id,
      rfqNumber:       rfq.rfqNumber,
      clientName:      rfq.clientName,
      createdDate:     new Date(),
      validUntil:      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      status:          'draft',
      items,
      subtotal: 0, tax: 0, total: 0,
      currency: rfq.currency,
      notes:    '',
    };

    this.quotations$$.next([quotation, ...this.quotations$$.getValue()]);
    this.rfqs$$.next(
      this.rfqs$$.getValue().map(r => r.id === rfq.id ? { ...r, status: 'converted' } : r)
    );
    return quotation;
  }

  updateQuotation(q: Quotation): void {
    this.quotations$$.next(
      this.quotations$$.getValue().map(x => x.id === q.id ? this.recalc(q) : x)
    );
  }

  sendQuotation(id: string): void {
    this.quotations$$.next(
      this.quotations$$.getValue().map(q =>
        q.id === id ? { ...q, status: 'sent' as const, sentDate: new Date() } : q
      )
    );
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  getVendorStats(): Observable<VendorStats> {
    const rfqs       = this.rfqs$$.getValue();
    const quotations = this.quotations$$.getValue();
    const now        = new Date();
    const threeDays  = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const accepted   = quotations.filter(q => q.status === 'accepted').length;
    const sent       = quotations.filter(q => q.status === 'sent').length;
    const totalSent  = accepted + sent;

    return of({
      totalRfqs:              rfqs.length,
      unreadRfqs:             rfqs.filter(r => !r.isRead).length,
      openRfqs:               rfqs.filter(r => r.status === 'open').length,
      totalQuotations:        quotations.length,
      draftQuotations:        quotations.filter(q => q.status === 'draft').length,
      sentQuotations:         sent,
      acceptedQuotations:     accepted,
      conversionRate:         totalSent > 0 ? Math.round((accepted / totalSent) * 100) : 0,
      pendingResponseDueSoon: rfqs.filter(r =>
        r.status === 'open' && r.dueDate >= now && r.dueDate <= threeDays
      ).length,
    });
  }

  getApprovedVendors(): Observable<any[]> { return of([]); }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  private recalc(q: Quotation): Quotation {
    const items = q.items.map(item => ({
      ...item,
      totalPrice: item.availability === 'available' && item.unitPrice !== null
        ? item.unitPrice * item.quantity : null,
    }));
    const subtotal = items.reduce((s, i) =>
      i.availability === 'available' && i.unitPrice !== null
        ? s + i.unitPrice * i.quantity : s, 0);
    return { ...q, items, subtotal, tax: subtotal * 0.075, total: subtotal * 1.075 };
  }

  // ── Seed data ─────────────────────────────────────────────────────────────────
  private seedRfqs(): Rfq[] {
    return [
      {
        id: 'rfq-001', rfqNumber: 'RFQ-2026-001',
        clientName: 'Dangote Industries Ltd', clientEmail: 'procurement@dangote.com',
        issuedDate: new Date('2026-06-06'), dueDate: new Date('2026-06-14'),
        status: 'open', isRead: false, currency: 'NGN',
        category: 'Industrial Equipment', totalEstimatedValue: 4_500_000,
        deliveryAddress: '2 Elephant Cement House, Victoria Island, Lagos',
        paymentTerms: 'Net 30',
        clientInstructions: `All quoted items must comply with ISO 9001:2015. Delivery during business hours (8 am–5 pm) only. Include manufacturer warranty docs with each item. Single consolidated delivery required — no partial deliveries. Quote in NGN only; VAT must be separated. Deliver within 21 days of PO issuance. Notify our logistics team 48 hrs before arrival.`,
        items: [
          { id: 'rfq-001-i1', name: 'Industrial Pressure Gauge', description: 'Stainless steel, 0–100 PSI, 2.5″ dial, glycerine filled', quantity: 50, unit: 'pcs', specifications: 'ASME B40.100, SS316L wetted parts', referenceImages: [{ id: 'img-1', url: 'https://placehold.co/400x300/e8f2f7/224957?text=Pressure+Gauge', label: 'Reference model' }] },
          { id: 'rfq-001-i2', name: 'Gate Valve DN80', description: 'Full bore, PN16, flanged ends, body: carbon steel', quantity: 20, unit: 'pcs', specifications: 'Trim: 13Cr, ends: flanged ASME 150#', referenceImages: [{ id: 'img-2', url: 'https://placehold.co/400x300/e8f2f7/224957?text=Gate+Valve', label: 'DN80 reference' }] },
          { id: 'rfq-001-i3', name: 'Pipe Insulation Foam Wrap', description: '2″ dia, 1″ wall, pre-slit, closed-cell elastomeric foam', quantity: 200, unit: 'metres', specifications: 'Thermal conductivity ≤ 0.040 W/m·K' },
        ],
      },
      {
        id: 'rfq-002', rfqNumber: 'RFQ-2026-002',
        clientName: 'Flour Mills of Nigeria Plc', clientEmail: 'supplies@flourmills.com.ng',
        issuedDate: new Date('2026-06-05'), dueDate: new Date('2026-06-20'),
        status: 'open', isRead: false, currency: 'NGN',
        category: 'Office Supplies & IT', totalEstimatedValue: 850_000,
        deliveryAddress: '2 Old Dock Rd, Apapa, Lagos', paymentTerms: 'Advance payment',
        clientInstructions: `All IT equipment must include original manufacturer receipts. Laptops must natively support Windows 11. Prefer branded consumables (HP, Canon, Epson) — no generics accepted. Include delivery and installation charges separately. Minimum quotation validity: 30 days.`,
        items: [
          { id: 'rfq-002-i1', name: 'HP 508A Toner Cartridge Set', description: 'Full set — Black, Cyan, Magenta, Yellow — for HP LaserJet Pro M552/M553', quantity: 10, unit: 'sets', specifications: 'Genuine HP original only', referenceImages: [{ id: 'img-3', url: 'https://placehold.co/400x300/f0f4f8/224957?text=HP+Toner+Set', label: 'HP 508A reference' }] },
          { id: 'rfq-002-i2', name: 'A4 Copy Paper 80gsm', description: 'Ream of 500 sheets, ISO brightness ≥104%, acid-free', quantity: 100, unit: 'reams' },
          { id: 'rfq-002-i3', name: 'USB-C Hub 7-in-1', description: 'HDMI 4K + 3×USB-A + SD/TF + PD 100W, no drivers required', quantity: 15, unit: 'pcs', specifications: 'Compatible: MacBook, Dell XPS, Lenovo ThinkPad', referenceImages: [{ id: 'img-4', url: 'https://placehold.co/400x300/f0f4f8/224957?text=USB-C+Hub', label: 'Hub reference' }] },
        ],
      },
      {
        id: 'rfq-003', rfqNumber: 'RFQ-2026-003',
        clientName: 'GTBank Facilities Management', clientEmail: 'facilities@gtbank.com',
        issuedDate: new Date('2026-06-01'), dueDate: new Date('2026-06-10'),
        status: 'converted', isRead: true, currency: 'NGN',
        category: 'Cleaning & Facilities', totalEstimatedValue: 1_200_000,
        deliveryAddress: '635 Akin Adesola St, Victoria Island, Lagos', paymentTerms: 'Net 45',
        clientInstructions: `Products must be eco-friendly and biodegradable where applicable. Bulk quantities in original sealed containers with SDS sheets. Specify shelf life. Delivery to multiple branch locations may be required — confirm coverage area.`,
        items: [
          { id: 'rfq-003-i1', name: 'Industrial Floor Cleaner', description: 'Concentrated, marble/terrazzo, 25 L jerrycan, pH neutral', quantity: 30, unit: 'jerrycans', specifications: 'Dilution 1:50, fragrance-free, non-slip formula' },
          { id: 'rfq-003-i2', name: 'Microfibre Cleaning Cloths', description: '40×40 cm, 300 GSM, colour-coded by zone', quantity: 500, unit: 'pcs', specifications: 'Machine washable ×500 cycles' },
        ],
      },
      {
        id: 'rfq-004', rfqNumber: 'RFQ-2026-004',
        clientName: 'Nestlé Nigeria Plc', clientEmail: 'procurement@ng.nestle.com',
        issuedDate: new Date('2026-05-28'), dueDate: new Date('2026-06-08'),
        status: 'open', isRead: true, currency: 'NGN',
        category: 'Packaging Materials', totalEstimatedValue: 6_750_000,
        deliveryAddress: '22–24 Industrial Ave, Ilupeju, Lagos', paymentTerms: 'Net 60',
        clientInstructions: `All packaging must meet NAFDAC and SON regulatory requirements. Samples required before bulk confirmation. State lead time clearly. MSDS documents required for chemical-based products. Pricing must include freight to our Ilupeju plant.`,
        items: [
          { id: 'rfq-004-i1', name: 'BOPP Laminated Woven Bags', description: '50 kg capacity, 4-colour offset print, food-grade inner liner', quantity: 10_000, unit: 'pcs', specifications: 'GSM 90±5' },
          { id: 'rfq-004-i2', name: 'Corrugated Carton 30×20×15 cm', description: '3-ply export carton, custom print available', quantity: 5_000, unit: 'pcs', specifications: 'Burst factor ≥12, BCT ≥400 N' },
          { id: 'rfq-004-i3', name: 'Stretch Wrap Film', description: '23 µm clear, 500 mm × 300 m, machine grade', quantity: 100, unit: 'rolls', specifications: 'Pre-stretch 250%, puncture resistant' },
        ],
      },
      {
        id: 'rfq-005', rfqNumber: 'RFQ-2026-005',
        clientName: 'Airtel Nigeria', clientEmail: 'vendor@ng.airtel.com',
        issuedDate: new Date('2026-05-20'), dueDate: new Date('2026-05-30'),
        status: 'expired', isRead: true, currency: 'NGN',
        category: 'Network Hardware', totalEstimatedValue: 12_000_000,
        deliveryAddress: 'Plot 1, Hakeem Balogun St, CBD, Abuja', paymentTerms: 'Net 30',
        clientInstructions: `All network equipment must carry valid OEM warranty. NEBS-compliant hardware preferred. Technical spec sheets and test certifications must accompany quotation. All prices must include installation support costs.`,
        items: [
          { id: 'rfq-005-i1', name: 'Managed Layer 3 Switch 48-Port', description: '48-port gigabit L3 with 4×SFP+ uplinks, PoE+, stackable', quantity: 10, unit: 'units', specifications: 'Cisco Catalyst 9200 or equivalent', referenceImages: [{ id: 'img-5', url: 'https://placehold.co/400x300/e8f2f7/224957?text=L3+Switch', label: 'Switch reference' }] },
        ],
      },
    ];
  }

  private seedQuotations(): Quotation[] {
    return [
      {
        id: 'quot-seed-001', quotationNumber: 'QT-2026-001',
        rfqId: 'rfq-003', rfqNumber: 'RFQ-2026-003',
        clientName: 'GTBank Facilities Management',
        createdDate: new Date('2026-06-02'), sentDate: new Date('2026-06-03'),
        validUntil: new Date('2026-06-17'), status: 'sent', currency: 'NGN',
        subtotal: 980_000, tax: 73_500, total: 1_053_500,
        notes: 'Prices include delivery to all Lagos Island branches. Items in stock — delivery within 5 working days.',
        items: [
          { rfqItemId: 'rfq-003-i1', name: 'Industrial Floor Cleaner', description: 'Concentrated, marble/terrazzo, 25 L jerrycan, pH neutral', quantity: 30, unit: 'jerrycans', unitPrice: 18_500, totalPrice: 555_000, availability: 'available' },
          { rfqItemId: 'rfq-003-i2', name: 'Microfibre Cleaning Cloths', description: '40×40 cm, 300 GSM, colour-coded by zone', quantity: 500, unit: 'pcs', unitPrice: 850, totalPrice: 425_000, availability: 'available' },
        ],
      },
      {
        id: 'quot-seed-002', quotationNumber: 'QT-2026-002',
        rfqId: 'rfq-005', rfqNumber: 'RFQ-2026-005',
        clientName: 'Airtel Nigeria',
        createdDate: new Date('2026-05-22'),
        validUntil: new Date('2026-06-05'), status: 'draft', currency: 'NGN',
        subtotal: 9_800_000, tax: 735_000, total: 10_535_000,
        notes: 'Includes OEM warranty and on-site installation support.',
        items: [
          { rfqItemId: 'rfq-005-i1', name: 'Managed Layer 3 Switch 48-Port', description: '48-port gigabit L3 with 4×SFP+ uplinks, PoE+, stackable', quantity: 10, unit: 'units', unitPrice: 980_000, totalPrice: 9_800_000, availability: 'available' },
        ],
      },
    ];
  }
}