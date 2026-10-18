import { of } from 'rxjs';

import { DeliveryNoteListComponent } from './delivery-note-list.component';
import { SalesService } from '../../../../service/sales/sales.service';
import { SalesDeliveryNote, Quote } from '../../../../domain/sales/sales.dto';

describe('DeliveryNoteListComponent', () => {
  let component: DeliveryNoteListComponent;
  let salesService: jasmine.SpyObj<SalesService>;

  const quote = (over: Partial<Quote> = {}): Quote => ({
    id: 1, quoteNumber: 'QUO-1', status: 'CONVERTED', customerName: { name: 'Acme Co' } as any, items: [], ...over
  } as Quote);

  const note = (over: Partial<SalesDeliveryNote> = {}): SalesDeliveryNote => ({
    id: 1, deliveryNumber: 'DN-1', status: 'PENDING', customerId: 1,
    items: [], customerAddress: '', ...over
  } as SalesDeliveryNote);

  beforeEach(() => {
    salesService = jasmine.createSpyObj<SalesService>('SalesService', ['getConvertedQuotesAwaitingDeliveryNote', 'getDeliveryNotes', 'getCustomers', 'getOrderIdLookup']);
    salesService.getCustomers.and.returnValue(of({ data: [{ id: 1, name: 'Acme Co' }, { id: 2, name: 'Globex' }], total: 2 } as any));
    salesService.getOrderIdLookup.and.returnValue(of({ byQuoteId: new Map(), byTransactionId: new Map(), byInvoiceId: new Map() }));
    component = new DeliveryNoteListComponent(
      { add: jasmine.createSpy('add') } as any,
      salesService,
      { snapshot: { paramMap: { get: () => null } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any
    );
  });

  it('combines converted quotes awaiting a note and real delivery note records into one row set', () => {
    salesService.getConvertedQuotesAwaitingDeliveryNote.and.returnValue(of([quote({ id: 5, quoteNumber: 'QUO-5' })]));
    salesService.getDeliveryNotes.and.returnValue(of({ data: [note({ id: 9, deliveryNumber: 'DN-9', status: 'DISPATCHED' })], total: 1 } as any));

    component.loadData();

    expect(component.rows.length).toBe(2);
    expect(component.rows.some(r => r.kind === 'pending' && r.displayNumber === 'QUO-5')).toBeTrue();
    expect(component.rows.some(r => r.kind === 'note' && r.displayNumber === 'DN-9' && r.status === 'DISPATCHED')).toBeTrue();
  });

  it('computes stats across both pending quotes and real records', () => {
    salesService.getConvertedQuotesAwaitingDeliveryNote.and.returnValue(of([quote(), quote({ id: 2 })]));
    salesService.getDeliveryNotes.and.returnValue(of({
      data: [note({ status: 'PENDING' }), note({ id: 2, status: 'DISPATCHED' }), note({ id: 3, status: 'DELIVERED' })],
      total: 3
    } as any));

    component.loadData();

    expect(component.stats.awaitingNote).toBe(2);
    expect(component.stats.pending).toBe(1);
    expect(component.stats.dispatched).toBe(1);
    expect(component.stats.delivered).toBe(1);
    expect(component.stats.total).toBe(5);
  });

  describe('applyFilters', () => {
    beforeEach(() => {
      salesService.getConvertedQuotesAwaitingDeliveryNote.and.returnValue(of([quote({ id: 5, quoteNumber: 'QUO-5', customerName: { name: 'Acme Co' } as any })]));
      salesService.getDeliveryNotes.and.returnValue(of({ data: [note({ id: 9, deliveryNumber: 'DN-9', status: 'DELIVERED', customerId: 2 })], total: 1 } as any));
      component.loadData();
    });

    it('filters by status', () => {
      component.filters.status = 'DELIVERED';
      component.applyFilters();
      expect(component.filteredRows.length).toBe(1);
      expect(component.filteredRows[0].displayNumber).toBe('DN-9');
    });

    it('filters by search term against both reference and customer name', () => {
      component.filters.status = 'ALL';
      component.filters.searchTerm = 'acme';
      component.applyFilters();
      expect(component.filteredRows.length).toBe(1);
      expect(component.filteredRows[0].displayNumber).toBe('QUO-5');
    });
  });

  it('canEdit only allows editing a real PENDING delivery note, not a pending quote or a non-pending note', () => {
    const pendingRow = { kind: 'pending' as const, id: 1, displayNumber: '', orderId: '—', customerName: '', itemCount: 0, status: 'AWAITING_NOTE' as const, date: null, source: quote() };
    const draftRow = { kind: 'note' as const, id: 1, displayNumber: '', orderId: '—', customerName: '', itemCount: 0, status: 'PENDING' as const, date: null, source: note() };
    const dispatchedRow = { kind: 'note' as const, id: 2, displayNumber: '', orderId: '—', customerName: '', itemCount: 0, status: 'DISPATCHED' as const, date: null, source: note() };

    expect(component.canEdit(pendingRow)).toBeFalse();
    expect(component.canEdit(draftRow)).toBeTrue();
    expect(component.canEdit(dispatchedRow)).toBeFalse();
  });

  it('generateFromQuote navigates to the LPO wizard with the quote id', () => {
    const router = (component as any).router;
    component.generateFromQuote({ id: 7 } as any);
    expect(router.navigate).toHaveBeenCalledWith(['/admin/sales/delivery-notes/generate'], { queryParams: { quoteId: '7' } });
  });
});
