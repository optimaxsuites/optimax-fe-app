export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  taxId?: string;
  createdAt: Date;
  totalSpent: number;
  totalOrders: number;
  status: 'ACTIVE' | 'INACTIVE' | 'BLACKLISTED';
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  unitPrice: number;
  costPrice: number;
  currency: string;
  stockQuantity: number;
  category: string;
  taxRate: number;
  images: string[];
  status: 'ACTIVE' | 'DISCONTINUED' | 'OUT_OF_STOCK';
}

export interface Quote {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  items: QuoteItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  status: QuoteStatus;
  validUntil: Date;
  createdAt: Date;
  expiresAt: Date;
  notes?: string;
  terms?: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'CONVERTED';


export interface SalesOrder {
  id: string;
  orderNumber: string;
  quoteId?: string;
  customerId: string;
  customerName: string;
  items: SalesOrderItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  status: OrderStatus;
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  notes?: string;
  shippingAddress?: string;  
}

export interface SalesOrderItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}


export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  quoteId?: string;
  customerId: string;
  customerName: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  currency: string;
  status: InvoiceStatus;
  issueDate: Date;
  dueDate: Date;
  paidAt?: Date;
  notes?: string;
  paymentTerms: string;
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'CANCELLED';

export interface InvoiceItem {
  id: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceId: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  reference: string;
  status: PaymentStatus;
  paymentDate: Date;
  notes?: string;
}

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'CHEQUE' | 'POS' | 'MOBILE_MONEY';
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface DeliveryNote {
  id: string;
  deliveryNumber: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerAddress: string;
  items: DeliveryItem[];
  carrier: string;
  trackingNumber?: string;
  status: DeliveryStatus;
  dispatchedAt?: Date;
  deliveredAt?: Date;
  signature?: string;
}

export interface DeliveryItem {
  productName: string;
  quantity: number;
  unit: string;
}

export type DeliveryStatus = 'PENDING' | 'DISPATCHED' | 'IN_TRANSIT' | 'DELIVERED' | 'RETURNED';

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
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
}