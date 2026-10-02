import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DeliveryNote, MerchantInfo } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';

/**
 * The delivery note document itself — rendered identically wherever a delivery note needs to be
 * shown (the Generate Delivery Note wizard's step 2 preview, and the Delivery Note detail page),
 * laid out to match the company's existing paper template exactly: a boxed sender header with
 * logo, a To/Address/PO/Invoice/Contact meta table, a Quantity/Description/Date/Signature items
 * table, and a "Goods received in good order" sign-off strip.
 *
 * Fields the real template has but the backend DeliveryNote resource has no column for
 * (PO/LPO number, Attention, Our Contact Person, Per Invoice Number) are passed in as separate
 * inputs rather than read off `note` — see DeliveryNoteMeta's doc comment for where they're
 * actually persisted (the quote's additionalOptions).
 */
@Component({
  selector: 'app-delivery-note-document',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-note-document.component.html',
  styleUrls: ['./delivery-note-document.component.scss']
})
export class DeliveryNoteDocumentComponent {
  @Input() elementId = 'delivery-note-document';
  @Input() note!: DeliveryNote;
  @Input() merchantInfo: MerchantInfo | null = null;
  @Input() customerName = '';
  @Input() customerPhone = '';
  @Input() poNumber = '';
  @Input() attention = '';
  @Input() contactPerson = '';
  @Input() invoiceNumber = '';
  /** Single delivery date applied to every line item — the backend's DeliveryNoteItem has no
   *  per-item date field, so unlike the paper template (which can show a different date per
   *  line), this is one shared value for the whole shipment. */
  @Input() deliveryDate: Date | string | null | undefined = null;

  get merchantAddressLines(): string[] {
    const addr = this.merchantInfo?.address;
    return Array.isArray(addr) ? addr : (addr ? [addr as any] : []);
  }

  get logoUrl(): string | null {
    const logo = this.merchantInfo?.logoUrl;
    return Array.isArray(logo) ? (logo[0] || null) : (logo as any) || null;
  }

  formatDate(date: unknown): string {
    return formatApiDate(date);
  }
}
