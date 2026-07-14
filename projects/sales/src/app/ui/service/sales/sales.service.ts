import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';
import { 
  SalesSummary, 
  RevenueChartData, 
  TopProduct, 
  Quote, 
  QuoteStatus,
  Invoice, 
  InvoiceStatus,
  Customer, 
  Product,
  Category,
  SalesOrder,
  OrderStatus,
  Payment,
  DeliveryNote,
  QuoteItem,
  InvoiceItem
} from '../../domain/sales/sales.dto';

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private readonly QUOTES_KEY = 'sales_quotes';
  private readonly CUSTOMERS_KEY = 'sales_customers';
  private readonly PRODUCTS_KEY = 'sales_products';
  private readonly INVOICES_KEY = 'sales_invoices';
  private readonly ORDERS_KEY = 'sales_orders';
  private readonly PAYMENTS_KEY = 'sales_payments';
  private readonly CATEGORIES_KEY = 'sales_categories';

  constructor() {
    this.initData();
    this.sanitizeCustomers();
  }

  private sanitizeCustomers(): void {
    try {
      const customersStr = localStorage.getItem(this.CUSTOMERS_KEY);
      if (customersStr) {
        let customers = JSON.parse(customersStr);
        let changed = false;
        customers = customers.map((c: any, index: number) => {
          if (!c.id || c.id.trim() === '') {
            c.id = `CUST-${String(index + 1).padStart(3, '0')}`;
            changed = true;
          }
          return c;
        });
        if (changed) {
          localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
        }
      }
    } catch (e) {
      console.error('Error sanitizing customers:', e);
    }
  }

  private initData(): void {
    // Initialize Customers
    if (!localStorage.getItem(this.CUSTOMERS_KEY)) {
      const mockCustomers: Customer[] = [
        { id: 'CUST-001', name: 'Mama Nkechi Enterprises', email: 'contact@maman-nkechi.com', phone: '+234 803 123 4567', address: 'Lagos, Nigeria', taxId: 'TAX-001', createdAt: new Date(), totalSpent: 500000, totalOrders: 1, status: 'ACTIVE' },
        { id: 'CUST-002', name: 'Tech Solutions Ltd', email: 'info@techsolutions.ng', phone: '+234 812 345 6789', address: 'Abuja, Nigeria', taxId: 'TAX-002', createdAt: new Date(), totalSpent: 1250000, totalOrders: 1, status: 'ACTIVE' },
        { id: 'CUST-003', name: 'Global Services NG', email: 'hello@globalservices.ng', phone: '+234 705 678 9012', address: 'Port Harcourt, Nigeria', taxId: 'TAX-003', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' },
        { id: 'CUST-004', name: 'Aliko Dangote Wholesale', email: 'info@dangote-wholesale.com', phone: '+234 802 222 3333', address: 'Kano, Nigeria', taxId: 'TAX-004', createdAt: new Date(), totalSpent: 750000, totalOrders: 1, status: 'ACTIVE' },
        { id: 'CUST-005', name: 'Obinna Electronics', email: 'contact@obinnaelectronics.com', phone: '+234 809 444 5555', address: 'Onitsha, Nigeria', taxId: 'TAX-005', createdAt: new Date(), totalSpent: 0, totalOrders: 0, status: 'ACTIVE' }
      ];
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(mockCustomers));
    }

    // Initialize Products
    if (!localStorage.getItem(this.PRODUCTS_KEY)) {
      const mockProducts: Product[] = [
        { id: 'PROD-001', name: 'Executive Office Chair', sku: 'CHR-001', description: 'Ergonomic executive office chair', unitPrice: 50000, costPrice: 30000, currency: 'NGN', stockQuantity: 50, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-002', name: 'Standing Desk', sku: 'DSK-001', description: 'Adjustable standing desk', unitPrice: 120000, costPrice: 80000, currency: 'NGN', stockQuantity: 30, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-003', name: 'Laptop - Dell XPS', sku: 'LAP-001', description: 'Dell XPS 13 laptop', unitPrice: 850000, costPrice: 700000, currency: 'NGN', stockQuantity: 15, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-004', name: 'Conference Table', sku: 'TBL-001', description: 'Large conference table', unitPrice: 250000, costPrice: 180000, currency: 'NGN', stockQuantity: 10, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-005', name: 'Printer - HP LaserJet', sku: 'PRN-001', description: 'HP LaserJet printer', unitPrice: 150000, costPrice: 120000, currency: 'NGN', stockQuantity: 25, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' }
      ];
    }

    // Initialize Categories
    if (!localStorage.getItem(this.CATEGORIES_KEY)) {
      const defaultCategories: Category[] = [
        { id: 'CAT-001', name: 'Electronics', description: 'Gadgets, computing, and electronic systems' },
        { id: 'CAT-002', name: 'Furniture', description: 'Office chairs, tables, and desks' },
        { id: 'CAT-003', name: 'Accessories', description: 'Keyboard, mouse, cables, and minor peripherals' },
        { id: 'CAT-004', name: 'Services', description: 'Consultation, deployment, and logistics services' },
        { id: 'CAT-005', name: 'Office Supplies', description: 'Stationery, papers, and office tools' },
        { id: 'CAT-006', name: 'Other', description: 'Miscellaneous inventory items' }
      ];
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(defaultCategories));
    }

    // Initialize Quotes
    const storedQuotes = localStorage.getItem(this.QUOTES_KEY);
    let quotesCount = 0;
    if (storedQuotes) {
      try {
        quotesCount = JSON.parse(storedQuotes).length;
      } catch (e) {
        quotesCount = 0;
      }
    }
    if (!storedQuotes || quotesCount < 10) {
      const mockQuotes: Quote[] = [
        {
          id: '1', quoteNumber: 'QT-001', customerId: 'CUST-001', customerName: 'Mama Nkechi Enterprises',
          items: [
            { id: 'item-1', productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Ergonomic office chair', quantity: 10, unitPrice: 50000, discount: 0, total: 500000 }
          ], 
          subtotal: 500000, taxAmount: 0, discountAmount: 0, totalAmount: 500000,
          currency: 'NGN', status: 'ACCEPTED' as QuoteStatus, validUntil: new Date('2026-07-15'),
          createdAt: new Date('2026-06-10'), expiresAt: new Date('2026-07-15'), notes: 'Delivery within 3 days', terms: 'Payment on delivery'
        },
        {
          id: '2', quoteNumber: 'QT-002', customerId: 'CUST-002', customerName: 'Tech Solutions Ltd',
          items: [
            { id: 'item-2', productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Dell XPS laptop', quantity: 1, unitPrice: 850000, discount: 0, total: 850000 },
            { id: 'item-3', productId: 'PROD-002', productName: 'Standing Desk', description: 'Standing desk', quantity: 3, unitPrice: 120000, discount: 10, total: 324000 }
          ], 
          subtotal: 1174000, taxAmount: 0, discountAmount: 0, totalAmount: 1174000,
          currency: 'NGN', status: 'SENT' as QuoteStatus, validUntil: new Date('2026-07-05'),
          createdAt: new Date('2026-06-09'), expiresAt: new Date('2026-07-05'), notes: '', terms: 'Net 30 days'
        },
        {
          id: '3', quoteNumber: 'QT-003', customerId: 'CUST-003', customerName: 'Global Services NG',
          items: [
            { id: 'item-4', productId: 'PROD-005', productName: 'Printer - HP LaserJet', description: 'HP LaserJet printer', quantity: 2, unitPrice: 150000, discount: 0, total: 300000 }
          ], 
          subtotal: 300000, taxAmount: 0, discountAmount: 0, totalAmount: 300000,
          currency: 'NGN', status: 'DRAFT' as QuoteStatus, validUntil: new Date('2026-06-28'),
          createdAt: new Date('2026-06-08'), expiresAt: new Date('2026-06-28'), notes: '', terms: ''
        },
        {
          id: '4', quoteNumber: 'QT-004', customerId: 'CUST-004', customerName: 'Aliko Dangote Wholesale',
          items: [
            { id: 'item-5', productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Office chairs', quantity: 15, unitPrice: 50000, discount: 10, total: 675000 }
          ], 
          subtotal: 675000, taxAmount: 0, discountAmount: 0, totalAmount: 675000,
          currency: 'NGN', status: 'DECLINED' as QuoteStatus, validUntil: new Date('2026-06-25'),
          createdAt: new Date('2026-06-07'), expiresAt: new Date('2026-06-25'), notes: '', terms: ''
        },
        {
          id: '5', quoteNumber: 'QT-005', customerId: 'CUST-005', customerName: 'Obinna Electronics',
          items: [
            { id: 'item-6', productId: 'PROD-005', productName: 'Printer - HP LaserJet', description: 'HP printers', quantity: 1, unitPrice: 150000, discount: 0, total: 150000 }
          ], 
          subtotal: 150000, taxAmount: 0, discountAmount: 0, totalAmount: 150000,
          currency: 'NGN', status: 'EXPIRED' as QuoteStatus, validUntil: new Date('2026-06-01'),
          createdAt: new Date('2026-05-20'), expiresAt: new Date('2026-06-01'), notes: '', terms: ''
        },
        {
          id: '6', quoteNumber: 'QT-006', customerId: 'CUST-001', customerName: 'Mama Nkechi Enterprises',
          items: [
            { id: 'item-7', productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Dell XPS 13 laptop', quantity: 2, unitPrice: 850000, discount: 5, total: 1615000 }
          ], 
          subtotal: 1615000, taxAmount: 0, discountAmount: 0, totalAmount: 1615000,
          currency: 'NGN', status: 'CONVERTED' as QuoteStatus, validUntil: new Date('2026-06-20'),
          createdAt: new Date('2026-05-25'), expiresAt: new Date('2026-06-20'), notes: '', terms: ''
        },
        {
          id: '7', quoteNumber: 'QT-007', customerId: 'CUST-002', customerName: 'Tech Solutions Ltd',
          items: [
            { id: 'item-8', productId: 'PROD-002', productName: 'Standing Desk', description: 'Adjustable standing desk', quantity: 7, unitPrice: 120000, discount: 0, total: 840000 }
          ], 
          subtotal: 840000, taxAmount: 0, discountAmount: 0, totalAmount: 840000,
          currency: 'NGN', status: 'SENT' as QuoteStatus, validUntil: new Date('2026-07-10'),
          createdAt: new Date('2026-06-11'), expiresAt: new Date('2026-07-10'), notes: '', terms: 'Net 30 days'
        },
        {
          id: '8', quoteNumber: 'QT-008', customerId: 'CUST-003', customerName: 'Global Services NG',
          items: [
            { id: 'item-9', productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Office chairs', quantity: 8, unitPrice: 50000, discount: 0, total: 400000 }
          ], 
          subtotal: 400000, taxAmount: 0, discountAmount: 0, totalAmount: 400000,
          currency: 'NGN', status: 'ACCEPTED' as QuoteStatus, validUntil: new Date('2026-07-12'),
          createdAt: new Date('2026-06-12'), expiresAt: new Date('2026-07-12'), notes: '', terms: ''
        },
        {
          id: '9', quoteNumber: 'QT-009', customerId: 'CUST-004', customerName: 'Aliko Dangote Wholesale',
          items: [
            { id: 'item-10', productId: 'PROD-004', productName: 'Conference Table', description: 'Large conference table', quantity: 2, unitPrice: 250000, discount: 0, total: 500000 }
          ], 
          subtotal: 500000, taxAmount: 0, discountAmount: 0, totalAmount: 500000,
          currency: 'NGN', status: 'DRAFT' as QuoteStatus, validUntil: new Date('2026-07-20'),
          createdAt: new Date('2026-06-13'), expiresAt: new Date('2026-07-20'), notes: '', terms: ''
        },
        {
          id: '10', quoteNumber: 'QT-010', customerId: 'CUST-005', customerName: 'Obinna Electronics',
          items: [
            { id: 'item-11', productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Laptop', quantity: 1, unitPrice: 850000, discount: 0, total: 850000 }
          ], 
          subtotal: 850000, taxAmount: 0, discountAmount: 0, totalAmount: 850000,
          currency: 'NGN', status: 'CONVERTED' as QuoteStatus, validUntil: new Date('2026-06-30'),
          createdAt: new Date('2026-06-05'), expiresAt: new Date('2026-06-30'), notes: '', terms: ''
        }
      ];
      localStorage.setItem(this.QUOTES_KEY, JSON.stringify(mockQuotes));
    }

    // Initialize Invoices
    if (!localStorage.getItem(this.INVOICES_KEY)) {
      const mockInvoices: Invoice[] = [
        {
          id: '1', invoiceNumber: 'INV-001', orderId: 'ORD-001', customerId: 'CUST-001', customerName: 'Mama Nkechi Enterprises',
          items: [
            { id: 'item-inv-1', productName: 'Executive Office Chair', description: 'Office chairs', quantity: 10, unitPrice: 50000, total: 500000 }
          ],
          subtotal: 500000, taxAmount: 0, discountAmount: 0, totalAmount: 500000, amountPaid: 500000, balanceDue: 0,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-10'), dueDate: new Date('2026-06-20'), paidAt: new Date('2026-06-15'), notes: '', paymentTerms: 'Net 30'
        },
        {
          id: '2', invoiceNumber: 'INV-002', orderId: 'ORD-002', customerId: 'CUST-002', customerName: 'Tech Solutions Ltd',
          items: [
            { id: 'item-inv-2', productName: 'Laptop - Dell XPS', description: 'Laptops', quantity: 1, unitPrice: 850000, total: 850000 }
          ],
          subtotal: 850000, taxAmount: 0, discountAmount: 0, totalAmount: 850000, amountPaid: 0, balanceDue: 850000,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-09'), dueDate: new Date('2026-06-25'), notes: '', paymentTerms: 'Net 30'
        },
        {
          id: '3', invoiceNumber: 'INV-003', orderId: 'ORD-003', customerId: 'CUST-003', customerName: 'Global Services NG',
          items: [
            { id: 'item-inv-3', productName: 'Printer - HP LaserJet', description: 'HP LaserJet printer', quantity: 2, unitPrice: 150000, total: 300000 }
          ],
          subtotal: 300000, taxAmount: 0, discountAmount: 0, totalAmount: 300000, amountPaid: 100000, balanceDue: 200000,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-08'), dueDate: new Date('2026-07-28'), notes: '', paymentTerms: 'Net 30'
        }
      ];
      localStorage.setItem(this.INVOICES_KEY, JSON.stringify(mockInvoices));
    }

    // Initialize Orders
    if (!localStorage.getItem(this.ORDERS_KEY)) {
      const mockOrders: SalesOrder[] = [
        {
          id: '1',
          orderNumber: 'SO-001',
          customerId: 'CUST-001',
          customerName: 'Mama Nkechi Enterprises',
          items: [
            { id: 'i1', productId: 'PROD-001', productName: 'Executive Office Chair', description: 'Ergonomic chair', quantity: 10, unitPrice: 50000, discount: 0, total: 500000 }
          ],
          subtotal: 500000,
          taxAmount: 37500,
          discountAmount: 0,
          totalAmount: 537500,
          currency: 'NGN',
          status: 'DELIVERED' as OrderStatus,
          orderDate: new Date('2026-06-10'),
          expectedDeliveryDate: new Date('2026-06-20'),
          actualDeliveryDate: new Date('2026-06-18'),
          shippingAddress: 'Lagos, Nigeria'
        },
        {
          id: '2',
          orderNumber: 'SO-002',
          customerId: 'CUST-002',
          customerName: 'Tech Solutions Ltd',
          items: [
            { id: 'i2', productId: 'PROD-003', productName: 'Laptop - Dell XPS', description: 'Dell XPS 13', quantity: 1, unitPrice: 850000, discount: 0, total: 850000 }
          ],
          subtotal: 850000,
          taxAmount: 63750,
          discountAmount: 0,
          totalAmount: 913750,
          currency: 'NGN',
          status: 'SHIPPED' as OrderStatus,
          orderDate: new Date('2026-06-09'),
          expectedDeliveryDate: new Date('2026-06-25'),
          shippingAddress: 'Abuja, Nigeria'
        },
        {
          id: '3',
          orderNumber: 'SO-003',
          customerId: 'CUST-003',
          customerName: 'Global Services NG',
          items: [
            { id: 'i3', productId: 'PROD-005', productName: 'Printer - HP LaserJet', description: 'HP printer', quantity: 2, unitPrice: 150000, discount: 0, total: 300000 }
          ],
          subtotal: 300000,
          taxAmount: 22500,
          discountAmount: 0,
          totalAmount: 322500,
          currency: 'NGN',
          status: 'PROCESSING' as OrderStatus,
          orderDate: new Date('2026-06-08'),
          expectedDeliveryDate: new Date('2026-06-28'),
          shippingAddress: 'Port Harcourt, Nigeria'
        },
        {
          id: '4',
          orderNumber: 'SO-004',
          customerId: 'CUST-004',
          customerName: 'Aliko Dangote Wholesale',
          items: [
            { id: 'i4', productId: 'PROD-004', productName: 'Conference Table', description: 'Large conference table', quantity: 2, unitPrice: 250000, discount: 0, total: 500000 }
          ],
          subtotal: 500000,
          taxAmount: 37500,
          discountAmount: 0,
          totalAmount: 537500,
          currency: 'NGN',
          status: 'PENDING' as OrderStatus,
          orderDate: new Date('2026-06-07'),
          expectedDeliveryDate: new Date('2026-06-30'),
          shippingAddress: 'Kano, Nigeria'
        },
        {
          id: '5',
          orderNumber: 'SO-005',
          customerId: 'CUST-005',
          customerName: 'Obinna Electronics',
          items: [
            { id: 'i5', productId: 'PROD-001', productName: 'Office Chairs', description: 'Standard office chairs', quantity: 15, unitPrice: 40000, discount: 0, total: 600000 }
          ],
          subtotal: 600000,
          taxAmount: 45000,
          discountAmount: 0,
          totalAmount: 645000,
          currency: 'NGN',
          status: 'CANCELLED' as OrderStatus,
          orderDate: new Date('2026-06-01'),
          expectedDeliveryDate: new Date('2026-06-15'),
          shippingAddress: 'Onitsha, Nigeria'
        }
      ];
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(mockOrders));
    }

    // Initialize Payments
    if (!localStorage.getItem(this.PAYMENTS_KEY)) {
      const mockPayments: Payment[] = [
        {
          id: 'PAY-001',
          paymentNumber: 'PAY-001',
          invoiceId: '1',
          customerId: 'CUST-001',
          customerName: 'Mama Nkechi Enterprises',
          amount: 500000,
          currency: 'NGN',
          method: 'BANK_TRANSFER',
          reference: 'TXN-BANK-1002381',
          status: 'COMPLETED',
          paymentDate: new Date('2026-06-15'),
          notes: 'Invoice INV-001 fully paid'
        },
        {
          id: 'PAY-002',
          paymentNumber: 'PAY-002',
          invoiceId: '3',
          customerId: 'CUST-003',
          customerName: 'Global Services NG',
          amount: 100000,
          currency: 'NGN',
          method: 'CASH',
          reference: 'TXN-CASH-8837190',
          status: 'COMPLETED',
          paymentDate: new Date('2026-06-28'),
          notes: 'Partial payment on receipt'
        },
        {
          id: 'PAY-003',
          paymentNumber: 'PAY-003',
          invoiceId: '2',
          customerId: 'CUST-002',
          customerName: 'Tech Solutions Ltd',
          amount: 850000,
          currency: 'NGN',
          method: 'CARD',
          reference: 'TXN-CARD-4482010',
          status: 'FAILED',
          paymentDate: new Date('2026-06-20'),
          notes: 'Transaction declined by bank gateway'
        }
      ];
      localStorage.setItem(this.PAYMENTS_KEY, JSON.stringify(mockPayments));
    }
  }

  // ============================================
  // DASHBOARD
  // ============================================

  getDashboardStats(range: string): Observable<SalesSummary> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');

    const totalRevenue = invoices.filter(i => i.status === 'SENT').reduce((sum, i) => sum + i.totalAmount, 0);

    return of({
      totalRevenue: totalRevenue || 2845000,
      totalQuotes: quotes.length,
      pendingQuotes: quotes.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length,
      acceptedQuotes: quotes.filter(q => q.status === 'ACCEPTED' || q.status === 'CONVERTED').length,
      totalInvoices: invoices.length,
      paidInvoices: 0,
      overdueInvoices: 0,
      totalCustomers: customers.length
    }).pipe(delay(300));
  }

  getRecentQuotes(limit: number): Observable<Quote[]> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    quotes = quotes.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      validUntil: new Date(q.validUntil)
    }));
    return of(quotes.slice(0, limit)).pipe(delay(300));
  }

  getRecentInvoices(limit: number): Observable<Invoice[]> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    invoices = invoices.map(i => ({
      ...i,
      issueDate: new Date(i.issueDate),
      dueDate: new Date(i.dueDate)
    }));
    return of(invoices.slice(0, limit)).pipe(delay(300));
  }

  getTopProducts(limit: number): Observable<TopProduct[]> {
    return of([
      { productId: '1', productName: 'Executive Office Chair', quantitySold: 45, revenue: 2250000 },
      { productId: '2', productName: 'Standing Desk', quantitySold: 28, revenue: 1400000 },
      { productId: '3', productName: 'Laptop - Dell XPS', quantitySold: 12, revenue: 1800000 },
      { productId: '4', productName: 'Conference Table', quantitySold: 8, revenue: 1200000 },
      { productId: '5', productName: 'Printer - HP LaserJet', quantitySold: 15, revenue: 750000 }
    ]).pipe(delay(300));
  }

  getRevenueChart(range: string): Observable<RevenueChartData[]> {
    return of([
      { month: 'Jan', amount: 450000 },
      { month: 'Feb', amount: 520000 },
      { month: 'Mar', amount: 480000 },
      { month: 'Apr', amount: 610000 },
      { month: 'May', amount: 580000 },
      { month: 'Jun', amount: 2845000 }
    ]).pipe(delay(300));
  }

  // ============================================
  // QUOTES
  // ============================================

  getQuotes(filters: any): Observable<{ data: Quote[]; total: number }> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    
    quotes = quotes.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      validUntil: new Date(q.validUntil),
      expiresAt: q.expiresAt ? new Date(q.expiresAt) : new Date(q.validUntil)
    }));

    if (filters && filters.status && filters.status !== 'ALL') {
      quotes = quotes.filter(q => q.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      quotes = quotes.filter(q => 
        q.quoteNumber.toLowerCase().includes(term) || 
        q.customerName.toLowerCase().includes(term)
      );
    }

    const total = quotes.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = quotes.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  getQuoteById(id: string): Observable<Quote | null> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      return of({
        ...quote,
        createdAt: new Date(quote.createdAt),
        validUntil: new Date(quote.validUntil),
        expiresAt: quote.expiresAt ? new Date(quote.expiresAt) : new Date(quote.validUntil)
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  createQuote(data: Partial<Quote>): Observable<Quote> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    
    const newQuote: Quote = {
      id: Math.random().toString(36).substr(2, 9),
      quoteNumber: `QT-${String(quotes.length + 1).padStart(3, '0')}`,
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'NGN',
      status: data.status || 'DRAFT',
      validUntil: data.validUntil || new Date(),
      createdAt: data.createdAt || new Date(),
      expiresAt: data.expiresAt || new Date(),
      notes: data.notes || '',
      terms: data.terms || ''
    };

    quotes.unshift(newQuote);
    localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));
    return of(newQuote).pipe(delay(300));
  }

  updateQuote(id: string, data: Partial<Quote>): Observable<Quote> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const index = quotes.findIndex(q => q.id === id);
    
    if (index !== -1) {
      const updatedQuote = {
        ...quotes[index],
        ...data,
        id: quotes[index].id,
        quoteNumber: quotes[index].quoteNumber
      } as Quote;
      
      quotes[index] = updatedQuote;
      localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));
      return of(updatedQuote).pipe(delay(300));
    }
    
    throw new Error('Quote not found');
  }

  deleteQuote(id: string): Observable<boolean> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    quotes = quotes.filter(q => q.id !== id);
    localStorage.setItem(this.QUOTES_KEY, JSON.stringify(quotes));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // INVOICES
  // ============================================

  getInvoices(filters: any): Observable<{ data: Invoice[]; total: number }> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    invoices = invoices.map(i => {
      let status = i.status;
      if (status !== 'DRAFT' && status !== 'SENT' && status !== 'CANCELLED') {
        status = 'SENT';
      }
      return {
        ...i,
        status,
        issueDate: new Date(i.issueDate),
        dueDate: new Date(i.dueDate),
        paidAt: i.paidAt ? new Date(i.paidAt) : undefined
      };
    });

    if (filters && filters.status && filters.status !== 'ALL') {
      invoices = invoices.filter(i => i.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      invoices = invoices.filter(i => 
        i.invoiceNumber.toLowerCase().includes(term) || 
        i.customerName.toLowerCase().includes(term)
      );
    }

    const total = invoices.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = invoices.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  getInvoiceById(id: string): Observable<Invoice | null> {
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const invoice = invoices.find(i => i.id === id);
    if (invoice) {
      let status = invoice.status;
      if (status !== 'DRAFT' && status !== 'SENT' && status !== 'CANCELLED') {
        status = 'SENT';
      }
      return of({
        ...invoice,
        status,
        issueDate: new Date(invoice.issueDate),
        dueDate: new Date(invoice.dueDate),
        paidAt: invoice.paidAt ? new Date(invoice.paidAt) : undefined
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  createInvoice(data: Partial<Invoice>): Observable<Invoice> {
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const newInvoice: Invoice = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      orderId: data.orderId || '',
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      totalAmount: data.totalAmount || 0,
      amountPaid: data.amountPaid || 0,
      balanceDue: data.totalAmount || 0,
      currency: data.currency || 'NGN',
      status: data.status || 'DRAFT',
      issueDate: data.issueDate || new Date(),
      dueDate: data.dueDate || new Date(),
      paidAt: data.paidAt,
      notes: data.notes || '',
      paymentTerms: data.paymentTerms || 'Net 30'
    };
    invoices.push(newInvoice);
    localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
    return of(newInvoice).pipe(delay(300));
  }

  updateInvoice(id: string, data: Partial<Invoice>): Observable<Invoice> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const index = invoices.findIndex(i => i.id === id);
    
    if (index !== -1) {
      const updatedInvoice = {
        ...invoices[index],
        ...data,
        id: invoices[index].id,
        invoiceNumber: invoices[index].invoiceNumber
      } as Invoice;
      
      invoices[index] = updatedInvoice;
      localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
      return of(updatedInvoice).pipe(delay(300));
    }
    
    throw new Error('Invoice not found');
  }

  deleteInvoice(id: string): Observable<boolean> {
    let invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    invoices = invoices.filter(i => i.id !== id);
    localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  getCustomers(filters: any): Observable<{ data: Customer[]; total: number }> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    let filtered = customers;

    if (filters && filters.status && filters.status !== 'ALL') {
      filtered = filtered.filter((c: any) => c.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((c: any) => 
        c.name.toLowerCase().includes(term) || 
        c.email.toLowerCase().includes(term) ||
        c.phone.toLowerCase().includes(term)
      );
    }

    return of({ data: filtered, total: filtered.length }).pipe(delay(300));
  }

  getCustomerById(id: string): Observable<Customer | null> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const customer = customers.find((c: any) => c.id === id);
    return of(customer || null).pipe(delay(300));
  }

  createCustomer(data: Partial<Customer>): Observable<Customer> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const newCustomer = {
      id: `CUST-${String(customers.length + 1).padStart(3, '0')}`,
      ...data,
      createdAt: new Date(),
      totalSpent: 0,
      totalOrders: 0
    } as Customer;
    customers.push(newCustomer);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    return of(newCustomer).pipe(delay(300));
  }

  updateCustomer(id: string, data: Partial<Customer>): Observable<Customer> {
    let customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    const index = customers.findIndex(c => c.id === id);
    
    if (index !== -1) {
      const updatedCustomer = {
        ...customers[index],
        ...data,
        id: customers[index].id
      } as Customer;
      
      customers[index] = updatedCustomer;
      localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
      return of(updatedCustomer).pipe(delay(300));
    }
    
    throw new Error('Customer not found');
  }

  deleteCustomer(id: string): Observable<boolean> {
    let customers: Customer[] = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    customers = customers.filter(c => c.id !== id);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // PRODUCTS
  // ============================================

  getProducts(filters: any): Observable<{ data: Product[]; total: number }> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    let filtered = products;
    
    if (filters?.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((p: any) => 
        p.name.toLowerCase().includes(term) || 
        p.sku.toLowerCase().includes(term)
      );
    }

    if (filters?.status && filters.status !== 'ALL') {
      filtered = filtered.filter((p: any) => p.status === filters.status);
    }

    if (filters?.category && filters.category !== 'ALL') {
      filtered = filtered.filter((p: any) => p.category === filters.category);
    }

    if (filters?.minPrice !== undefined && filters?.minPrice !== null && filters?.minPrice !== '') {
      filtered = filtered.filter((p: any) => p.unitPrice >= Number(filters.minPrice));
    }

    if (filters?.maxPrice !== undefined && filters?.maxPrice !== null && filters?.maxPrice !== '') {
      filtered = filtered.filter((p: any) => p.unitPrice <= Number(filters.maxPrice));
    }
    
    return of({ data: filtered, total: filtered.length }).pipe(delay(300));
  }

  getCategories(): Observable<Category[]> {
    const categories = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    return of(categories).pipe(delay(200));
  }

  createCategory(catData: Partial<Category>): Observable<Category[]> {
    const categories = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    const name = (catData.name || '').trim();
    if (name) {
      const newCat: Category = {
        id: `CAT-${String(categories.length + 1).padStart(3, '0')}`,
        name: name,
        description: catData.description || ''
      };
      categories.push(newCat);
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    }
    return of(categories).pipe(delay(200));
  }

  updateCategory(id: string, catData: Partial<Category>): Observable<Category[]> {
    const categories: Category[] = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    const index = categories.findIndex(c => c.id === id);
    if (index >= 0) {
      categories[index] = {
        ...categories[index],
        name: (catData.name || categories[index].name).trim(),
        description: catData.description !== undefined ? catData.description : categories[index].description
      };
      localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    }
    return of(categories).pipe(delay(200));
  }

  deleteCategory(id: string): Observable<Category[]> {
    let categories: Category[] = JSON.parse(localStorage.getItem(this.CATEGORIES_KEY) || '[]');
    categories = categories.filter(c => c.id !== id);
    localStorage.setItem(this.CATEGORIES_KEY, JSON.stringify(categories));
    return of(categories).pipe(delay(200));
  }

  getProductById(id: string): Observable<Product | null> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const product = products.find((p: any) => p.id === id);
    return of(product || null).pipe(delay(300));
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const newProduct = {
      id: `PROD-${String(products.length + 1).padStart(3, '0')}`,
      ...data
    } as Product;
    products.push(newProduct);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return of(newProduct).pipe(delay(300));
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    let products: Product[] = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    const index = products.findIndex(p => p.id === id);
    
    if (index !== -1) {
      const updatedProduct = {
        ...products[index],
        ...data,
        id: products[index].id
      } as Product;
      
      products[index] = updatedProduct;
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
      return of(updatedProduct).pipe(delay(300));
    }
    
    throw new Error('Product not found');
  }

  deleteProduct(id: string): Observable<boolean> {
    let products: Product[] = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    products = products.filter(p => p.id !== id);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // SALES ORDERS
  // ============================================

  getSalesOrders(filters: any): Observable<{ data: SalesOrder[]; total: number }> {
    let orders: SalesOrder[] = JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]');
    
    // Convert date strings back to Date objects
    orders = orders.map(o => ({
      ...o,
      orderDate: new Date(o.orderDate),
      expectedDeliveryDate: o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate) : undefined,
      actualDeliveryDate: o.actualDeliveryDate ? new Date(o.actualDeliveryDate) : undefined
    }));

    // Apply status filter
    if (filters && filters.status && filters.status !== 'ALL') {
      orders = orders.filter(o => o.status === filters.status);
    }

    // Apply search filter
    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      orders = orders.filter(o => 
        o.orderNumber.toLowerCase().includes(term) || 
        o.customerName.toLowerCase().includes(term)
      );
    }

    // Apply date filters
    if (filters && filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      orders = orders.filter(o => o.orderDate >= from);
    }
    if (filters && filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      orders = orders.filter(o => o.orderDate <= to);
    }

    const total = orders.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = orders.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  getSalesOrderById(id: string): Observable<SalesOrder | null> {
    const orders: SalesOrder[] = JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]');
    const order = orders.find(o => o.id === id);
    if (order) {
      return of({
        ...order,
        orderDate: new Date(order.orderDate),
        expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate) : undefined,
        actualDeliveryDate: order.actualDeliveryDate ? new Date(order.actualDeliveryDate) : undefined
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  createSalesOrder(data: Partial<SalesOrder>): Observable<SalesOrder> {
    const orders: SalesOrder[] = JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]');
    const newOrder: SalesOrder = {
      id: Math.random().toString(36).substr(2, 9),
      orderNumber: `SO-${String(orders.length + 1).padStart(3, '0')}`,
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      items: data.items || [],
      subtotal: data.subtotal || 0,
      taxAmount: data.taxAmount || 0,
      discountAmount: data.discountAmount || 0,
      totalAmount: data.totalAmount || 0,
      currency: data.currency || 'NGN',
      status: data.status || 'PENDING',
      orderDate: data.orderDate || new Date(),
      expectedDeliveryDate: data.expectedDeliveryDate,
      actualDeliveryDate: data.actualDeliveryDate,
      notes: data.notes || '',
      shippingAddress: data.shippingAddress || ''
    };
    orders.unshift(newOrder);
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
    return of(newOrder).pipe(delay(300));
  }

  updateSalesOrder(id: string, data: Partial<SalesOrder>): Observable<SalesOrder> {
    let orders: SalesOrder[] = JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]');
    const index = orders.findIndex(o => o.id === id);
    
    if (index !== -1) {
      const updatedOrder = {
        ...orders[index],
        ...data,
        id: orders[index].id,
        orderNumber: orders[index].orderNumber
      } as SalesOrder;
      
      orders[index] = updatedOrder;
      localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
      return of(updatedOrder).pipe(delay(300));
    }
    
    throw new Error('Order not found');
  }

  deleteSalesOrder(id: string): Observable<boolean> {
    let orders: SalesOrder[] = JSON.parse(localStorage.getItem(this.ORDERS_KEY) || '[]');
    orders = orders.filter(o => o.id !== id);
    localStorage.setItem(this.ORDERS_KEY, JSON.stringify(orders));
    return of(true).pipe(delay(300));
  }

  // ============================================
  // PAYMENTS
  // ============================================

  getPayments(filters: any): Observable<{ data: Payment[]; total: number }> {
    let payments: Payment[] = JSON.parse(localStorage.getItem(this.PAYMENTS_KEY) || '[]');
    
    // Map dates back to Date objects
    payments = payments.map(p => ({
      ...p,
      paymentDate: new Date(p.paymentDate)
    }));

    if (filters && filters.invoiceId) {
      payments = payments.filter(p => p.invoiceId === filters.invoiceId);
    }

    if (filters && filters.customerId) {
      payments = payments.filter(p => p.customerId === filters.customerId);
    }

    if (filters && filters.status && filters.status !== 'ALL') {
      payments = payments.filter(p => p.status === filters.status);
    }

    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      payments = payments.filter(p => 
        p.paymentNumber.toLowerCase().includes(term) || 
        p.customerName.toLowerCase().includes(term) ||
        p.reference.toLowerCase().includes(term)
      );
    }

    if (filters && filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      payments = payments.filter(p => p.paymentDate >= from);
    }
    if (filters && filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      payments = payments.filter(p => p.paymentDate <= to);
    }

    const total = payments.length;
    const page = filters?.page || 0;
    const size = filters?.size || 10;
    const paginatedData = payments.slice(page * size, (page + 1) * size);

    return of({ data: paginatedData, total }).pipe(delay(300));
  }

  recordPayment(data: Partial<Payment>): Observable<Payment> {
    const payments: Payment[] = JSON.parse(localStorage.getItem(this.PAYMENTS_KEY) || '[]');
    
    // Generate new payment
    const newPayment: Payment = {
      id: Math.random().toString(36).substr(2, 9),
      paymentNumber: `PAY-${String(payments.length + 1).padStart(3, '0')}`,
      invoiceId: data.invoiceId || '',
      customerId: data.customerId || '',
      customerName: data.customerName || '',
      amount: data.amount || 0,
      currency: data.currency || 'NGN',
      method: data.method || 'CASH',
      reference: data.reference || `REF-${Math.floor(100000 + Math.random() * 900000)}`,
      status: data.status || 'COMPLETED',
      paymentDate: data.paymentDate || new Date(),
      notes: data.notes || ''
    };

    // Prepend new payment
    payments.unshift(newPayment);
    localStorage.setItem(this.PAYMENTS_KEY, JSON.stringify(payments));

    // Update corresponding invoice
    if (newPayment.invoiceId && newPayment.status === 'COMPLETED') {
      const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
      const invoiceIndex = invoices.findIndex(i => i.id === newPayment.invoiceId);
      
      if (invoiceIndex !== -1) {
        const invoice = invoices[invoiceIndex];
        const newAmountPaid = (invoice.amountPaid || 0) + newPayment.amount;
        const newBalanceDue = Math.max(0, invoice.totalAmount - newAmountPaid);
        
        invoices[invoiceIndex] = {
          ...invoice,
          amountPaid: newAmountPaid,
          balanceDue: newBalanceDue,
          paidAt: newBalanceDue === 0 ? newPayment.paymentDate : invoice.paidAt
        };
        
        localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
      }
    }

    return of(newPayment).pipe(delay(300));
  }

  getPaymentById(id: string): Observable<Payment | null> {
    const payments: Payment[] = JSON.parse(localStorage.getItem(this.PAYMENTS_KEY) || '[]');
    const payment = payments.find(p => p.id === id || p.paymentNumber === id);
    if (payment) {
      return of({
        ...payment,
        paymentDate: new Date(payment.paymentDate)
      }).pipe(delay(300));
    }
    return of(null).pipe(delay(300));
  }

  // ============================================
  // DELIVERY NOTES
  // ============================================

  getDeliveryNotes(filters: any): Observable<{ data: DeliveryNote[]; total: number }> {
    return of({ data: [], total: 0 }).pipe(delay(300));
  }

  getDeliveryNoteById(id: string): Observable<DeliveryNote | null> {
    return of(null).pipe(delay(300));
  }
}