// src/app/ui/service/sales-module/sales.service.ts

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
  SalesOrder,
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

  constructor() {
    this.initData();
  }

  private initData(): void {
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

    if (!localStorage.getItem(this.PRODUCTS_KEY)) {
      const mockProducts: Product[] = [
        { id: 'PROD-001', name: 'Executive Office Chair', sku: 'CHR-001', description: 'Ergonomic executive office chair', unitPrice: 50000, costPrice: 30000, currency: 'NGN', stockQuantity: 50, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-002', name: 'Standing Desk', sku: 'DSK-001', description: 'Adjustable standing desk', unitPrice: 120000, costPrice: 80000, currency: 'NGN', stockQuantity: 30, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-003', name: 'Laptop - Dell XPS', sku: 'LAP-001', description: 'Dell XPS 13 laptop', unitPrice: 850000, costPrice: 700000, currency: 'NGN', stockQuantity: 15, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-004', name: 'Conference Table', sku: 'TBL-001', description: 'Large conference table', unitPrice: 250000, costPrice: 180000, currency: 'NGN', stockQuantity: 10, category: 'Furniture', taxRate: 7.5, images: [], status: 'ACTIVE' },
        { id: 'PROD-005', name: 'Printer - HP LaserJet', sku: 'PRN-001', description: 'HP LaserJet printer', unitPrice: 150000, costPrice: 120000, currency: 'NGN', stockQuantity: 25, category: 'Electronics', taxRate: 7.5, images: [], status: 'ACTIVE' }
      ];
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(mockProducts));
    }

    if (!localStorage.getItem(this.QUOTES_KEY)) {
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
        }
      ];
      localStorage.setItem(this.QUOTES_KEY, JSON.stringify(mockQuotes));
    }

    if (!localStorage.getItem(this.INVOICES_KEY)) {
      const mockInvoices: Invoice[] = [
        {
          id: '1', invoiceNumber: 'INV-001', orderId: 'ORD-001', customerId: 'CUST-001', customerName: 'Mama Nkechi Enterprises',
          items: [
            { id: 'item-inv-1', productName: 'Executive Office Chair', description: 'Office chairs', quantity: 10, unitPrice: 50000, total: 500000 }
          ],
          subtotal: 500000, taxAmount: 0, discountAmount: 0, totalAmount: 500000, amountPaid: 500000, balanceDue: 0,
          currency: 'NGN', status: 'PAID' as InvoiceStatus, issueDate: new Date('2026-06-10'), dueDate: new Date('2026-06-20'), paidAt: new Date('2026-06-15'), notes: '', paymentTerms: 'Net 30'
        },
        {
          id: '2', invoiceNumber: 'INV-002', orderId: 'ORD-002', customerId: 'CUST-002', customerName: 'Tech Solutions Ltd',
          items: [
            { id: 'item-inv-2', productName: 'Laptop - Dell XPS', description: 'Laptops', quantity: 1, unitPrice: 850000, total: 850000 }
          ],
          subtotal: 850000, taxAmount: 0, discountAmount: 0, totalAmount: 850000, amountPaid: 0, balanceDue: 850000,
          currency: 'NGN', status: 'SENT' as InvoiceStatus, issueDate: new Date('2026-06-09'), dueDate: new Date('2026-06-25'), notes: '', paymentTerms: 'Net 30'
        }
      ];
      localStorage.setItem(this.INVOICES_KEY, JSON.stringify(mockInvoices));
    }
  }

  // Dashboard
  getDashboardStats(range: string): Observable<SalesSummary> {
    const quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');

    const totalRevenue = invoices.filter(i => i.status === 'PAID').reduce((sum, i) => sum + i.totalAmount, 0);

    return of({
      totalRevenue: totalRevenue || 2845000,
      totalQuotes: quotes.length,
      pendingQuotes: quotes.filter(q => q.status === 'SENT' || q.status === 'DRAFT').length,
      acceptedQuotes: quotes.filter(q => q.status === 'ACCEPTED' || q.status === 'CONVERTED').length,
      totalInvoices: invoices.length,
      paidInvoices: invoices.filter(i => i.status === 'PAID').length,
      overdueInvoices: invoices.filter(i => i.status === 'OVERDUE').length,
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

  // Quotes
  getQuotes(filters: any): Observable<{ data: Quote[]; total: number }> {
    let quotes: Quote[] = JSON.parse(localStorage.getItem(this.QUOTES_KEY) || '[]');
    
    // Convert dates
    quotes = quotes.map(q => ({
      ...q,
      createdAt: new Date(q.createdAt),
      validUntil: new Date(q.validUntil),
      expiresAt: q.expiresAt ? new Date(q.expiresAt) : new Date(q.validUntil)
    }));

    // Status filter
    if (filters && filters.status && filters.status !== 'ALL') {
      quotes = quotes.filter(q => q.status === filters.status);
    }

    // Search filter
    if (filters && filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      quotes = quotes.filter(q => 
        q.quoteNumber.toLowerCase().includes(term) || 
        q.customerName.toLowerCase().includes(term)
      );
    }

    const total = quotes.length;
    
    // Pagination
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

    quotes.unshift(newQuote); // Show newest first
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
    
    return of({} as Quote).pipe(delay(300));
  }

  // Invoices
  getInvoices(filters: any): Observable<{ data: Invoice[]; total: number }> {
    const invoices = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    return of({ data: invoices, total: invoices.length }).pipe(delay(300));
  }

  getInvoiceById(id: string): Observable<Invoice | null> {
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const invoice = invoices.find(i => i.id === id);
    return of(invoice || null).pipe(delay(300));
  }

  createInvoice(data: Partial<Invoice>): Observable<Invoice> {
    const invoices: Invoice[] = JSON.parse(localStorage.getItem(this.INVOICES_KEY) || '[]');
    const newInvoice = {
      id: Math.random().toString(36).substr(2, 9),
      invoiceNumber: `INV-${String(invoices.length + 1).padStart(3, '0')}`,
      ...data
    } as Invoice;
    invoices.push(newInvoice);
    localStorage.setItem(this.INVOICES_KEY, JSON.stringify(invoices));
    return of(newInvoice).pipe(delay(300));
  }

  // Customers
  getCustomers(filters: any): Observable<{ data: Customer[]; total: number }> {
    const customers = JSON.parse(localStorage.getItem(this.CUSTOMERS_KEY) || '[]');
    return of({ data: customers, total: customers.length }).pipe(delay(300));
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
      ...data
    } as Customer;
    customers.push(newCustomer);
    localStorage.setItem(this.CUSTOMERS_KEY, JSON.stringify(customers));
    return of(newCustomer).pipe(delay(300));
  }

  // Products
  getProducts(filters: any): Observable<{ data: Product[]; total: number }> {
    const products = JSON.parse(localStorage.getItem(this.PRODUCTS_KEY) || '[]');
    return of({ data: products, total: products.length }).pipe(delay(300));
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

  // Sales Orders
  getSalesOrders(filters: any): Observable<{ data: SalesOrder[]; total: number }> {
    return of({ data: [], total: 0 }).pipe(delay(300));
  }

  getSalesOrderById(id: string): Observable<SalesOrder | null> {
    return of(null).pipe(delay(300));
  }

  // Payments
  getPayments(filters: any): Observable<{ data: Payment[]; total: number }> {
    return of({ data: [], total: 0 }).pipe(delay(300));
  }

  recordPayment(data: Partial<Payment>): Observable<Payment> {
    return of({} as Payment).pipe(delay(300));
  }

  // Delivery Notes
  getDeliveryNotes(filters: any): Observable<{ data: DeliveryNote[]; total: number }> {
    return of({ data: [], total: 0 }).pipe(delay(300));
  }

  getDeliveryNoteById(id: string): Observable<DeliveryNote | null> {
    return of(null).pipe(delay(300));
  }
}