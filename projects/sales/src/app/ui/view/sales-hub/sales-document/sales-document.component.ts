import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { QuoteTemplate, TEMPLATE_ACCENT_COLORS, templateLayoutKey } from '../template-types/template-types.component';
import { SalesDocumentModel, amountInWords, documentTitle, formatDocumentDate } from '../../../service/sales/sales-document';

/**
 * A quote, invoice or payment receipt as a real A4 page (794px wide — A4 at 96dpi), laid out
 * in the template the seller picked: the same layouts the template gallery previews (standard,
 * corporate, minimal, detailed, compact, premium), with the template's accent colour, font size
 * and section switches. Receipts use a conventional receipt layout in the template's colour.
 *
 * The detail pages show it, and downloads/email attachments are rendered from it (see
 * renderElementToPdf), so the PDF is the chosen template at full page size rather than a
 * screenshot of a form preview.
 */
@Component({
  selector: 'app-sales-document',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sales-document.component.html',
  styleUrls: ['./sales-document.component.scss']
})
export class SalesDocumentComponent {
  @Input({ required: true }) doc!: SalesDocumentModel;
  @Input() template: QuoteTemplate | null = null;
  @Input() elementId = 'sales-document';

  get layout(): string {
    return this.doc?.kind === 'RECEIPT' ? 'receipt' : templateLayoutKey(this.template?.id);
  }

  get accent(): string {
    if (this.template) return TEMPLATE_ACCENT_COLORS[this.template.id] || '#1a2d4a';
    return this.doc?.kind === 'RECEIPT' ? '#2f6db5' : '#1a2d4a';
  }

  get fontClass(): string {
    return 'sd-font-' + (this.template?.fontSize || 'medium');
  }

  get title(): string {
    return documentTitle(this.doc.kind);
  }

  /** Template section switch — everything shows when no template is applied. */
  show(key: keyof QuoteTemplate['sections']): boolean {
    return !this.template || !!this.template.sections[key];
  }

  get showTax(): boolean {
    return this.show('showTaxBreakdown');
  }

  get hasLineTax(): boolean {
    return this.showTax && this.doc.lines.some(l => (l.taxRate || 0) > 0);
  }

  /** "Tax @ 7.5%" when every taxed line shares a rate, else "Tax". */
  get taxLabel(): string {
    const rates = Array.from(new Set(this.doc.lines.map(l => l.taxRate || 0).filter(r => r > 0)));
    return rates.length === 1 ? `Tax @ ${rates[0]}%` : 'Tax';
  }

  get words(): string {
    return amountInWords(this.doc.kind === 'RECEIPT' ? (this.doc.paidNow ?? this.doc.total) : this.doc.total, this.doc.currency);
  }

  money(amount: number | undefined): string {
    const value = Number(amount) || 0;
    try {
      return new Intl.NumberFormat('en-NG', { style: 'currency', currency: this.doc.currency || 'NGN' }).format(value);
    } catch {
      return `${this.doc.currency} ${value.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
    }
  }

  date(value: unknown): string {
    return formatDocumentDate(value);
  }
}
