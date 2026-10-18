//sales.dto.ts
// Enum Structures
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';

export type ProductStatus = 'ACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK';

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CONVERTED';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'CANCELLED';

export type PaymentMode = 'MONTHLY' | 'ONE-OFF';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE' | 'POS' | 'MOBILE_MONEY';

export type SaleLifecycleStatus =
  | 'QUOTE_SENT'
  | 'QUOTE_ACCEPTED'
  | 'QUOTE_REJECTED'
  | 'QUOTE_CONVERTED'
  | 'INVOICE_SENT'
  | 'INVOICE_CANCELLED'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_IN_PROGRESS'
  | 'PAYMENT_COMPLETED'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_REFUNDED'
  | 'RECEIPT_GENERATED'
  | 'DELIVERY_PENDING'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'RETURNED'
  ;

// DTOs
export interface CustomerBankDetails {
  bankName: string;
  accountName: string;
  accountNumber: string;
  routingNumber?: string; // remove later
}

export interface Customer {
  id: number;
  customerId: string;
  name: string;
  email: string;
  phone: string;
  address: string[]; // billing address
  deliverAddress: string[];
  taxId?: string;
  createdBy: string;
  createdAt: Date;
  totalSpent: number;
  totalOrders: number;
  status: CustomerStatus;
  notes?: string;
  bankAccounts?: CustomerBankDetails[];
}

export interface ProductVariantAttributes {
  color?: string;
  size?: string;
  material?: string;
  model?: string;
  year?: string | number;
  [key: string]: any;
}

export interface ProductVariant {
  id?: number;
  variantId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  attributes?: ProductVariantAttributes;
}

export interface Category {
  id: number;
  categoryId: string;
  name: string;
  description?: string;
}

export interface MeasurementUnit {
  id?: number;
  unitId: string;
  name: string;
  code?: string;
  description?: string;
}

export interface Supplier {
  id?: number;
  supplierId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactPerson?: string;
}

export interface StockMovement {
  id?: number;
  supplierId?: Supplier;
  movementDate: Date | string;
  movementQuantity: number;
  movementPurchasePrice?: number;
  movementTax?: number;
  reference?: string;
}

export interface ComboProduct {
  id?: number;
  comboId: string;
  comboName: string;
  quantity: number;
  unitPrice?: number;
}

export interface Product {
  id: number;
  productId: string;
  name: string;
  sku: string;
  description: string;
  measurementUnit?: MeasurementUnit;
  partNumber: string;
  code: string;
  reorderThreshold: number;
  weight: number;
  unitPrice: number;
  costPrice: number;
  sellingPrice: number;
  currency: string;
  stockQuantity: number;
  expiryDate: Date;
  discount: number;
  supplier: Supplier;
  category: Category;
  categoryId?: number;
  measurementUnitId?: number;
  supplierId?: number;
  stockMovement: StockMovement;
  taxRate: number;
  images: string[];
  status: ProductStatus;
  variants?: ProductVariant[];
  isComboProduct?: boolean;
  comboItems?: ComboProduct[];
  noOfTimesSoldPerMonth: number;
}

export interface QuoteItem {
  id: number;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  amount: number;
  total: number;
}

export interface QuoteAttachments {
  id?: number;
  fileName?: string;
  fileUrl?: string;
  uploadedAt?: Date | string;
  size?: number;
  type?: string;
}

/** A file captured client-side as a base64 data blob and stored directly on the quote's own
 *  additionalOptions — there's no dedicated document-storage backend yet, so this reuses the one
 *  real, already-working persistence path (PUT /quotes/{id}) instead of a new unbuilt endpoint. */
export interface QuoteDocumentAttachment {
  fileName: string;
  base64Content: string;
  contentType: string;
  uploadedAt: Date | string;
}

/** LEGACY — delivery note fields that used to ride on the quote's additionalOptions before the
 *  backend's SalesDeliveryNote / SalesLpo resources had columns for them. Nothing writes this any
 *  more; it's only read as a fallback for delivery notes generated before then. The real homes:
 *  poNumber -> SalesLpo.lpoNumber, everything else -> the same-named SalesDeliveryNote field. */
export interface SalesDeliveryNoteMeta {
  poNumber?: string;
  attention?: string;
  contactPerson?: string;
  /** Id of the TemplateTypesComponent template picked in the Generate Delivery Note wizard. */
  templateId?: string;
  /** Date of Delivery entered in the wizard (yyyy-MM-dd), shown on every item line. */
  deliveryDate?: string;
}

export interface AdditionalQuoteOptions {
  signatureText: string;
  attachments: QuoteAttachments[];
  email: string;
  address: string;
  phone: string;
  notes: string;
  terms: string;
  /** The customer's Local Purchase Order — required before a delivery note can be generated. */
  lpoDocument?: QuoteDocumentAttachment;
  /** The delivery note, re-uploaded once physically signed by the recipient — required before
   *  an invoice can be created for this quote. */
  signedDeliveryNoteDocument?: QuoteDocumentAttachment;
  /** Logo uploaded in the Generate Delivery Note wizard — kept here, like the LPO and signed
   *  copy, until the backend has an upload endpoint. Falls back to the quote's logoUrl. */
  deliveryNoteLogo?: QuoteDocumentAttachment;
  deliveryNoteMeta?: SalesDeliveryNoteMeta;
  /** Template the seller picked for this quote, and for the invoice made from it — so downloads
   *  from the detail pages use the same design (no backend column for it yet). */
  templateId?: string;
  invoiceTemplateId?: string;
}


export interface Quote {
  id: number;
  quoteNumber: string;
  customerId: Customer;
  customerName: Customer;
  selectedCustomerBank: CustomerBankDetails;
  merchantDetails: MerchantInfo;
  logoUrl: string[];
  items: QuoteItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  additionalCharges: number[];
  additionalChargesLabel?: string[];
  totalAmount: number;
  currency: string;
  status: QuoteStatus;
  validUntil: Date;
  createdBy: string;
  createdAt: Date;
  expiresAt: Date;
  additionalOptions?: AdditionalQuoteOptions[];
}


export interface SalesandTransactions {
  id: number;
  orderId: string;
  quoteId: Quote;
  paymentNumber: string;
  invoiceId: Invoice;
  customerId: Customer;
  customerName: Customer;
  items: Quote;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  additionalCharges: number[];
  additionalChargesLabel: string[];
  totalAmount: number;
  currency: string;
  status: SaleLifecycleStatus;
  orderDate: Date;
  expectedDeliveryDate: Date;
  actualDeliveryDate: Date;
  quoteSentDate: Date;
  quoteAcceptedOrRejectedDate: Date;
  quoteConvertedDate: Date;
  invoiceSentDate: Date;
  invoiceCancelledDate?: Date;
  customerNotes: string;
  billingAddress: string;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  PaymentMode: PaymentMode;
  PaymentTerms: PaymentTerms;
  balanceDue: number;
  installmentNumber: number;
  completedInstallments: number;
  reference: string;
  transactionNotes: string;
  deliveryNumber: string;
  shippingAddress: string;
  carrier: string;
  trackingNumber: string;
  dispatchedAt: Date;
  deliveredAt: Date;
  returnedAt: Date;
  signature: string;
}


export interface PaymentTerms {
  id?: number;
  customerId: Customer;
  customerName: Customer;
  InvoiceId?: SalesandTransactions;
  orderId?: SalesandTransactions;
  paymentMethod?: PaymentMethod;
  paymentMode?: PaymentMode;
  paymentPeriod: number;
  amount: number;
  balanceDue: number;
  installmentNumber: number;
  completedInstallments: number;
}

export interface InvoiceItem {
  id: number;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  taxRate: number;
  amount: number;
  total: number;
}


export interface InvoiceAttachments {
  id: number;
  fileName: string;
  fileUrl: string;
  uploadedAt: Date;
  size: number;
  type: string;
}


export interface AdditionalInvoiceOptions {
  signatureText: string;
  attachments: InvoiceAttachments[];
  email: string;
  address: string;
  phone: string;
  notes: string;
  terms: string
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  orderId: string;
  quoteId?: string;
  customerId: Customer;
  customerName: Customer;
  selectedCustomerBank?: CustomerBankDetails;
  merchantDetails?: MerchantInfo;
  logoUrl?: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  additionalCharges: number[];
  additionalChargesLabel?: string[];
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  notes?: string;
  shippingAddress?: string;
  paymentTerms: PaymentTerms[];
  additionalOptions: AdditionalInvoiceOptions[]
}


export interface MerchantBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface MerchantInfo {
  id: number;
  tenantId?: string;
  merchantId: string;
  name: string;
  companyName: string;
  bankDetails: MerchantBankDetails;
  address: string[];
  phone: string;
  email: string;
  taxId: string;
  website?: string;
  logoUrl?: string[];
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}


export interface PaymentReceipt {
  receiptNumber: string;
  payment: SalesandTransactions;
  invoice: Invoice;
  customer?: Customer;
  merchantInfo: MerchantInfo;
  issuedAt: Date;
}

// PENDING/DISPATCHED/DELIVERED/CANCELLED matches the dispatchedAt/deliveredAt timestamp fields
// the backend record carries; PENDING is the only value the API docs actually show as a sample.
// Each transition has its own endpoint: PATCH /delivery-notes/{id}/dispatch | in-transit |
// deliver | return | cancel (see SalesService.updateDeliveryNoteStatus()).
export type SalesDeliveryNoteStatus = 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED' | 'CANCELLED';

/** Line item on a delivery note, matching GET/POST/PUT /commerce/delivery-notes — no pricing
 *  (that belongs on the Invoice). */
export interface SalesDeliveryNoteItem {
  id?: number;
  deliveryNoteId?: number;
  productName: string;
  /** Quantity delivered on this note. */
  quantity: number;
  unit: string;
  /** Links the line back to the catalog product — today lines are copied by name only. */
  productId?: string;
  /** The quote/order line this delivers, so partial deliveries can be reconciled. */
  quoteItemId?: number;
  /** The quote item's description, shown under the product name. */
  description?: string;
  /** Quantity on the order, next to `quantity` delivered — enables "3 of 5 delivered". */
  orderedQuantity?: number;
  /** Per-line Date of Delivery, as the paper template allows. */
  deliveryDate?: Date | string;
  serialNumbers?: string[];
  batchNumber?: string;
  /** Quantity the customer actually accepted on receipt (short or damaged deliveries). */
  quantityReceived?: number;
  remarks?: string;
}

/**
 * The Delivery Note record, matching GET/POST /commerce/delivery-notes, GET/PUT/DELETE
 * /delivery-notes/{id} and the PATCH /delivery-notes/{id}/<transition> status endpoints.
 * salesOrderId, quoteId, lpoId, invoiceId and customerId are plain ids (not nested objects).
 *
 * Files still live on the quote's additionalOptions (lpoDocument / signedDeliveryNoteDocument)
 * because the backend has no upload endpoint yet — signedDocumentUrl stays empty until it does.
 */
export interface SalesDeliveryNote {
  id?: number;
  tenantId?: string;
  deliveryNumber: string;
  salesOrderId?: number;
  customerId?: number;
  customerAddress: string;
  carrier?: string;
  trackingNumber?: string;
  status: SalesDeliveryNoteStatus;
  dispatchedAt?: Date | string;
  deliveredAt?: Date | string;
  /** Free text from the edit form — unclear what it holds; superseded by receivedByName /
   *  receivedAt / signedDocumentUrl below. */
  signature?: string;
  createdBy?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  items: SalesDeliveryNoteItem[];

  // Links
  quoteId?: number;
  invoiceId?: number;
  /** The customer's SalesLpo record (its lpoNumber is the note's "LPO Number"). */
  lpoId?: number;

  // Recipient, captured at issue time so editing the customer later doesn't rewrite old notes
  recipientName?: string;
  recipientPhone?: string;
  /** Delivery address at issue time (the customer has a separate deliverAddress list). */
  deliveryAddress?: string;
  attention?: string;
  attentionPhone?: string;
  contactPerson?: string;
  contactPhone?: string;

  // Dates
  /** Date of Delivery, shown on every item line. */
  deliveryDate?: Date | string;
  /** When it was last emailed to the customer. */
  sentAt?: Date | string;
  inTransitAt?: Date | string;
  returnedAt?: Date | string;
  cancelledAt?: Date | string;
  cancellationReason?: string;

  // Receipt — from the signed copy's Name / Signature / Date sign-off
  receivedByName?: string;
  receivedAt?: Date | string;
  /** Empty until the backend has an upload endpoint — the signed copy itself is still stored as
   *  AdditionalQuoteOptions.signedDeliveryNoteDocument. */
  signedDocumentUrl?: string;

  /** Id of the TemplateTypesComponent template picked in the Generate Delivery Note wizard. */
  templateId?: string;
  /** Delivery instructions / notes printed on the note. */
  notes?: string;
}

// ------------------------------------------------------------------
// LPO (Local Purchase Order) DTOs
// Backs /x/api/v2/commerce/sales-lpos (GET/POST, GET/PUT/DELETE /{id}, PATCH /{id}/verify and
// /{id}/reject). The file itself still lives on the quote's additionalOptions.lpoDocument because
// the backend has no upload endpoint yet, so document.fileUrl is empty until it does.
// ------------------------------------------------------------------

export type SalesLpoStatus = 'RECEIVED' | 'VERIFIED' | 'REJECTED';

/** The uploaded LPO file — stored by the backend and referenced by URL, rather than as base64
 *  inside the quote like QuoteDocumentAttachment. */
export interface SalesLpoDocument {
  fileName: string;
  fileUrl: string;
  contentType: string;
  size?: number;
  uploadedAt: Date | string;
}

/** The customer's Local Purchase Order — required before a delivery note can be generated. */
export interface SalesLpo {
  id?: number;
  tenantId?: string;
  /** The customer's own PO number, as printed on their LPO (today's deliveryNoteMeta.poNumber). */
  lpoNumber: string;
  /** Date printed on the customer's LPO. */
  lpoDate?: Date | string;
  quoteId: number;
  salesOrderId?: number;
  customerId: number;
  /** LPO value, to check it against the quote total. */
  amount?: number;
  currency?: string;
  status: SalesLpoStatus;
  document: SalesLpoDocument;
  notes?: string;
  receivedBy?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ------------------------------------------------------------------
// Sales Document Email DTOs
// Backs POST/GET /x/api/v2/commerce/sales/email(/send|/{id}) — emailing
// a Quote or Invoice to a customer, and the send history/status for it.
// Replaces the generic procurement NotificationService.sendDirectEmail()
// call quote-form/invoice-form used before this endpoint existed.
// ------------------------------------------------------------------

export type SalesEmailDocumentType = 'QUOTE' | 'INVOICE' | 'DELIVERY_NOTE';

export type SalesEmailStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

export interface SalesEmailAttachment {
  fileName: string;
  fileUrl?: string;
  size?: number;
  type?: string;
  /** Base64-encoded file content sent to the notification service for SMTP attachment. */
  base64Content?: string;
  contentType?: string;
}

/** Request body for POST /sales/email/send (see SalesEmailService.send() for why not /document yet). */
export interface SendSalesEmailRequest {
  documentType: SalesEmailDocumentType;
  documentId: number;
  documentNumber: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;
  attachments?: SalesEmailAttachment[];
  sentBy: string;
}

/** A logged send, as returned by GET /sales/email and GET /sales/email/{id}. */
export interface SalesEmailNotification {
  id: number;
  tenantId: string;
  documentType: SalesEmailDocumentType;
  documentId: number;
  documentNumber: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  attachments?: SalesEmailAttachment[];
  status: SalesEmailStatus;
  sentAt?: Date | string;
  deliveredAt?: Date | string;
  failureReason?: string;
  retryCount: number;
  sentBy: string;
  createdAt: Date | string;
}

export interface TopCustomers {
  customerId: Customer;
  productName: SalesandTransactions;
  amount: number;
  month: string;
}


export interface SalesSummary {
  totalRevenue: number;
  totalQuotes: number;
  acceptedQuotes: number;
  pendingQuotes: number;
  totalInvoices: number;
  paidInvoices: number;
  overdueInvoices: number;
  totalCustomers: number;
}

export interface RevenueChartData {
  month: string;
  amount: number;
}

export interface TopProduct {
  productId: Product;
  productName: Product;
  quantitySold: number;
  month: string;
  revenue: number;
}

// ============================================================
// DOCUMENT EMAIL DELIVERY — forward Quotes & Invoices to customers
// ============================================================
// This is meant to replace the ad-hoc, attachment-less `sendDirectEmail` call that
// quote-form/invoice-form currently borrow from procurement's NotificationService
// (see quote-form.component.ts#sendQuoteEmail / invoice-form.component.ts#sendInvoiceEmail —
// both build an HTML string and POST it with no reference to the PDF that was just
// generated for the customer). Once a backend endpoint exists for this DTO, those two
// methods should call it instead, passing the generated PDF as an attachment.

export type SalesDocumentType = 'QUOTE' | 'INVOICE';

export type EmailDeliveryStatus = 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'BOUNCED';

// Field names match the existing QuoteAttachments/InvoiceAttachments shape above —
// attachments in this app are uploaded first (see procurement.service.ts#uploadAttachment)
// and referenced by URL, never inlined as base64.
export interface EmailAttachment {
  fileName: string;
  fileUrl: string;
  size?: number;
  type?: string; // mime type, e.g. 'application/pdf'
}

/** Request payload for sending/forwarding a Quote or Invoice to a customer by email. */
export interface SendDocumentEmailRequest {
  documentType: SalesDocumentType;
  documentId: number;              // Quote.id or Invoice.id
  documentNumber: string;          // quoteNumber / invoiceNumber — for subject + logging
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  message: string;                 // editable body shown in the send modal before dispatch
  attachments?: EmailAttachment[]; // generated PDF, plus any user-attached files
  sentBy: string;                  // id/name of the user who triggered the send
}

/** Delivery record returned after a send, and used to render send history on a document. */
export interface DocumentEmailLog {
  id: string;
  documentType: SalesDocumentType;
  documentId: number;
  documentNumber: string;
  to: string;
  cc?: string[];
  bcc?: string[];
  subject: string;
  attachments: EmailAttachment[];
  status: EmailDeliveryStatus;
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  retryCount: number;
  sentBy: string;
  createdAt: Date;
}




