import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import {
  GoodsReceivedNote, DeliveryTracking, PaymentVoucher, GrnStatus,
  DeliveryStatus, ProcurementNotification
} from '../../domain/procurement-request/procurement.dto';
import { environment } from '../../shared-component/service/environments/environment';

@Injectable({ providedIn: 'root' })
export class SupplyChainService {

  private readonly baseUrl = environment.apiBaseUrl + '/x/api/v2/commerce';

  // In-memory caches for optimistic UI
  private deliveries$$ = new BehaviorSubject<DeliveryTracking[]>([]);
  private grns$$ = new BehaviorSubject<GoodsReceivedNote[]>([]);
  private vouchers$$ = new BehaviorSubject<PaymentVoucher[]>([]);

  readonly deliveries$ = this.deliveries$$.asObservable();
  readonly grns$ = this.grns$$.asObservable();
  readonly vouchers$ = this.vouchers$$.asObservable();

  constructor(private http: HttpClient) {}

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  // ── Delivery Tracking ───────────────────────────────────────────────────────

  getDeliveries(filters?: { lpoId?: string; vendorId?: string; status?: DeliveryStatus; page?: number; size?: number }): Observable<DeliveryTracking[]> {
    let params = new HttpParams().set('page', '1').set('size', '50');
    if (filters?.lpoId) params = params.set('lpoId', filters.lpoId);
    if (filters?.vendorId) params = params.set('vendorId', filters.vendorId);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<any>(`${this.baseUrl}/deliveries`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? [])),
      tap(list => this.deliveries$$.next(list)),
      catchError(err => { console.error('[SupplyChainService] getDeliveries failed:', err); return this.deliveries$; })
    );
  }

  getDeliveryByLpo(lpoId: string): Observable<DeliveryTracking | null> {
    return this.http.get<DeliveryTracking>(`${this.baseUrl}/deliveries/lpo/${lpoId}`).pipe(
      catchError(() => of(null))
    );
  }

  createDelivery(delivery: Partial<DeliveryTracking>): Observable<DeliveryTracking> {
    return this.http.post<DeliveryTracking>(`${this.baseUrl}/deliveries`, { ...delivery, tenantId: this.tenantId }).pipe(
      tap(saved => this.deliveries$$.next([saved, ...this.deliveries$$.getValue()])),
      catchError(err => { console.error('[SupplyChainService] createDelivery failed:', err); throw err; })
    );
  }

  updateDeliveryStatus(deliveryId: string, status: DeliveryStatus, description: string, location?: string): Observable<DeliveryTracking> {
    return this.http.patch<DeliveryTracking>(`${this.baseUrl}/deliveries/${deliveryId}/status`, { status, description, location }).pipe(
      tap(updated => {
        const current = this.deliveries$$.getValue();
        this.deliveries$$.next(current.map(d => d.id === deliveryId ? updated : d));
      }),
      catchError(err => { console.error('[SupplyChainService] updateDeliveryStatus failed:', err); throw err; })
    );
  }

  // ── GRN ────────────────────────────────────────────────────────────────────

  getGrns(filters?: { lpoId?: string; status?: GrnStatus; page?: number }): Observable<GoodsReceivedNote[]> {
    let params = new HttpParams().set('page', '1').set('size', '50');
    if (filters?.lpoId) params = params.set('lpoId', filters.lpoId);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<any>(`${this.baseUrl}/grns`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? [])),
      tap(list => this.grns$$.next(list)),
      catchError(err => { console.error('[SupplyChainService] getGrns failed:', err); return this.grns$; })
    );
  }

  getGrnByLpo(lpoId: string): Observable<GoodsReceivedNote | null> {
    return this.http.get<GoodsReceivedNote>(`${this.baseUrl}/grns/lpo/${lpoId}`).pipe(
      catchError(() => of(null))
    );
  }

  createGrn(grn: Partial<GoodsReceivedNote>): Observable<GoodsReceivedNote> {
    return this.http.post<GoodsReceivedNote>(`${this.baseUrl}/grns`, { ...grn, tenantId: this.tenantId }).pipe(
      tap(saved => this.grns$$.next([saved, ...this.grns$$.getValue()])),
      catchError(err => { console.error('[SupplyChainService] createGrn failed:', err); throw err; })
    );
  }

  updateGrn(grnId: string, grn: Partial<GoodsReceivedNote>): Observable<GoodsReceivedNote> {
    return this.http.put<GoodsReceivedNote>(`${this.baseUrl}/grns/${grnId}`, grn).pipe(
      tap(updated => {
        const current = this.grns$$.getValue();
        this.grns$$.next(current.map(g => g.id === grnId ? updated : g));
      }),
      catchError(err => { console.error('[SupplyChainService] updateGrn failed:', err); throw err; })
    );
  }

  submitGrn(grnId: string): Observable<GoodsReceivedNote> {
    return this.http.patch<GoodsReceivedNote>(`${this.baseUrl}/grns/${grnId}/submit`, {}).pipe(
      tap(updated => {
        const current = this.grns$$.getValue();
        this.grns$$.next(current.map(g => g.id === grnId ? updated : g));
      }),
      catchError(err => { console.error('[SupplyChainService] submitGrn failed:', err); throw err; })
    );
  }

  approveGrn(grnId: string, approvedBy: string): Observable<GoodsReceivedNote> {
    return this.http.patch<GoodsReceivedNote>(`${this.baseUrl}/grns/${grnId}/approve`, { approvedBy }).pipe(
      catchError(err => { console.error('[SupplyChainService] approveGrn failed:', err); throw err; })
    );
  }

  // ── Payment Voucher ─────────────────────────────────────────────────────────

  createPaymentVoucher(voucher: Partial<PaymentVoucher>): Observable<PaymentVoucher> {
    return this.http.post<PaymentVoucher>(`${this.baseUrl}/payment-vouchers`, { ...voucher, tenantId: this.tenantId }).pipe(
      tap(saved => this.vouchers$$.next([saved, ...this.vouchers$$.getValue()])),
      catchError(err => { console.error('[SupplyChainService] createPaymentVoucher failed:', err); throw err; })
    );
  }

  getPaymentVouchers(filters?: { lpoId?: string; invoiceId?: string; page?: number }): Observable<PaymentVoucher[]> {
    let params = new HttpParams().set('page', '1').set('size', '50');
    if (filters?.lpoId) params = params.set('lpoId', filters.lpoId);
    if (filters?.invoiceId) params = params.set('invoiceId', filters.invoiceId);
    return this.http.get<any>(`${this.baseUrl}/payment-vouchers`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? [])),
      tap(list => this.vouchers$$.next(list)),
      catchError(() => of([]))
    );
  }

  // ── Notification helpers (status-only, not content generation) ──────────────

  getNotifications(entityId: string, entityType: string): Observable<ProcurementNotification[]> {
    const params = new HttpParams().set('entityId', entityId).set('entityType', entityType);
    return this.http.get<any>(`${this.baseUrl}/notifications`, { params }).pipe(
      map(res => Array.isArray(res) ? res : (res?.data ?? [])),
      catchError(() => of([]))
    );
  }

  retryNotification(notificationId: string): Observable<ProcurementNotification> {
    return this.http.patch<ProcurementNotification>(`${this.baseUrl}/notifications/${notificationId}/retry`, {}).pipe(
      catchError(err => { console.error('[SupplyChainService] retryNotification failed:', err); throw err; })
    );
  }
}
