import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SalesDeliveryNote, MerchantInfo } from '../../../../domain/sales/sales.dto';
import { formatApiDate } from '../../../../service/sales/date.util';
import {
  QuoteTemplate, TEMPLATE_ACCENT_COLORS, DeliveryNoteOptionalField, deliveryNoteShowsField
} from '../../template-types/quote-templates.config';

interface MetaCell { label: string; value: string; rowspan?: number; }
interface MetaRow { left?: MetaCell; right?: MetaCell; }

/**
 * The delivery note document itself — rendered identically wherever a delivery note needs to be
 * shown (the Generate Delivery Note wizard's step 2 preview, and the Delivery Note detail page),
 * laid out to match the company's existing paper template exactly: a boxed sender header with
 * logo, a To/Address/PO/Invoice/Contact meta table, a Quantity/Description/Date/Signature items
 * table, and a "Goods received in good order" sign-off strip.
 *
 * Fields the real template has but the backend SalesDeliveryNote resource has no column for
 * (PO/LPO number, Attention, Our Contact Person) are passed in as separate
 * inputs rather than read off `note` — see SalesDeliveryNoteMeta's doc comment for where they're
 * actually persisted (the quote's additionalOptions).
 *
 * `template` applies a TemplateTypesComponent template the same way the quote/invoice previews do:
 * its accent colour, font size and logo toggle, plus which optional recipient fields
 * show (DELIVERY_NOTE_OPTIONAL_FIELDS). The items table and the Name/Signature/Date sign-off are
 * the same on every template. Without one (notes generated before templates existed) it renders
 * as the plain black paper template with every field.
 */
@Component({
  selector: 'app-delivery-note-document',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './delivery-note-document.component.html',
  styleUrls: ['./delivery-note-document.component.scss']
})
export class DeliveryNoteDocumentComponent implements OnChanges {
  @Input() elementId = 'delivery-note-document';
  @Input() note!: SalesDeliveryNote;
  @Input() merchantInfo: MerchantInfo | null = null;
  @Input() customerName = '';
  @Input() customerPhone = '';
  @Input() poNumber = '';
  @Input() attention = '';
  @Input() contactPerson = '';
  /** Fallback when the note itself has no address saved yet (e.g. the customer's on file). */
  @Input() customerAddress = '';
  /** Overrides the company-profile logo — the logo uploaded for this delivery note, or its quote's. */
  @Input() logo: string | null = null;
  /** Single delivery date applied to every line item — the backend's SalesDeliveryNoteItem has no
   *  per-item date field, so unlike the paper template (which can show a different date per
   *  line), this is one shared value for the whole shipment. */
  @Input() deliveryDate: Date | string | null | undefined = null;
  @Input() template: QuoteTemplate | null = null;

  get accentColor(): string | null {
    return this.template ? TEMPLATE_ACCENT_COLORS[this.template.id] || null : null;
  }

  showField(field: DeliveryNoteOptionalField): boolean {
    return deliveryNoteShowsField(this.template?.id, field);
  }

  /**
   * Recipient table rows. The left column is To, Address (spanning the middle rows) and, if shown,
   * Attention; the right column lists the references. With every field shown this reproduces the
   * paper template's exact arrangement. Rebuilt on input changes (not a getter) so the table isn't
   * re-rendered on every change detection pass.
   */
  metaRows: MetaRow[] = [];

  ngOnChanges(): void {
    if (this.note) this.metaRows = this.buildMetaRows();
  }

  private buildMetaRows(): MetaRow[] {
    const dash = (v: string | null | undefined) => v || '—';
    const right: MetaCell[] = [];
    if (this.showField('lpoNumber')) right.push({ label: 'LPO Number :', value: dash(this.poNumber) });
    right.push({ label: 'Date Sent :', value: this.formatDate(this.note.createdAt) });
    right.push({ label: 'Our Contact Person :', value: dash(this.contactPerson) });
    if (this.showField('telephone')) right.push({ label: 'Telephone :', value: dash(this.customerPhone) });

    const showAttention = this.showField('attention');
    const rowCount = Math.max(right.length, showAttention ? 3 : 2);
    const rows: MetaRow[] = Array.from({ length: rowCount }, (_, i) => ({ right: right[i] }));
    rows[0].left = { label: 'To :', value: dash(this.customerName) };
    rows[1].left = { label: 'Address :', value: this.note.customerAddress || this.customerAddress || '—', rowspan: rowCount - 1 - (showAttention ? 1 : 0) };
    if (showAttention) rows[rowCount - 1].left = { label: 'Attention :', value: dash(this.attention) };
    return rows;
  }

  /** Whether a template section should render — everything shows when no template is applied. */
  showSection(key: keyof QuoteTemplate['sections']): boolean {
    return !this.template || !!this.template.sections[key];
  }

  get merchantAddressLines(): string[] {
    const addr = this.merchantInfo?.address;
    return Array.isArray(addr) ? addr : (addr ? [addr as any] : []);
  }

  get logoUrl(): string | null {
    if (this.logo) return this.logo;
    const logo = this.merchantInfo?.logoUrl;
    return Array.isArray(logo) ? (logo[0] || null) : (logo as any) || null;
  }

  formatDate(date: unknown): string {
    return formatApiDate(date);
  }
}
