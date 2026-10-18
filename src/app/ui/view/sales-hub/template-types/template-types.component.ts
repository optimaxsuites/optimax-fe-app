import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';

export interface QuoteTemplate {
  id: string;
  name: string;
  description: string;
  previewImage?: string;
  sections: {
    showCustomerDetails: boolean;
    showCompanyLogo: boolean;
    showTaxBreakdown: boolean;
    showShippingDetails: boolean;
    showPaymentTerms: boolean;
    showNotes: boolean;
    showTermsConditions: boolean;
    showSignature: boolean;
    showAttachments: boolean;
    showItemImages: boolean;
    showSKU: boolean;
    showSerialNumbers: boolean;
    showBatchDetails: boolean;
    showSubtotalPerGroup: boolean;
    showTotalInWords: boolean;
    showCurrencySymbol: boolean;
    showVendorInfo: boolean;
    showCustomFields: boolean;
  };
  layout: 'standard' | 'compact' | 'detailed' | 'minimal' | 'emirates' | 'thcomms' | 'emirates-custbank';
  fontSize: 'small' | 'medium' | 'large';
  colorTheme: 'professional' | 'modern' | 'classic' | 'minimal' | 'emirates' | 'thcomms' | 'emirates-custbank';
}

export const QUOTE_TEMPLATES: QuoteTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Professional',
    description: 'Clean, balanced layout with all essential business information',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: true,
      showTaxBreakdown: true,
      showShippingDetails: true,
      showPaymentTerms: true,
      showNotes: true,
      showTermsConditions: true,
      showSignature: true,
      showAttachments: false,
      showItemImages: false,
      showSKU: true,
      showSerialNumbers: false,
      showBatchDetails: false,
      showSubtotalPerGroup: true,
      showTotalInWords: true,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: false
    },
    layout: 'standard',
    fontSize: 'medium',
    colorTheme: 'professional'
  },
  {
    id: 'minimal',
    name: 'Minimal Clean',
    description: 'Stripped-down design focusing only on core quote details',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: false,
      showTaxBreakdown: false,
      showShippingDetails: false,
      showPaymentTerms: false,
      showNotes: false,
      showTermsConditions: false,
      showSignature: false,
      showAttachments: false,
      showItemImages: false,
      showSKU: false,
      showSerialNumbers: false,
      showBatchDetails: false,
      showSubtotalPerGroup: false,
      showTotalInWords: false,
      showCurrencySymbol: true,
      showVendorInfo: false,
      showCustomFields: false
    },
    layout: 'minimal',
    fontSize: 'small',
    colorTheme: 'minimal'
  },
  {
    id: 'detailed',
    name: 'Detailed Comprehensive',
    description: 'Full-featured template with all sections for complex quotes',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: true,
      showTaxBreakdown: true,
      showShippingDetails: true,
      showPaymentTerms: true,
      showNotes: true,
      showTermsConditions: true,
      showSignature: true,
      showAttachments: true,
      showItemImages: true,
      showSKU: true,
      showSerialNumbers: true,
      showBatchDetails: true,
      showSubtotalPerGroup: true,
      showTotalInWords: true,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: true
    },
    layout: 'detailed',
    fontSize: 'medium',
    colorTheme: 'modern'
  },
  {
    id: 'compact',
    name: 'Compact Economy',
    description: 'Space-saving design optimized for printing and quick reviews',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: false,
      showTaxBreakdown: true,
      showShippingDetails: false,
      showPaymentTerms: true,
      showNotes: false,
      showTermsConditions: false,
      showSignature: false,
      showAttachments: false,
      showItemImages: false,
      showSKU: true,
      showSerialNumbers: false,
      showBatchDetails: false,
      showSubtotalPerGroup: false,
      showTotalInWords: false,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: false
    },
    layout: 'compact',
    fontSize: 'small',
    colorTheme: 'classic'
  },
  {
    id: 'custom-client',
    name: 'Client-Facing Premium',
    description: 'Branded template with prominent customer details and visual appeal',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: true,
      showTaxBreakdown: true,
      showShippingDetails: true,
      showPaymentTerms: true,
      showNotes: true,
      showTermsConditions: true,
      showSignature: true,
      showAttachments: true,
      showItemImages: true,
      showSKU: true,
      showSerialNumbers: true,
      showBatchDetails: true,
      showSubtotalPerGroup: true,
      showTotalInWords: true,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: true
    },
    layout: 'detailed',
    fontSize: 'large',
    colorTheme: 'modern'
  },
  {
    id: 'emirates',
    name: 'Emirates Corporate',
    description: 'Elegant layout styled after Emirates Airlines invoices, featuring dual signature sections and structured project metadata',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: true,
      showTaxBreakdown: true,
      showShippingDetails: false,
      showPaymentTerms: true,
      showNotes: true,
      showTermsConditions: true,
      showSignature: true,
      showAttachments: false,
      showItemImages: false,
      showSKU: false,
      showSerialNumbers: false,
      showBatchDetails: false,
      showSubtotalPerGroup: false,
      showTotalInWords: true,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: false
    },
    layout: 'emirates',
    fontSize: 'medium',
    colorTheme: 'emirates'
  },
  {
    id: 'emirates-custbank',
    name: 'Emirates with Customer Bank',
    description: 'Elegant Emirates Corporate layout including client bank account details in the invoice information',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: true,
      showTaxBreakdown: true,
      showShippingDetails: false,
      showPaymentTerms: true,
      showNotes: true,
      showTermsConditions: true,
      showSignature: true,
      showAttachments: false,
      showItemImages: false,
      showSKU: false,
      showSerialNumbers: false,
      showBatchDetails: false,
      showSubtotalPerGroup: false,
      showTotalInWords: true,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: false
    },
    layout: 'emirates-custbank',
    fontSize: 'medium',
    colorTheme: 'emirates-custbank'
  },
  {
    id: 'thcomms',
    name: '13th Comms Modern',
    description: 'Clean modern template based on 13th Communications Ltd invoices with custom right-aligned header and clean billing metadata',
    sections: {
      showCustomerDetails: true,
      showCompanyLogo: false,
      showTaxBreakdown: true,
      showShippingDetails: false,
      showPaymentTerms: true,
      showNotes: true,
      showTermsConditions: true,
      showSignature: false,
      showAttachments: false,
      showItemImages: false,
      showSKU: false,
      showSerialNumbers: false,
      showBatchDetails: false,
      showSubtotalPerGroup: false,
      showTotalInWords: false,
      showCurrencySymbol: true,
      showVendorInfo: true,
      showCustomFields: false
    },
    layout: 'thcomms',
    fontSize: 'medium',
    colorTheme: 'thcomms'
  }
];

/**
 * Delivery note recipient fields that vary by template. To, Address, Date Sent and Our Contact
 * Person are on every delivery note, as are the Quantity Delivered / Description / Date of
 * Delivery / Signature table and the Name / Signature / Date sign-off — only these can be left out.
 */
// No invoice number: invoices are only created after the signed delivery note comes back.
export type DeliveryNoteOptionalField = 'attention' | 'lpoNumber' | 'telephone';

const ALL_DELIVERY_NOTE_FIELDS: DeliveryNoteOptionalField[] = ['attention', 'lpoNumber', 'telephone'];

/** Which optional fields each template shows on a delivery note — used by both the gallery
 *  thumbnails and DeliveryNoteDocumentComponent so the two always match. */
export const DELIVERY_NOTE_OPTIONAL_FIELDS: Record<string, DeliveryNoteOptionalField[]> = {
  'standard': ALL_DELIVERY_NOTE_FIELDS,
  'minimal': ['lpoNumber'],
  'detailed': ALL_DELIVERY_NOTE_FIELDS,
  'compact': ['lpoNumber', 'telephone'],
  'custom-client': ALL_DELIVERY_NOTE_FIELDS,
  'emirates': ALL_DELIVERY_NOTE_FIELDS,
  'thcomms': ['attention', 'lpoNumber', 'telephone']
};

/** Whether a delivery note rendered with this template shows an optional field (all show without a template). */
export function deliveryNoteShowsField(templateId: string | null | undefined, field: DeliveryNoteOptionalField): boolean {
  if (!templateId) return true;
  return (DELIVERY_NOTE_OPTIONAL_FIELDS[templateId] || ALL_DELIVERY_NOTE_FIELDS).includes(field);
}

/** Accent colour per template id — shared by the gallery cards and by documents rendered with a
 *  chosen template (e.g. the delivery note), so both carry the same colour. */
export const TEMPLATE_ACCENT_COLORS: Record<string, string> = {
  'standard': '#1a2d4a',
  'minimal': '#4a5a6e',
  'detailed': '#2a4a6a',
  'compact': '#3a6a8a',
  'custom-client': '#2EB270',
  'emirates': '#A32638',
  'emirates-custbank': '#A32638',
  'thcomms': '#1B365D'
};

@Component({
  selector: 'app-template-types',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './template-types.component.html',
  styleUrls: ['./template-types.component.scss']
})
export class TemplateTypesComponent implements OnInit {
  @Input() quoteData: any; // Quote form data
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

  /** Templates offered for this document type. A delivery note has no prices, tax or bank details,
   *  so 'emirates-custbank' (Emirates + customer bank) would be identical to 'emirates' there. */
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

  // A hardcoded customerTemplatePreferences map used to live here (5 fake customer IDs like
  // 'CUST-001' mapped to made-up template preferences, "simulated - would come from API"). Real
  // customer ids never match those literals, so it silently never fired for any actual customer
  // — removed rather than kept as fake personalization.
  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    // Honour a template the parent passed in (e.g. one already saved), otherwise use the first one
    this.selectedTemplate = this.visibleTemplates.find(t => t.id === this.selectedTemplateId) || this.visibleTemplates[0] || null;
    this.selectedTemplateId = this.selectedTemplate?.id || '';
  }

  selectTemplate(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.selectedTemplate = this.templates.find(t => t.id === templateId) || null;
    this.templateSelected.emit(this.selectedTemplate || undefined);
  }

  getTemplatePreview(template: QuoteTemplate): string {
    // In a real implementation, this would return a preview image URL
    // For now, we'll return a placeholder based on template ID
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

  /** Delivery notes get their own wording — the shared descriptions talk about quotes, totals and invoices. */
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

  // Keyed by template.id (not template.layout) — 'detailed' and 'custom-client'
  // share the same `layout` value but must render as two distinct mockups,
  // matching their two distinct bespoke real preview layouts in the form.
  getLayoutKey(templateId: string): string {
    const map: Record<string, string> = {
      standard: 'standard',
      minimal: 'minimal',
      detailed: 'detailed',
      compact: 'compact',
      'custom-client': 'custom-client',
      emirates: 'centrifuge',
      'emirates-custbank': 'centrifuge',
      thcomms: 'standard'
    };
    return map[templateId] ?? 'standard';
  }

  isTemplateDefault(template: QuoteTemplate): boolean {
    return template.id === 'standard';
  }

  // Derives a short list of feature tags from the template's visible sections,
  // matching the tag-pill style used by the RFQ template selector.
  getTemplateTags(template: QuoteTemplate): string[] {
    const sections = template.sections;
    if (this.isDeliveryNote) {
      // Only what differs between delivery note templates (see DeliveryNoteDocumentComponent) —
      // the table, core recipient fields and sign-off are on every one.
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