import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
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
  QuoteItem,
  InvoiceItem,
  MerchantInfo,
  PaymentReceipt,
  PaymentMethod,
  PaymentMode,
  PaymentTerms,
  AdditionalInvoiceOptions,
  AdditionalQuoteOptions,
  SalesandTransactions,
  MeasurementUnit,
  Supplier
} from '../../domain/sales/sales.dto';
import { environment } from '../../shared-component/service/environments/environment';

export const defaultMerchantInfo: MerchantInfo = {
  id: 0,
  merchantId: '',
  name: '',
  companyName: '',
  bankDetails: { bankName: '', accountName: '', accountNumber: '' },
  address: [],
  phone: '',
  email: '',
  taxId: '',
  logoUrl: []
};

@Injectable({
  providedIn: 'root'
})
export class SalesService {

  private readonly base = `${environment.apiBaseUrl}/x/api/v2/commerce`;

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  constructor(private http: HttpClient) {}

  // ============================================
  // DASHBOARD — no dedicated endpoint, return stubs
  // ============================================

  getDashboardStats(range: string): Observable<SalesSummary> {
    const params = new HttpParams().set('dateRange', range);
    // Attempt to fetch real stats from backend; fallback to stubbed data on failure
    return this.http.get<SalesSummary>(`${this.base}/dashboard-stats`, { params }).pipe(
      catchError(() => {
        // Stubbed data – can be enhanced per range if needed
        const stub: SalesSummary = {
          totalRevenue: 0,
          totalQuotes: 0,
          pendingQuotes: 0,
          acceptedQuotes: 0,
          totalInvoices: 0,
          paidInvoices: 0,
          overdueInvoices: 0,
          totalCustomers: 0
        };
        return of(stub);
      })
    );
  }

  getRecentQuotes(limit: number): Observable<Quote[]> {
    return this.getQuotes({ page: 0, size: limit }).pipe(
      map(res => res.data)
    );
  }

  getRecentInvoices(limit: number): Observable<Invoice[]> {
    return this.getInvoices({ page: 0, size: limit }).pipe(
      map(res => res.data)
    );
  }

  getTopProducts(limit: number): Observable<TopProduct[]> {
    return of([]);
  }

  getRevenueChart(range: string): Observable<RevenueChartData[]> {
    const params = new HttpParams().set('dateRange', range);
    // Fetch revenue chart data; fallback to empty array on error
    return this.http.get<RevenueChartData[]>(`${this.base}/dashboard-revenue`, { params }).pipe(
      catchError(() => of([]))
    );
  }

  // ============================================
  // QUOTES
  // ============================================

  getQuotes(filters: any): Observable<{ data: Quote[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);

    return this.http.get<any>(`${this.base}/quotes`, { params }).pipe(
      map(res => {
        const arr: Quote[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  getQuoteById(id: string | number): Observable<Quote | null> {
    return this.http.get<Quote>(`${this.base}/quotes/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createQuote(data: Partial<Quote>): Observable<Quote> {
    const quoteNumber = data.quoteNumber || `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    return this.http.post<Quote>(`${this.base}/quotes`, { ...data, quoteNumber, tenantId: this.tenantId });
  }

  updateQuote(id: string | number, data: Partial<Quote>): Observable<Quote> {
    return this.http.put<Quote>(`${this.base}/quotes/${id}`, { ...data, tenantId: this.tenantId });
  }

  updateQuoteStatus(id: string | number, status: QuoteStatus): Observable<Quote> {
    return this.http.patch<Quote>(`${this.base}/quotes/${id}/status`, { status, tenantId: this.tenantId });
  }

  deleteQuote(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/quotes/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ============================================
  // INVOICES
  // ============================================

  getInvoices(filters: any): Observable<{ data: Invoice[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);

    return this.http.get<any>(`${this.base}/invoices`, { params }).pipe(
      map(res => {
        const arr: Invoice[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  getInvoiceById(id: string | number): Observable<Invoice | null> {
    return this.http.get<Invoice>(`${this.base}/invoices/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createInvoice(data: Partial<Invoice>): Observable<Invoice> {
    const invoiceNumber = data.invoiceNumber || `INV-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    return this.http.post<Invoice>(`${this.base}/invoices`, { ...data, invoiceNumber, tenantId: this.tenantId });
  }

  updateInvoice(id: string | number, data: Partial<Invoice>): Observable<Invoice> {
    return this.http.put<Invoice>(`${this.base}/invoices/${id}`, { ...data, tenantId: this.tenantId });
  }

  updateInvoiceStatus(id: string | number, status: InvoiceStatus): Observable<Invoice> {
    return this.http.patch<Invoice>(`${this.base}/invoices/${id}/status`, { status, tenantId: this.tenantId });
  }

  deleteInvoice(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/invoices/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ============================================
  // CUSTOMERS
  // ============================================

  getCustomers(filters: any): Observable<{ data: Customer[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);

    return this.http.get<any>(`${this.base}/customers`, { params }).pipe(
      map(res => {
        const arr: Customer[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  getCustomerById(id: string): Observable<Customer | null> {
    return this.http.get<Customer>(`${this.base}/customers/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createCustomer(data: Partial<Customer>): Observable<Customer> {
    return this.http.post<Customer>(`${this.base}/customers`, { ...data, tenantId: this.tenantId });
  }

  updateCustomer(id: string, data: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${this.base}/customers/${id}`, { ...data, tenantId: this.tenantId });
  }

  deleteCustomer(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/customers/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ============================================
  // PRODUCTS
  // ============================================

  getProducts(filters: any): Observable<{ data: Product[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.category && filters.category !== 'ALL') params = params.set('categoryId', String(filters.category));

    return this.http.get<any>(`${this.base}/products`, { params }).pipe(
      map(res => {
        const arr: Product[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  getProductById(id: string): Observable<Product | null> {
    return this.http.get<Product>(`${this.base}/products/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createProduct(data: Partial<Product>): Observable<Product> {
    return this.http.post<Product>(`${this.base}/products`, { ...data, tenantId: this.tenantId });
  }

  updateProduct(id: string, data: Partial<Product>): Observable<Product> {
    return this.http.put<Product>(`${this.base}/products/${id}`, { ...data, tenantId: this.tenantId });
  }

  deleteProduct(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/products/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ============================================
  // CATEGORIES
  // ============================================

  getCategories(): Observable<Category[]> {
    const params = new HttpParams().set('tenantId', this.tenantId);
    return this.http.get<any>(`${this.base}/categories`, { params }).pipe(
      map(res => res.data ?? res ?? []),
      catchError(() => of([]))
    );
  }

  getCategoryById(id: string | number): Observable<Category | null> {
    return this.http.get<Category>(`${this.base}/categories/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createCategory(catData: Partial<Category>): Observable<Category[]> {
    return this.http.post<any>(`${this.base}/categories`, { ...catData, tenantId: this.tenantId }).pipe(
      switchMap(() => this.getCategories())
    );
  }

  updateCategory(id: string | number, catData: Partial<Category>): Observable<Category[]> {
    return this.http.put<any>(`${this.base}/categories/${id}`, { ...catData, tenantId: this.tenantId }).pipe(
      switchMap(() => this.getCategories())
    );
  }

  deleteCategory(id: string | number): Observable<Category[]> {
    return this.http.delete<any>(`${this.base}/categories/${id}`).pipe(
      switchMap(() => this.getCategories())
    );
  }

  // ============================================
  // SALES ORDERS (getSalesandTransactions)
  // ============================================

  getSalesandTransactions(filters: any): Observable<{ data: SalesandTransactions[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);
    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);

    return this.http.get<any>(`${this.base}/sales-orders`, { params }).pipe(
      map(res => {
        const arr: SalesandTransactions[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  getSalesandTransactionsById(id: string | number): Observable<SalesandTransactions | null> {
    return this.http.get<SalesandTransactions>(`${this.base}/sales-orders/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createSalesandTransactions(data: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    const d = data as any;
    const orderNumber = d.orderNumber || `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    return this.http.post<SalesandTransactions>(`${this.base}/sales-orders`, { ...data, orderNumber, tenantId: this.tenantId });
  }

  updateSalesandTransactions(id: string | number, data: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    return this.http.put<SalesandTransactions>(`${this.base}/sales-orders/${id}`, { ...data, tenantId: this.tenantId });
  }

  updateSalesOrderStatus(id: string | number, status: string): Observable<SalesandTransactions> {
    return this.http.patch<SalesandTransactions>(`${this.base}/sales-orders/${id}/status`, { status, tenantId: this.tenantId });
  }

  deleteSalesandTransactions(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/sales-orders/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ============================================
  // PAYMENTS
  // ============================================

  getPayments(filters: any): Observable<{ data: any[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.invoiceId) params = params.set('invoiceId', filters.invoiceId);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);

    return this.http.get<any>(`${this.base}/payments`, { params }).pipe(
      map(res => {
        const arr: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  createPayment(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/payments`, { ...data, tenantId: this.tenantId });
  }

  updatePaymentStatus(id: string | number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/payments/${id}/status`, { status, tenantId: this.tenantId });
  }

  // ============================================
  // DELIVERY NOTES
  // ============================================

  getDeliveryNotes(filters: any): Observable<{ data: any[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.salesOrderId) params = params.set('salesOrderId', filters.salesOrderId);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);

    return this.http.get<any>(`${this.base}/delivery-notes`, { params }).pipe(
      map(res => {
        const arr: any[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  createDeliveryNote(data: any): Observable<any> {
    return this.http.post<any>(`${this.base}/delivery-notes`, { ...data, tenantId: this.tenantId });
  }

  updateDeliveryNoteStatus(id: string | number, status: string): Observable<any> {
    return this.http.patch<any>(`${this.base}/delivery-notes/${id}/status`, { status, tenantId: this.tenantId });
  }

  // ============================================
  // MERCHANT INFO — no backend endpoint, return constant
  // ============================================

  getMerchantInfo(): MerchantInfo {
    const tenant = window.location.hostname.split('.')[0] || 'merchant';
    return {
      id: 0,
      merchantId: '',
      name: tenant,
      companyName: tenant,
      bankDetails: { bankName: '', accountName: '', accountNumber: '' },
      address: [],
      phone: '',
      email: '',
      taxId: '',
      logoUrl: []
    };
  }

  // ============================================
  // MEASUREMENT UNITS
  // ============================================

  private readonly defaultUnits: MeasurementUnit[] = [
    { id: 1, unitId: 'UNT-001', name: 'Each', code: 'pcs', description: 'Single item count' },
    { id: 2, unitId: 'UNT-002', name: 'Kilogram', code: 'kg', description: 'Mass weight unit' },
    { id: 3, unitId: 'UNT-003', name: 'Gram', code: 'g', description: 'Mass weight unit' },
    { id: 4, unitId: 'UNT-004', name: 'Liter', code: 'L', description: 'Liquid volume unit' },
    { id: 5, unitId: 'UNT-005', name: 'Milliliter', code: 'mL', description: 'Liquid volume unit' },
    { id: 6, unitId: 'UNT-006', name: 'Meter', code: 'm', description: 'Linear length unit' },
    { id: 7, unitId: 'UNT-007', name: 'Centimeter', code: 'cm', description: 'Linear length unit' },
    { id: 8, unitId: 'UNT-008', name: 'Box', code: 'box', description: 'Box package' },
    { id: 9, unitId: 'UNT-009', name: 'Pack', code: 'pack', description: 'Pack container unit' },
    { id: 10, unitId: 'UNT-010', name: 'Carton', code: 'ctn', description: 'Carton container unit' }
  ];

  getMeasurementUnits(): Observable<MeasurementUnit[]> {
    const params = new HttpParams().set('tenantId', this.tenantId);
    return this.http.get<any>(`${this.base}/measurement-units`, { params }).pipe(
      map(res => {
        const arr: any[] = res.data ?? (Array.isArray(res) ? res : []);
        return arr.map(u => ({
          id: u.id,
          unitId: String(u.id),
          name: u.name,
          code: u.code,
          description: u.description
        } as MeasurementUnit));
      }),
      catchError(() => of(this.defaultUnits))
    );
  }

  createMeasurementUnit(unitData: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
    return this.http.post<any>(`${this.base}/measurement-units`, { ...unitData, tenantId: this.tenantId }).pipe(
      switchMap(() => this.getMeasurementUnits())
    );
  }

  updateMeasurementUnit(id: string | number, unitData: Partial<MeasurementUnit>): Observable<MeasurementUnit[]> {
    return this.http.put<any>(`${this.base}/measurement-units/${id}`, { ...unitData, tenantId: this.tenantId }).pipe(
      switchMap(() => this.getMeasurementUnits())
    );
  }

  deleteMeasurementUnit(id: string | number): Observable<MeasurementUnit[]> {
    return this.http.delete<any>(`${this.base}/measurement-units/${id}`).pipe(
      switchMap(() => this.getMeasurementUnits())
    );
  }

  // ============================================
  // SUPPLIERS
  // ============================================

  getSuppliers(): Observable<Supplier[]> {
    const params = new HttpParams().set('tenantId', this.tenantId);
    return this.http.get<any>(`${this.base}/suppliers`, { params }).pipe(
      map(res => {
        const arr: any[] = res.data ?? (Array.isArray(res) ? res : []);
        return arr.map(s => ({
          id: s.id,
          supplierId: String(s.id),
          name: s.name,
          email: s.email,
          phone: s.phone,
          address: s.address,
          contactPerson: s.contactPerson
        } as Supplier));
      }),
      catchError(() => of([]))
    );
  }

  createSupplier(supplierData: Partial<Supplier>): Observable<Supplier[]> {
    return this.http.post<any>(`${this.base}/suppliers`, { ...supplierData, tenantId: this.tenantId }).pipe(
      switchMap(() => this.getSuppliers())
    );
  }

  updateSupplier(id: string | number, supplierData: Partial<Supplier>): Observable<Supplier[]> {
    return this.http.put<any>(`${this.base}/suppliers/${id}`, { ...supplierData, tenantId: this.tenantId }).pipe(
      switchMap(() => this.getSuppliers())
    );
  }

  deleteSupplier(id: string | number): Observable<Supplier[]> {
    return this.http.delete<any>(`${this.base}/suppliers/${id}`).pipe(
      switchMap(() => this.getSuppliers())
    );
  }

  // ============================================
  // PAYMENT RECEIPT — assembled from sales-orders + invoices
  // ============================================

  getPaymentReceipt(paymentId: string): Observable<PaymentReceipt | null> {
    return this.getSalesandTransactionsById(paymentId).pipe(
      map(tx => {
        if (!tx) return null;
        const receipt: PaymentReceipt = {
          receiptNumber: `RCT-${(tx.paymentNumber || '').replace('PAY-', '')}`,
          payment: tx,
          invoice: tx.invoiceId as any,
          customer: tx.customerId,
          merchantInfo: this.getMerchantInfo(),
          issuedAt: tx.orderDate
        };
        return receipt;
      }),
      catchError(() => of(null))
    );
  }
}
