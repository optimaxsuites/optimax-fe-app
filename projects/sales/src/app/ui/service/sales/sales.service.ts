import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import {
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
  DeliveryNote,
  DeliveryNoteItem,
  DeliveryNoteStatus,
  PaymentMethod,
  PaymentMode,
  PaymentTerms,
  AdditionalInvoiceOptions,
  AdditionalQuoteOptions,
  QuoteDocumentAttachment,
  DeliveryNoteMeta,
  SalesandTransactions,
  SaleLifecycleStatus,
  MeasurementUnit,
  Supplier
} from '../../domain/sales/sales.dto';
import { environment } from '../../shared-component/service/environments/environment';
import { parseApiDate } from './date.util';

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

  /**
   * Most-recent-first. Sorts on `dateField` (falling back to `id` when the
   * date is missing/unparseable or two records tie) rather than trusting
   * the backend's own ordering, which isn't guaranteed to be chronological.
   */
  private sortNewestFirst<T extends { id: number }>(arr: T[], dateField: keyof T): T[] {
    return [...arr].sort((a, b) => {
      const aTime = parseApiDate(a[dateField] as any)?.getTime();
      const bTime = parseApiDate(b[dateField] as any)?.getTime();
      if (aTime != null && bTime != null && aTime !== bTime) return bTime - aTime;
      return b.id - a.id;
    });
  }

  // ============================================
  // DASHBOARD — getDashboardStats/getRecentQuotes/getRecentInvoices/getTopProducts/
  // getRevenueChart used to live here, but /dashboard-stats and /dashboard-revenue were never
  // real endpoints (always stubs — getTopProducts was a permanent `return of([])`), and
  // SalesDashboardComponent now computes everything client-side from the real
  // getQuotes/getInvoices/getCustomers/getSalesandTransactions data instead. Confirmed zero
  // callers anywhere in the codebase before removing.
  // ============================================
  // QUOTES
  // ============================================

  /** Pulls a display name off a Quote/Invoice's customerName, whether it's an embedded object or a raw string. */
  private resolveEntityCustomerName(entity: { customerName?: any }): string {
    const cn = entity.customerName;
    return (typeof cn === 'object' ? cn?.name : cn) || '';
  }

  /** Inclusive day-range check against `dateField`, using parseApiDate so timestamp format quirks don't matter. */
  private matchesDateRange<T>(item: T, dateField: keyof T, dateFrom?: string, dateTo?: string): boolean {
    if (!dateFrom && !dateTo) return true;
    const value = parseApiDate(item[dateField] as any);
    if (!value) return false;
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      if (value < from) return false;
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      if (value > to) return false;
    }
    return true;
  }

  /**
   * Fetches a large batch and does search/date-range/sort/paginate entirely client-side,
   * rather than trusting the backend's own query params. That combination previously caused
   * two separate problems: newly created quotes going missing (page 1 — what the UI always
   * requests first — isn't guaranteed to be the backend's most-recent page unless it actually
   * honors `sort`), and the search box / date range fields silently doing nothing (the `search`
   * query param and `dateFrom`/`dateTo` were either never sent or aren't supported server-side).
   */
  getQuotes(filters: any): Observable<{ data: Quote[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId).set('page', '1').set('size', '1000');

    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);

    return this.http.get<any>(`${this.base}/quotes`, { params }).pipe(
      map(res => {
        const arr: Quote[] = Array.isArray(res) ? res : (res?.data ?? []);
        let result = this.sortNewestFirst(arr, 'createdAt');

        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter(q => q.status === filters.status);
        }

        const term = String(filters?.searchTerm ?? '').trim().toLowerCase();
        if (term) {
          result = result.filter(q =>
            (q.quoteNumber || '').toLowerCase().includes(term) ||
            this.resolveEntityCustomerName(q).toLowerCase().includes(term)
          );
        }

        if (filters?.dateFrom || filters?.dateTo) {
          result = result.filter(q => this.matchesDateRange(q, 'createdAt', filters.dateFrom, filters.dateTo));
        }

        const page = filters?.page ?? 0;
        const size = filters?.size ?? (result.length || 1);
        const start = page * size;
        return { data: result.slice(start, start + size), total: result.length };
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
    return this.http.post<any>(`${this.base}/quotes`, { ...data, quoteNumber, tenantId: this.tenantId }).pipe(
      switchMap(res => {
        const id = typeof res === 'object' ? (res.id ?? res) : res;
        return this.getQuoteById(id).pipe(map(q => q as Quote));
      }),
      // Every quote should show up on the Sales & Transactions lifecycle tracker from the
      // moment it exists, not only once someone later clicks "Accept Quote" — otherwise the
      // tab silently misses any quote that's still draft/sent/declined. Fire-and-forget: a
      // failure here shouldn't block the quote itself from being created.
      tap(quote => this.trackNewQuote(quote))
    );
  }

  private trackNewQuote(quote: Quote): void {
    if (!quote) return;
    const addOpts = Array.isArray(quote.additionalOptions) ? quote.additionalOptions[0] : (quote.additionalOptions as any);
    this.upsertTransactionForQuote(quote.id, {
      quoteId: quote,
      customerId: quote.customerId,
      customerName: quote.customerName,
      items: quote,
      subtotal: quote.subtotal,
      taxAmount: quote.taxAmount,
      discountAmount: quote.discountAmount,
      totalAmount: quote.totalAmount,
      currency: quote.currency,
      status: 'QUOTE_SENT',
      quoteSentDate: new Date(),
      customerNotes: addOpts?.notes || '',
      billingAddress: addOpts?.address || '',
      shippingAddress: addOpts?.address || ''
    }).subscribe({
      error: (err) => console.error('Failed to auto-track new quote in Sales & Transactions:', err)
    });
  }

  /**
   * Finds the sales-transaction record already tracking a given quote's lifecycle (created
   * automatically when the quote itself was created — see trackNewQuote()) and merges `patch`
   * into it, advancing its status/fields. Falls back to creating one if none exists yet, e.g.
   * for quotes created before this auto-tracking existed.
   */
  upsertTransactionForQuote(quoteId: number | string, patch: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    return this.getSalesandTransactions({ quoteId, size: 1000 }).pipe(
      switchMap(res => {
        const existing = res.data?.[0];
        return existing
          ? this.updateSalesandTransactions(existing.id, patch)
          : this.createSalesandTransactions({ orderDate: new Date(), ...patch });
      })
    );
  }

  /** Same as upsertTransactionForQuote(), keyed on invoiceId instead. */
  upsertTransactionForInvoice(invoiceId: number | string, patch: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    return this.getSalesandTransactions({ invoiceId, size: 1000 }).pipe(
      switchMap(res => {
        const existing = res.data?.[0];
        return existing
          ? this.updateSalesandTransactions(existing.id, patch)
          : this.createSalesandTransactions({ orderDate: new Date(), ...patch });
      })
    );
  }

  /**
   * "Conversion" (Create Quote -> Conversion -> Receive LPO -> ...): the customer has accepted
   * the quote, so it becomes a firm order. Flips the quote to CONVERTED and advances its linked
   * transaction (created back when the quote itself was made — see trackNewQuote()) to
   * QUOTE_ACCEPTED, rather than creating a second one. Shared by quote-list and quote-detail so
   * "Convert" works the same wherever it's triggered from.
   */
  convertQuote(quote: Quote): Observable<{ quote: Quote; transaction: SalesandTransactions }> {
    return this.updateQuote(String(quote.id), { status: 'CONVERTED' }).pipe(
      switchMap(updated => {
        const addOpts = Array.isArray(updated.additionalOptions) ? updated.additionalOptions[0] : (updated.additionalOptions as any);
        const orderData: Partial<SalesandTransactions> = {
          quoteId: updated,
          customerId: updated.customerId,
          customerName: updated.customerName,
          items: updated,
          subtotal: updated.subtotal,
          taxAmount: updated.taxAmount,
          discountAmount: updated.discountAmount,
          totalAmount: updated.totalAmount,
          currency: updated.currency,
          status: 'QUOTE_ACCEPTED',
          quoteAcceptedOrRejectedDate: new Date(),
          customerNotes: addOpts?.notes || '',
          billingAddress: addOpts?.address || '',
          shippingAddress: addOpts?.address || '',
          PaymentTerms: {
            id: 1,
            customerId: updated.customerId,
            customerName: updated.customerName,
            paymentPeriod: 30,
            amount: updated.totalAmount,
            balanceDue: updated.totalAmount,
            installmentNumber: 1,
            completedInstallments: 0
          }
        };
        return this.upsertTransactionForQuote(updated.id, orderData).pipe(
          map(transaction => ({ quote: updated, transaction }))
        );
      })
    );
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
  // QUOTE LPO / SIGNED DELIVERY NOTE DOCUMENTS
  // Stored on the quote's own additionalOptions (PUT /quotes/{id}) — see
  // QuoteDocumentAttachment's doc comment for why, in the absence of a dedicated
  // document-storage backend.
  // ============================================

  hasLpoDocument(quote: Quote | null | undefined): boolean {
    return !!this.firstAdditionalOptions(quote)?.lpoDocument;
  }

  hasSignedDeliveryNoteDocument(quote: Quote | null | undefined): boolean {
    return !!this.firstAdditionalOptions(quote)?.signedDeliveryNoteDocument;
  }

  private firstAdditionalOptions(quote: Quote | null | undefined): AdditionalQuoteOptions | undefined {
    if (!quote) return undefined;
    return Array.isArray(quote.additionalOptions) ? quote.additionalOptions[0] : (quote.additionalOptions as any);
  }

  private patchAdditionalOptions(quoteId: string | number, patch: Partial<AdditionalQuoteOptions>): Observable<Quote> {
    return this.getQuoteById(quoteId).pipe(
      switchMap(quote => {
        const existing = this.firstAdditionalOptions(quote) || {} as AdditionalQuoteOptions;
        const addOpts: AdditionalQuoteOptions = {
          signatureText: existing.signatureText || '',
          attachments: existing.attachments || [],
          email: existing.email || '',
          address: existing.address || '',
          phone: existing.phone || '',
          notes: existing.notes || '',
          terms: existing.terms || '',
          lpoDocument: existing.lpoDocument,
          signedDeliveryNoteDocument: existing.signedDeliveryNoteDocument,
          deliveryNoteMeta: existing.deliveryNoteMeta,
          ...patch
        };
        return this.updateQuote(quoteId, { additionalOptions: [addOpts] });
      })
    );
  }

  saveQuoteLpoDocument(quoteId: string | number, doc: QuoteDocumentAttachment): Observable<Quote> {
    return this.patchAdditionalOptions(quoteId, { lpoDocument: doc });
  }

  saveSignedDeliveryNoteDocument(quoteId: string | number, doc: QuoteDocumentAttachment): Observable<Quote> {
    return this.patchAdditionalOptions(quoteId, { signedDeliveryNoteDocument: doc });
  }

  getDeliveryNoteMeta(quote: Quote | null | undefined): DeliveryNoteMeta {
    return this.firstAdditionalOptions(quote)?.deliveryNoteMeta || {};
  }

  saveDeliveryNoteMeta(quoteId: string | number, meta: DeliveryNoteMeta): Observable<Quote> {
    return this.patchAdditionalOptions(quoteId, { deliveryNoteMeta: meta });
  }

  // ============================================
  // ORDER # LOOKUP
  // Only SalesandTransactions carries the canonical orderId natively — Quote and DeliveryNote
  // link to it indirectly (via quoteId / salesOrderId), so this resolves it once for any
  // table/detail view that needs to display "Order #" next to a quote or delivery note.
  // ============================================

  getOrderIdLookup(): Observable<{ byQuoteId: Map<number, string>; byTransactionId: Map<number, string> }> {
    return this.getSalesandTransactions({ size: 1000 }).pipe(
      map(res => {
        const byQuoteId = new Map<number, string>();
        const byTransactionId = new Map<number, string>();
        res.data.forEach(tx => {
          if (!tx.orderId) return;
          byTransactionId.set(tx.id, tx.orderId);
          const quoteId = (tx.quoteId as any)?.id;
          if (quoteId != null) byQuoteId.set(quoteId, tx.orderId);
        });
        return { byQuoteId, byTransactionId };
      }),
      catchError(() => of({ byQuoteId: new Map(), byTransactionId: new Map() }))
    );
  }

  // ============================================
  // INVOICES
  // ============================================

  /** See getQuotes() — same fetch-big-batch, search/date-range/sort/paginate-client-side strategy, for the same reasons. */
  getInvoices(filters: any): Observable<{ data: Invoice[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId).set('page', '1').set('size', '1000');

    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);

    return this.http.get<any>(`${this.base}/invoices`, { params }).pipe(
      map(res => {
        const arr: Invoice[] = Array.isArray(res) ? res : (res?.data ?? []);
        let result = this.sortNewestFirst(arr, 'issueDate');

        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter(inv => inv.status === filters.status);
        }

        const term = String(filters?.searchTerm ?? '').trim().toLowerCase();
        if (term) {
          result = result.filter(inv =>
            (inv.invoiceNumber || '').toLowerCase().includes(term) ||
            this.resolveEntityCustomerName(inv).toLowerCase().includes(term)
          );
        }

        if (filters?.dateFrom || filters?.dateTo) {
          result = result.filter(inv => this.matchesDateRange(inv, 'issueDate', filters.dateFrom, filters.dateTo));
        }

        const page = filters?.page ?? 0;
        const size = filters?.size ?? (result.length || 1);
        const start = page * size;
        return { data: result.slice(start, start + size), total: result.length };
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
    return this.http.post<any>(`${this.base}/invoices`, { ...data, invoiceNumber, tenantId: this.tenantId }).pipe(
      switchMap(res => {
        const id = typeof res === 'object' ? (res.id ?? res) : res;
        return this.getInvoiceById(id).pipe(map(inv => inv as Invoice));
      }),
      tap(invoice => this.trackNewInvoice(invoice))
    );
  }

  private trackNewInvoice(invoice: Invoice): void {
    if (!invoice) return;
    const patch: Partial<SalesandTransactions> = {
      invoiceId: invoice,
      customerId: invoice.customerId,
      customerName: invoice.customerName,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      status: 'INVOICE_SENT',
      invoiceSentDate: new Date(),
      balanceDue: invoice.totalAmount
    };
    const quoteIdValue = (invoice as any).quoteId;
    // If this invoice was generated from a quote, that quote already has a transaction
    // tracking it (see trackNewQuote()) — attach the invoice there and advance its status,
    // instead of spawning a second, duplicate transaction for the same underlying order.
    const upsert$ = quoteIdValue
      ? this.upsertTransactionForQuote(quoteIdValue, patch)
      : this.upsertTransactionForInvoice(invoice.id, patch);
    upsert$.subscribe({
      error: (err) => console.error('Failed to auto-track new invoice in Sales & Transactions:', err)
    });
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

  getCustomers(filters: any): Observable<{
    data: Customer[];
    total: number;
    totalActive?: number;
    totalInactive?: number;
    totalBlacklisted?: number;
  }> {
    // See getQuotes() — fetch a big batch and paginate client-side rather than trusting
    // the backend's own pagination/sort, which caused newly created records to land on
    // a page the UI never visits.
    let params = new HttpParams().set('tenantId', this.tenantId).set('page', '1').set('size', '1000');

    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);

    return this.http.get<any>(`${this.base}/customers`, { params }).pipe(
      map(res => {
        const raw: any[] = Array.isArray(res) ? res : (res?.content ?? res?.data ?? []);
        const arr: Customer[] = raw.map(c => ({
          ...c,
          customerId: String(c.id),
          address: c.address ? [c.address] : [],
          deliverAddress: Array.isArray(c.deliverAddress) ? c.deliverAddress : (c.deliverAddress ? [c.deliverAddress] : [])
        }));
        let result = this.sortNewestFirst(arr, 'createdAt');

        // Client-side fallback for status/search/date-range — see getQuotes() for why: none
        // of these query params are confirmed to be honored server-side, and dateFrom/dateTo
        // were never sent at all.
        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter(c => c.status === filters.status);
        }

        const term = String(filters?.searchTerm ?? '').trim().toLowerCase();
        if (term) {
          result = result.filter(c =>
            (c.name || '').toLowerCase().includes(term) ||
            (c.email || '').toLowerCase().includes(term) ||
            (c.phone || '').toLowerCase().includes(term)
          );
        }

        if (filters?.dateFrom || filters?.dateTo) {
          result = result.filter(c => this.matchesDateRange(c, 'createdAt', filters.dateFrom, filters.dateTo));
        }

        const page = filters?.page ?? 0;
        const size = filters?.size ?? (result.length || 1);
        const start = page * size;
        return {
          data: result.slice(start, start + size),
          total: result.length,
          totalActive: res?.totalActive ?? 0,
          totalInactive: res?.totalInactive ?? 0,
          totalBlacklisted: res?.totalBlacklisted ?? 0
        };
      }),
      catchError(() => of({ data: [], total: 0, totalActive: 0, totalInactive: 0, totalBlacklisted: 0 }))
    );
  }

  getCustomerById(id: string): Observable<Customer | null> {
    return this.http.get<any>(`${this.base}/customers/${id}`).pipe(
      map(c => c ? ({ ...c, customerId: String(c.id), address: c.address ? [c.address] : [], deliverAddress: Array.isArray(c.deliverAddress) ? c.deliverAddress : (c.deliverAddress ? [c.deliverAddress] : []) } as Customer) : null),
      catchError(() => of(null))
    );
  }

  private flattenCustomer(data: Partial<Customer>): any {
    return {
      ...data,
      tenantId: this.tenantId,
      address: Array.isArray(data.address) ? data.address.join(', ') : (data.address ?? ''),
      deliverAddress: Array.isArray(data.deliverAddress) ? data.deliverAddress : []
    };
  }

  createCustomer(data: Partial<Customer>): Observable<Customer> {
    return this.http.post<any>(`${this.base}/customers`, this.flattenCustomer(data)).pipe(
      switchMap(res => {
        const id = typeof res === 'object' ? (res.id ?? res) : res;
        return this.getCustomerById(String(id)).pipe(map(c => c as Customer));
      })
    );
  }

  updateCustomer(id: string, data: Partial<Customer>): Observable<Customer> {
    return this.http.put<Customer>(`${this.base}/customers/${id}`, this.flattenCustomer(data));
  }

  deleteCustomer(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/customers/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  // ============================================
  // MERCHANT INFO — the seller's own company details ("Prepared By" on
  // quotes/invoices: name, address, bank account, logo).
  // ============================================

  getMerchantInfoList(): Observable<MerchantInfo[]> {
    return this.http.get<any>(`${this.base}/merchant-info`).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? [])),
      catchError(() => of([]))
    );
  }

  /** The current tenant's own merchant info, if one has been set up yet. */
  getMyMerchantInfo(): Observable<MerchantInfo | null> {
    return this.http.get<MerchantInfo>(`${this.base}/merchant-info/my`).pipe(
      catchError(() => of(null))
    );
  }

  getMerchantInfoById(id: string | number): Observable<MerchantInfo | null> {
    return this.http.get<MerchantInfo>(`${this.base}/merchant-info/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  createMerchantInfo(data: Partial<MerchantInfo>): Observable<MerchantInfo> {
    return this.http.post<MerchantInfo>(`${this.base}/merchant-info`, { ...data, tenantId: this.tenantId });
  }

  updateMerchantInfo(id: string | number, data: Partial<MerchantInfo>): Observable<MerchantInfo> {
    return this.http.put<MerchantInfo>(`${this.base}/merchant-info/${id}`, { ...data, tenantId: this.tenantId });
  }

  deleteMerchantInfo(id: string | number): Observable<boolean> {
    return this.http.delete<any>(`${this.base}/merchant-info/${id}`).pipe(
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

  /** See getQuotes() — same fetch-big-batch-and-paginate-client-side strategy, for the same reason. */
  getSalesandTransactions(filters: any): Observable<{ data: SalesandTransactions[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId).set('page', '1').set('size', '1000');

    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.customerId) params = params.set('customerId', filters.customerId);
    if (filters?.searchTerm) params = params.set('search', filters.searchTerm);

    return this.http.get<any>(`${this.base}/sales-orders`, { params }).pipe(
      map(res => {
        const arr: SalesandTransactions[] = Array.isArray(res) ? res : (res?.data ?? []);
        let result = this.sortNewestFirst(arr, 'orderDate');

        if (filters?.status && filters.status !== 'ALL') {
          result = result.filter(tx => tx.status === filters.status);
        }
        const term = String(filters?.searchTerm ?? '').trim().toLowerCase();
        if (term) {
          result = result.filter(tx =>
            (tx.orderId || '').toLowerCase().includes(term) ||
            (tx.reference || '').toLowerCase().includes(term) ||
            this.resolveEntityCustomerName(tx).toLowerCase().includes(term)
          );
        }

        // quoteId/invoiceId come back nested (tx.quoteId is the whole Quote object, not a
        // bare id — see the SalesandTransactions DTO), so match against the nested .id.
        if (filters?.quoteId != null) {
          result = result.filter(tx => {
            const qid = tx.quoteId && typeof tx.quoteId === 'object' ? (tx.quoteId as any).id : tx.quoteId;
            return String(qid) === String(filters.quoteId);
          });
        }
        if (filters?.invoiceId != null) {
          result = result.filter(tx => {
            const iid = tx.invoiceId && typeof tx.invoiceId === 'object' ? (tx.invoiceId as any).id : tx.invoiceId;
            return String(iid) === String(filters.invoiceId);
          });
        }

        const page = filters?.page ?? 0;
        const size = filters?.size ?? (result.length || 1);
        const start = page * size;
        return { data: result.slice(start, start + size), total: result.length };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  getSalesandTransactionsById(id: string | number): Observable<SalesandTransactions | null> {
    return this.http.get<SalesandTransactions>(`${this.base}/sales-orders/${id}`).pipe(
      catchError(() => of(null))
    );
  }

  private idOf(v: any): any {
    return v && typeof v === 'object' ? v.id : v;
  }

  /**
   * The sales-order DTO's GET shape nests related records (quote/customer/invoice as full
   * objects) but its write shape wants bare foreign-key ids — sending a nested object for
   * quoteId/customerId/invoiceId 500s with "Cannot deserialize value of type java.lang.Long
   * from Object value". Callers throughout this codebase (quote-detail, invoice-detail, the
   * transactions list, and the auto-tracking above) build these payloads by copying whole
   * Quote/Invoice/Customer objects onto these fields for convenience — flatten them here,
   * once, at the boundary, rather than fixing every call site.
   */
  private flattenTransaction(data: Partial<SalesandTransactions>): any {
    const d: any = { ...data, tenantId: this.tenantId };

    if ('quoteId' in d) d.quoteId = this.idOf(d.quoteId);
    if ('invoiceId' in d) d.invoiceId = this.idOf(d.invoiceId);
    if ('customerId' in d) d.customerId = this.idOf(d.customerId);

    // customerName is a plain string column on this entity, not a nested customer object.
    if (d.customerName && typeof d.customerName === 'object') {
      d.customerName = d.customerName.name || '';
    }

    // "items" here must be actual sales-order line items, never the whole Quote/Invoice
    // object some callers pass in as shorthand for "copy this document's items over".
    if (d.items && !Array.isArray(d.items)) {
      const src = d.items;
      // Was dropping taxRate/amount (both real fields on QuoteItem/InvoiceItem) — order-level
      // totals still came out correct either way (they're copied straight from
      // quote.taxAmount/totalAmount, never recomputed from these line items), but anything that
      // renders per-line-item tax/amount from a transaction's own items lost that data.
      d.items = Array.isArray(src.items) ? src.items.map((it: any) => ({
        productId: it.productId ?? null,
        productName: it.productName || '',
        description: it.description || '',
        quantity: it.quantity || 1,
        unitPrice: it.unitPrice || 0,
        discount: it.discount || 0,
        taxRate: it.taxRate || 0,
        amount: it.amount || 0,
        total: it.total || 0
      })) : undefined;
    }

    // PaymentTerms nests customerId/customerName the same way as the outer object.
    if (d.PaymentTerms && typeof d.PaymentTerms === 'object') {
      d.PaymentTerms = {
        ...d.PaymentTerms,
        customerId: this.idOf(d.PaymentTerms.customerId),
        customerName: d.PaymentTerms.customerName && typeof d.PaymentTerms.customerName === 'object'
          ? (d.PaymentTerms.customerName.name || '')
          : d.PaymentTerms.customerName
      };
    }

    return d;
  }

  createSalesandTransactions(data: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    const d = data as any;
    const orderNumber = d.orderNumber || `SO-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
    return this.http.post<SalesandTransactions>(`${this.base}/sales-orders`, { ...this.flattenTransaction(data), orderNumber });
  }

  updateSalesandTransactions(id: string | number, data: Partial<SalesandTransactions>): Observable<SalesandTransactions> {
    return this.http.put<SalesandTransactions>(`${this.base}/sales-orders/${id}`, this.flattenTransaction(data));
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

  getDeliveryNotes(filters: any): Observable<{ data: DeliveryNote[]; total: number }> {
    let params = new HttpParams().set('tenantId', this.tenantId);

    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.salesOrderId) params = params.set('salesOrderId', filters.salesOrderId);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);

    return this.http.get<any>(`${this.base}/delivery-notes`, { params }).pipe(
      map(res => {
        const arr: DeliveryNote[] = Array.isArray(res) ? res : (res?.data ?? []);
        return { data: arr, total: Array.isArray(res) ? res.length : (res?.totalElements ?? arr.length) };
      }),
      catchError(() => of({ data: [], total: 0 }))
    );
  }

  /** There's no GET /delivery-notes/{id} — the backend only exposes the list endpoint, so a
   *  single record is found by filtering it client-side. */
  getDeliveryNoteById(id: string | number): Observable<DeliveryNote | null> {
    return this.getDeliveryNotes({ size: 1000 }).pipe(
      map(res => res.data.find(n => String(n.id) === String(id)) || null)
    );
  }

  createDeliveryNote(data: Partial<DeliveryNote>): Observable<DeliveryNote> {
    return this.http.post<DeliveryNote>(`${this.base}/delivery-notes`, { ...data, tenantId: this.tenantId });
  }

  /** There's no dedicated full-edit endpoint — PATCH .../status is the only mutation after
   *  create, and its request body carries the whole record (not just `status`), so editing a
   *  still-PENDING note's other fields goes through it too. */
  updateDeliveryNote(id: string | number, data: Partial<DeliveryNote>): Observable<DeliveryNote> {
    return this.http.patch<DeliveryNote>(`${this.base}/delivery-notes/${id}/status`, { ...data, tenantId: this.tenantId });
  }

  updateDeliveryNoteStatus(id: string | number, status: DeliveryNoteStatus): Observable<DeliveryNote> {
    const timestamp: Partial<DeliveryNote> =
      status === 'DISPATCHED' ? { dispatchedAt: new Date().toISOString() } :
      status === 'DELIVERED' ? { deliveredAt: new Date().toISOString() } : {};
    return this.http.patch<DeliveryNote>(`${this.base}/delivery-notes/${id}/status`, { status, ...timestamp, tenantId: this.tenantId });
  }

  /**
   * The Delivery Notes tab's dashboard queue: quotes that have been converted (the customer
   * accepted — see quote-detail's confirmAcceptQuote()) but don't have a delivery note yet.
   * Delivery notes are only ever generated through the quote-driven LPO-upload wizard now, so
   * this replaces the old "orders past the invoice stage" rule — under the current flow, an
   * invoice can't even exist yet at this point (it comes after the delivery note). Cross-
   * references three lists client-side since there's no dedicated backend endpoint for this.
   */
  getConvertedQuotesAwaitingDeliveryNote(): Observable<Quote[]> {
    return forkJoin({
      quotes: this.getQuotes({ status: 'CONVERTED', size: 1000 }),
      noteByQuoteId: this.getQuoteDeliveryNoteMap()
    }).pipe(
      map(({ quotes, noteByQuoteId }) => quotes.data.filter(q => !noteByQuoteId.has(q.id))),
      catchError(() => of([]))
    );
  }

  /** Resolves each quote's delivery note (if one has been generated for it yet) by joining
   *  through its linked SalesandTransactions record — a quote has no direct link to its
   *  DeliveryNote, only an indirect one via quoteId -> transaction.id -> salesOrderId. Used by
   *  the Quotes table/detail to gate the Generate Delivery Note / Create Invoice progression,
   *  and by getConvertedQuotesAwaitingDeliveryNote() for the tab's queue. */
  getQuoteDeliveryNoteMap(): Observable<Map<number, DeliveryNote>> {
    return forkJoin({
      transactions: this.getSalesandTransactions({ size: 1000 }),
      notes: this.getDeliveryNotes({ size: 1000 })
    }).pipe(
      map(({ transactions, notes }) => {
        const noteByTransactionId = new Map<number, DeliveryNote>();
        notes.data.forEach(n => {
          if (n.salesOrderId != null) noteByTransactionId.set(n.salesOrderId, n);
        });
        const noteByQuoteId = new Map<number, DeliveryNote>();
        transactions.data.forEach(tx => {
          const quoteId = (tx.quoteId as any)?.id;
          const note = noteByTransactionId.get(tx.id);
          if (quoteId != null && note) noteByQuoteId.set(quoteId, note);
        });
        return noteByQuoteId;
      }),
      catchError(() => of(new Map<number, DeliveryNote>()))
    );
  }

  /** Same as getOrCreateDeliveryNote(), but resolves the order from a quoteId first — the entry
   *  point for the quote-driven "Generate Delivery Note" wizard. */
  getOrCreateDeliveryNoteForQuote(quoteId: string | number): Observable<DeliveryNote | null> {
    return this.getSalesandTransactions({ quoteId, size: 1000 }).pipe(
      switchMap(res => {
        const tx = res.data?.[0];
        if (!tx) return of(null);
        return this.getOrCreateDeliveryNote(tx.id);
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Delivery Note step (Invoice -> Delivery Tracking -> Delivery Note -> Receipt): assembled the
   * same way getPaymentReceipt() assembles a receipt — from the order + its linked invoice —
   * rather than depending on a full backend delivery-note record existing yet. createDeliveryNote()
   * is still called to persist it the first time (its endpoint already exists), but a failure
   * there doesn't block the note itself: everything it needs to render/print is already derived
   * below, and the backend call is best-effort record-keeping on top of that.
   *
   * The "OrCreate" used to not actually check for an existing one — every open of the modal for
   * the same order POSTed a fresh record. getDeliveryNotes({salesOrderId}) is checked first now,
   * the same find-or-create pattern upsertTransactionForQuote()/ForInvoice() already use, so
   * reopening the same order's delivery note reuses its number instead of duplicating it.
   */
  getOrCreateDeliveryNote(orderId: string | number): Observable<DeliveryNote | null> {
    return forkJoin({
      tx: this.getSalesandTransactionsById(orderId),
      existing: this.getDeliveryNotes({ salesOrderId: orderId })
    }).pipe(
      switchMap(({ tx, existing }) => {
        if (!tx) return of(null);
        const customer = tx.customerId as any;
        const existingNote = existing?.data?.[0];
        const invoice = tx.invoiceId as any;
        // Invoice items are the most reliable source (real per-line quantities); fall back to
        // the quote's own items (same double-nested shape SalesAndTransactionsDetailComponent
        // already unwraps) when no invoice exists yet.
        const sourceItems: any[] = invoice?.items
          || (tx.items && Array.isArray((tx.items as any).items) ? (tx.items as any).items : null)
          || (tx.quoteId && Array.isArray((tx.quoteId as any).items) ? (tx.quoteId as any).items : null)
          || [];
        const items: DeliveryNoteItem[] = existingNote?.items?.length ? existingNote.items : sourceItems.map(it => ({
          productName: it.productName || '',
          quantity: it.quantity || 0,
          unit: it.unit || it.measurementUnit?.name || ''
        }));
        const note: DeliveryNote = {
          id: existingNote?.id,
          deliveryNumber: existingNote?.deliveryNumber || `DN-${String(tx.orderId || tx.paymentNumber || tx.id).replace(/^ORD-|^PAY-/, '')}`,
          status: existingNote?.status || 'PENDING',
          salesOrderId: Number(tx.id),
          customerId: customer?.id,
          customerAddress: existingNote?.customerAddress || tx.shippingAddress || (Array.isArray(customer?.deliverAddress) ? customer.deliverAddress.join(', ') : '') || tx.billingAddress || '',
          carrier: existingNote?.carrier || tx.carrier,
          trackingNumber: existingNote?.trackingNumber || tx.trackingNumber,
          items
        };
        if (existingNote) return of(note);
        return this.createDeliveryNote(note).pipe(
          map(created => ({ ...note, id: (created as any)?.id ?? note.id })),
          catchError(() => of(note))
        );
      }),
      catchError(() => of(null))
    );
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
    return forkJoin({
      tx: this.getSalesandTransactionsById(paymentId),
      // getMerchantInfo() is a blank placeholder (hostname as name, empty address/phone/etc) —
      // getMyMerchantInfo() fetches the real tenant record instead.
      merchant: this.getMyMerchantInfo()
    }).pipe(
      map(({ tx, merchant }) => {
        if (!tx) return null;
        // paymentNumber is never actually set by any client code (confirmed: only ever read,
        // never assigned) — that made this always resolve to the literal string "RCT-" with
        // nothing after it. orderId/id are always populated, so fall back through those instead.
        const receipt: PaymentReceipt = {
          receiptNumber: `RCT-${String(tx.paymentNumber || tx.orderId || tx.id).replace(/^PAY-|^ORD-/, '')}`,
          payment: tx,
          invoice: tx.invoiceId as any,
          customer: tx.customerId,
          merchantInfo: merchant || this.getMerchantInfo(),
          issuedAt: tx.orderDate
        };
        return receipt;
      }),
      catchError(() => of(null))
    );
  }
}
