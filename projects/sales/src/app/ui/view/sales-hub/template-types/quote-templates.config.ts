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

export type DeliveryNoteOptionalField = 'attention' | 'lpoNumber' | 'telephone';

export const ALL_DELIVERY_NOTE_FIELDS: DeliveryNoteOptionalField[] = ['attention', 'lpoNumber', 'telephone'];

export const DELIVERY_NOTE_OPTIONAL_FIELDS: Record<string, DeliveryNoteOptionalField[]> = {
  'standard': ALL_DELIVERY_NOTE_FIELDS,
  'minimal': ['lpoNumber'],
  'detailed': ALL_DELIVERY_NOTE_FIELDS,
  'compact': ['lpoNumber', 'telephone'],
  'custom-client': ALL_DELIVERY_NOTE_FIELDS,
  'emirates': ALL_DELIVERY_NOTE_FIELDS,
  'thcomms': ['attention', 'lpoNumber', 'telephone']
};

export function deliveryNoteShowsField(templateId: string | null | undefined, field: DeliveryNoteOptionalField): boolean {
  if (!templateId) return true;
  return (DELIVERY_NOTE_OPTIONAL_FIELDS[templateId] || ALL_DELIVERY_NOTE_FIELDS).includes(field);
}

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

/** Which layout key a template id maps to — shared by the gallery thumbnails and the real
 *  documents (SalesDocumentComponent) so a seller gets the layout they picked. 'detailed' and
 *  'custom-client' share a section set but are two distinct layouts. */
export function templateLayoutKey(templateId: string | null | undefined): string {
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
  return (templateId && map[templateId]) || 'standard';
}
