import { DeliveryNoteDocumentComponent } from './delivery-note-document.component';
import { QUOTE_TEMPLATES } from '../../template-types/template-types.component';
import { SalesDeliveryNote } from '../../../../domain/sales/sales.dto';

describe('DeliveryNoteDocumentComponent', () => {
  let component: DeliveryNoteDocumentComponent;

  const template = (id: string) => QUOTE_TEMPLATES.find(t => t.id === id)!;
  const labels = () => component.metaRows.map(r => [r.left?.label, r.right?.label]);

  beforeEach(() => {
    component = new DeliveryNoteDocumentComponent();
    component.note = { id: 1, deliveryNumber: 'DN-1', status: 'PENDING', customerAddress: '1 Main St', items: [], createdAt: '2026-07-31' } as SalesDeliveryNote;
    component.customerName = 'Acme Co';
    component.contactPerson = 'A. Bello';
  });

  it('reproduces the paper template arrangement when no template is applied', () => {
    component.ngOnChanges();

    expect(labels()).toEqual([
      ['To :', 'LPO Number :'],
      ['Address :', 'Date Sent :'],
      [undefined, 'Per Invoice Number :'],
      [undefined, 'Our Contact Person :'],
      ['Attention :', 'Telephone :']
    ]);
    expect(component.metaRows[1].left?.rowspan).toBe(3);
  });

  it('always keeps To, Address, Date Sent and Our Contact Person, dropping the template\'s optional fields', () => {
    component.template = template('minimal');
    component.ngOnChanges();

    expect(labels()).toEqual([
      ['To :', 'LPO Number :'],
      ['Address :', 'Date Sent :'],
      [undefined, 'Our Contact Person :']
    ]);
    expect(component.metaRows[1].left?.rowspan).toBe(2);
    expect(component.metaRows[0].left?.value).toBe('Acme Co');
  });

  it('keeps Attention on the last row when the template shows it', () => {
    component.template = template('thcomms');
    component.ngOnChanges();

    const rows = component.metaRows;
    expect(rows[rows.length - 1].left?.label).toBe('Attention :');
    expect(rows[1].left?.rowspan).toBe(rows.length - 2);
  });
});
