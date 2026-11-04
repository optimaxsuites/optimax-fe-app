import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  QuoteTemplate,
  QUOTE_TEMPLATES,
  DeliveryNoteOptionalField,
  DELIVERY_NOTE_OPTIONAL_FIELDS,
  ALL_DELIVERY_NOTE_FIELDS,
  TEMPLATE_ACCENT_COLORS,
  deliveryNoteShowsField,
  templateLayoutKey,
} from './quote-templates.config';

export {
  QuoteTemplate,
  QUOTE_TEMPLATES,
  DeliveryNoteOptionalField,
  DELIVERY_NOTE_OPTIONAL_FIELDS,
  ALL_DELIVERY_NOTE_FIELDS,
  TEMPLATE_ACCENT_COLORS,
  deliveryNoteShowsField,
  templateLayoutKey,
} from './quote-templates.config';

@Component({
  selector: 'app-template-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-types.component.html',
  styleUrls: ['./template-types.component.scss']
})
export class TemplateTypesComponent implements OnInit {
  @Input() quoteData: any;
  @Input() selectedTemplateId: string = '';
  @Input() documentType: 'quote' | 'invoice' | 'delivery-note' = 'quote';

  get docLabel(): string {
    const labels = { quote: 'Quotation', invoice: 'Invoice', 'delivery-note': 'Delivery Note' };
    return labels[this.documentType];
  }

  /** Sample document number on the thumbnails. */
  get sampleNumber(): string {
    return this.documentType === 'invoice' ? 'INV-2026-001' : this.documentType === 'delivery-note' ? 'DN-2026-001' : 'QT-2026-001';
  }

  get isDeliveryNote(): boolean {
    return this.documentType === 'delivery-note';
  }

  get visibleTemplates(): QuoteTemplate[] {
    return this.isDeliveryNote ? this.templates.filter(t => t.id !== 'emirates-custbank') : this.templates;
  }
  @Output() templateSelected = new EventEmitter<QuoteTemplate>();
  @Output() createAction = new EventEmitter<{ action: 'pdf' | 'email' | 'both' }>();
  @Output() back = new EventEmitter<void>();

  templates: QuoteTemplate[] = QUOTE_TEMPLATES;

  selectedTemplate: QuoteTemplate | null = null;
  selectedAction: 'pdf' | 'email' | 'both' = 'pdf';
  showActionSelection: boolean = false;

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.selectedTemplate = this.visibleTemplates.find(t => t.id === this.selectedTemplateId) || this.visibleTemplates[0] || null;
    this.selectedTemplateId = this.selectedTemplate?.id || '';
  }

  selectTemplate(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.selectedTemplate = this.templates.find(t => t.id === templateId) || null;
    this.templateSelected.emit(this.selectedTemplate || undefined);
  }

  getTemplatePreview(template: QuoteTemplate): string {
    const previewMap: { [key: string]: string } = {
      'standard': '📄 Standard Template',
      'minimal': '📝 Minimal Template',
      'detailed': '📊 Detailed Template',
      'compact': '📋 Compact Template',
      'custom-client': '⭐ Premium Template',
      'emirates': '✈️ Emirates Airlines Template',
      'emirates-custbank': '✈️ Emirates (with Client Bank)',
      'thcomms': '📡 13th Comms Template'
    };
    return previewMap[template.id] || '📄 Template Preview';
  }

  getSectionStatus(section: string): string {
    if (!this.selectedTemplate) return 'hidden';
    const sections = this.selectedTemplate.sections as any;
    return sections[section] ? 'visible' : 'hidden';
  }

  proceedToAction(): void {
    if (!this.selectedTemplate) {
      this.messageService.add({ severity: 'warn', summary: 'Warning', detail: 'Please select a template first' });
      return;
    }
    this.showActionSelection = true;
  }

  confirmCreate(action: 'pdf' | 'email' | 'both'): void {
    this.createAction.emit({ action });
  }

  goBack(): void {
    if (this.showActionSelection) {
      this.showActionSelection = false;
    } else {
      this.back.emit();
    }
  }

  getTemplateDescription(template: QuoteTemplate): string {
    // The shared descriptions are written for quotes — say "invoice" when picking an invoice's template
    if (this.documentType === 'invoice') {
      return template.description.replace(/\bquote(s?)\b/gi, (_m, plural) => `invoice${plural}`);
    }
    if (!this.isDeliveryNote) return template.description;
    const descriptions: Record<string, string> = {
      'standard': 'Balanced layout with logo and full recipient details',
      'minimal': 'Just the essentials: recipient, address, LPO number, date sent and contact person',
      'detailed': 'Every delivery field, with logo, in a detailed layout',
      'compact': 'Space-saving, printer-friendly layout with the LPO number and telephone',
      'custom-client': 'Branded green layout with logo and full recipient details',
      'emirates': 'Elegant corporate layout with logo and full recipient details',
      'thcomms': 'Clean modern layout with attention, LPO number and telephone, no logo'
    };
    return descriptions[template.id] || template.description;
  }

  dnShows(template: QuoteTemplate, field: DeliveryNoteOptionalField): boolean {
    return deliveryNoteShowsField(template.id, field);
  }

  getTemplateIcon(templateId: string): string {
    const icons: { [key: string]: string } = {
      'standard': 'fa-file-alt',
      'minimal': 'fa-file',
      'detailed': 'fa-file-pdf',
      'compact': 'fa-file-contract',
      'custom-client': 'fa-file-invoice',
      'emirates': 'fa-plane',
      'emirates-custbank': 'fa-plane-departure',
      'thcomms': 'fa-broadcast-tower'
    };
    return icons[templateId] || 'fa-file';
  }

  getTemplateColor(templateId: string): string {
    return TEMPLATE_ACCENT_COLORS[templateId] || '#1a2d4a';
  }

  getLayoutKey(templateId: string): string {
    return templateLayoutKey(templateId);
  }

  isTemplateDefault(template: QuoteTemplate): boolean {
    return template.id === 'standard';
  }

  getTemplateTags(template: QuoteTemplate): string[] {
    const sections = template.sections;
    if (this.isDeliveryNote) {
      const fieldLabels: Record<DeliveryNoteOptionalField, string> = {
        attention: 'Attention', lpoNumber: 'LPO No.', telephone: 'Telephone'
      };
      const fields = DELIVERY_NOTE_OPTIONAL_FIELDS[template.id] || ALL_DELIVERY_NOTE_FIELDS;
      const tags: string[] = [];
      if (sections.showCompanyLogo) tags.push('Logo');
      if (fields.length === ALL_DELIVERY_NOTE_FIELDS.length) tags.push('Full Recipient Details');
      else tags.push(...fields.map(f => fieldLabels[f]));
      return tags;
    }
    const labels: [keyof QuoteTemplate['sections'], string][] = [
      ['showCustomerDetails', 'Customer Details'],
      ['showCompanyLogo', 'Logo'],
      ['showTaxBreakdown', 'Tax Breakdown'],
      ['showPaymentTerms', 'Payment Terms'],
      ['showNotes', 'Notes'],
      ['showTermsConditions', 'Terms'],
      ['showSignature', 'Signature'],
      ['showItemImages', 'Item Images'],
      ['showSKU', 'SKU']
    ];
    return labels.filter(([key]) => sections[key]).map(([, label]) => label).slice(0, 4);
  }
}
