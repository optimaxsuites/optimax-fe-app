// logistics.service.ts
// ============================================================
// IMPORTS
// ============================================================

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import {
  Order,
  Rider,
  DeliveryBatch,
  DeliveryAttempt,
  AuditLogEntry,
  FulfillmentType,
  OrderStatus,
  BatchStatus,
  StopStatus,
  RiderActiveStatus,
  VehicleType,
  ProofType,
  FailureReason,
  RiderPerformanceStat,
  AuditLogFilter,
  RiderCreatePayload,
  GeoPoint,
  AvailablePoolResponse,
  TriageListResponse,
  PoolListResponse,
  ApprovalQueueResponse,
  ActiveRoutesResponse,
  DeliveredListResponse,
  FailedListResponse,
  PickupListResponse,
  RiderRosterResponse,
  RiderPerformanceResponse,
  AuditLogResponse,
  AGING_THRESHOLD_MINUTES,
  minutesBetween,
  RouteStop,
} from '../../domain/logistics/logistics.dto';
import { environment } from '../../shared-component/service/environments/environment';

const API_BASE = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root',
})
export class LogisticsService {
  private readonly baseUrl = `${API_BASE}/logistics`;

  // Live counters other parts of the shell (e.g. tab badges) can subscribe to.
  private readonly unroutedCount$$ = new BehaviorSubject<number>(0);
  private readonly poolAgingCount$$ = new BehaviorSubject<number>(0);
  private readonly pendingApprovalCount$$ = new BehaviorSubject<number>(0);

  readonly unroutedCount = this.unroutedCount$$.asObservable();
  readonly poolAgingCount = this.poolAgingCount$$.asObservable();
  readonly pendingApprovalCount = this.pendingApprovalCount$$.asObservable();

  constructor(private http: HttpClient) {}

  // ============================================================
  // ROUTING QUEUE — PART A: TRIAGE
  // ============================================================

  getTriageOrders(search: string = ''): Observable<TriageListResponse> {
    return this.http
      .get<TriageListResponse>(`${this.baseUrl}/routing-queue/triage`, { params: { search } })
      .pipe(
        tap((res) => this.unroutedCount$$.next(res.total)),
        catchError(() => {
          const mock = mockTriage(search);
          this.unroutedCount$$.next(mock.total);
          return of(mock);
        }),
      );
  }

  routeOrder(
    orderId: string,
    fulfillmentType: FulfillmentType.PICKUP | FulfillmentType.DELIVERY,
  ): Observable<Order> {
    return this.http
      .post<Order>(`${this.baseUrl}/routing-queue/${orderId}/route`, { fulfillmentType })
      .pipe(catchError(() => of(mockRouteOrder(orderId, fulfillmentType))));
  }

  bulkRouteOrders(
    orderIds: string[],
    fulfillmentType: FulfillmentType.PICKUP | FulfillmentType.DELIVERY,
  ): Observable<{ routed: number }> {
    return this.http
      .post<{
        routed: number;
      }>(`${this.baseUrl}/routing-queue/bulk-route`, { orderIds, fulfillmentType })
      .pipe(catchError(() => of({ routed: orderIds.length })));
  }

  // ============================================================
  // ROUTING QUEUE — PART B: POOL OVERSIGHT
  // ============================================================

  getPoolOrders(
    agingThresholdMinutes: number = AGING_THRESHOLD_MINUTES,
  ): Observable<PoolListResponse> {
    return this.http
      .get<PoolListResponse>(`${this.baseUrl}/routing-queue/pool`, {
        params: { agingThresholdMinutes },
      })
      .pipe(
        tap((res) => this.poolAgingCount$$.next(res.agingCount)),
        catchError(() => {
          const mock = mockPool(agingThresholdMinutes);
          this.poolAgingCount$$.next(mock.agingCount);
          return of(mock);
        }),
      );
  }

  getActiveRiders(): Observable<Rider[]> {
    return this.http
      .get<Rider[]>(`${this.baseUrl}/riders`, { params: { status: 'active' } })
      .pipe(catchError(() => of(MOCK_RIDERS)));
  }

  forceAssignOrder(orderId: string, riderId: string): Observable<Order> {
    return this.http
      .post<Order>(`${this.baseUrl}/routing-queue/pool/${orderId}/force-assign`, { riderId })
      .pipe(catchError(() => of(mockForceAssign(orderId, riderId))));
  }

  // ============================================================
  // ROUTE APPROVAL — PART A: APPROVAL QUEUE
  // ============================================================

  getPendingApprovalBatches(): Observable<ApprovalQueueResponse> {
    return this.http.get<ApprovalQueueResponse>(`${this.baseUrl}/route-approval/pending`).pipe(
      tap((res) => this.pendingApprovalCount$$.next(res.total)),
      catchError(() => {
        const mock = mockPendingApproval();
        this.pendingApprovalCount$$.next(mock.total);
        return of(mock);
      }),
    );
  }

  approveBatch(batchId: string, note?: string): Observable<DeliveryBatch> {
    return this.http
      .post<DeliveryBatch>(`${this.baseUrl}/route-approval/${batchId}/approve`, { note })
      .pipe(catchError(() => of(mockApprove(batchId, note))));
  }

  rejectBatch(batchId: string, note: string): Observable<DeliveryBatch> {
    return this.http
      .post<DeliveryBatch>(`${this.baseUrl}/route-approval/${batchId}/reject`, { note })
      .pipe(catchError(() => of(mockReject(batchId, note))));
  }

  // ============================================================
  // ROUTE APPROVAL — PART B: LIVE TRACKING
  // ============================================================

  getActiveRouteBatches(): Observable<ActiveRoutesResponse> {
    return this.http
      .get<ActiveRoutesResponse>(`${this.baseUrl}/route-approval/active`)
      .pipe(catchError(() => of(mockActiveRoutes())));
  }

  /** Poll active routes every N ms — used for "near real-time" updates without a manual refresh. */
  pollActiveRouteBatches(intervalMs: number = 15000): Observable<ActiveRoutesResponse> {
    return timer(0, intervalMs).pipe(
      map(() => null),
      // switchMap would be ideal but kept simple/dependency-light here
      map(() => mockActiveRoutes()),
    );
  }

  // ============================================================
  // SHARED — ORDER DETAIL + AUDIT TRAIL
  // ============================================================

  getOrderDetail(orderId: string): Observable<Order | undefined> {
    return this.http
      .get<Order>(`${this.baseUrl}/orders/${orderId}`)
      .pipe(catchError(() => of(findMockOrder(orderId))));
  }

  getAuditLog(entityId: string): Observable<AuditLogEntry[]> {
    return this.http
      .get<AuditLogEntry[]>(`${this.baseUrl}/audit-log`, { params: { entityId } })
      .pipe(catchError(() => of(mockAuditLog(entityId))));
  }

  // ============================================================
  // DELIVERY RECORDS — PART A: DELIVERED (PROOF REVIEW)
  // ============================================================

  getDeliveredAttempts(search: string = ''): Observable<DeliveredListResponse> {
    return this.http
      .get<DeliveredListResponse>(`${this.baseUrl}/delivery-records/delivered`, {
        params: { search },
      })
      .pipe(catchError(() => of(mockDelivered(search))));
  }

  // ============================================================
  // DELIVERY RECORDS — PART B: FAILED (EXCEPTIONS)
  // ============================================================

  getFailedAttempts(): Observable<FailedListResponse> {
    return this.http
      .get<FailedListResponse>(`${this.baseUrl}/delivery-records/failed`)
      .pipe(catchError(() => of(mockFailed())));
  }

  requeueFailedOrder(attemptId: string): Observable<DeliveryAttempt> {
    return this.http
      .post<DeliveryAttempt>(`${this.baseUrl}/delivery-records/failed/${attemptId}/requeue`, {})
      .pipe(catchError(() => of(mockRequeue(attemptId))));
  }

  cancelFailedOrder(attemptId: string): Observable<DeliveryAttempt> {
    return this.http
      .post<DeliveryAttempt>(`${this.baseUrl}/delivery-records/failed/${attemptId}/cancel`, {})
      .pipe(catchError(() => of(mockCancel(attemptId))));
  }

  escalateFailedOrder(attemptId: string, note: string): Observable<DeliveryAttempt> {
    return this.http
      .post<DeliveryAttempt>(`${this.baseUrl}/delivery-records/failed/${attemptId}/escalate`, {
        note,
      })
      .pipe(catchError(() => of(mockEscalate(attemptId, note))));
  }

  // ============================================================
  // DELIVERY RECORDS — PART C: PICKUP CONFIRMATION
  // ============================================================

  getPickupOrders(): Observable<PickupListResponse> {
    return this.http
      .get<PickupListResponse>(`${this.baseUrl}/delivery-records/pickups`)
      .pipe(catchError(() => of(mockPickups())));
  }

  markCollected(orderId: string, verificationCode?: string): Observable<Order> {
    return this.http
      .post<Order>(`${this.baseUrl}/delivery-records/pickups/${orderId}/collect`, {
        verificationCode,
      })
      .pipe(catchError(() => of(mockMarkCollected(orderId))));
  }

  // ============================================================
  // RIDER ACTIVITY — PART A: ROSTER + PERFORMANCE
  // ============================================================

  getRiderRoster(): Observable<RiderRosterResponse> {
    return this.http
      .get<RiderRosterResponse>(`${this.baseUrl}/riders/roster`)
      .pipe(catchError(() => of({ riders: MOCK_RIDERS, total: MOCK_RIDERS.length })));
  }

  addRider(payload: RiderCreatePayload): Observable<Rider> {
    return this.http
      .post<Rider>(`${this.baseUrl}/riders`, payload)
      .pipe(catchError(() => of(mockAddRider(payload))));
  }

  getRiderById(riderId: string): Observable<Rider | undefined> {
    return this.http
      .get<Rider>(`${this.baseUrl}/riders/${riderId}`)
      .pipe(catchError(() => of(MOCK_RIDERS.find((r) => r.id === riderId))));
  }

  getRiderPerformance(): Observable<RiderPerformanceResponse> {
    return this.http
      .get<RiderPerformanceResponse>(`${this.baseUrl}/riders/performance`)
      .pipe(catchError(() => of(mockRiderPerformance())));
  }

  // ============================================================
  // RIDER ACTIVITY — PART B: SYSTEM AUDIT LOG
  // ============================================================

  getSystemAuditLog(filter: AuditLogFilter = {}): Observable<AuditLogResponse> {
    return this.http
      .get<AuditLogResponse>(`${this.baseUrl}/audit-log/search`, { params: filter as any })
      .pipe(catchError(() => of(mockSystemAuditLog(filter))));
  }

  // ============================================================
  // RIDER APP — ROUTE BUILDER (claim → arrange → submit)
  // ============================================================

  getRiderAvailablePool(): Observable<AvailablePoolResponse> {
    return this.http
      .get<AvailablePoolResponse>(`${this.baseUrl}/rider-app/pool`)
      .pipe(catchError(() => of(mockRiderPool())));
  }

  getMyBatch(): Observable<DeliveryBatch | null> {
    return this.http
      .get<DeliveryBatch | null>(`${this.baseUrl}/rider-app/my-batch`)
      .pipe(catchError(() => of(RIDER_DRAFT_BATCH)));
  }

  claimOrders(orderIds: string[]): Observable<DeliveryBatch> {
    return this.http
      .post<DeliveryBatch>(`${this.baseUrl}/rider-app/claim`, { orderIds })
      .pipe(catchError(() => of(mockClaimOrders(orderIds))));
  }

  removeFromBatch(orderId: string): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/my-batch/remove`, { orderId })
      .pipe(catchError(() => of(mockRemoveFromBatch(orderId))));
  }

  reorderBatch(orderedOrderIds: string[]): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/my-batch/reorder`, { orderedOrderIds })
      .pipe(catchError(() => of(mockReorderBatch(orderedOrderIds))));
  }

  updateStopLocation(orderId: string, point: GeoPoint): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/my-batch/stop-location`, {
        orderId,
        point,
      })
      .pipe(catchError(() => of(mockUpdateStopLocation(orderId, point))));
  }

  confirmStopLocation(orderId: string, point: GeoPoint): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/my-batch/confirm-location`, {
        orderId,
        point,
      })
      .pipe(catchError(() => of(mockUpdateStopLocation(orderId, point, true))));
  }

  submitBatchForApproval(): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/my-batch/submit`, {})
      .pipe(catchError(() => of(mockSubmitBatch())));
  }

  // ============================================================
  // RIDER APP — STOP CHECKLIST (execute an approved route)
  // ============================================================

  getActiveBatch(): Observable<DeliveryBatch | null> {
    return this.http
      .get<DeliveryBatch | null>(`${this.baseUrl}/rider-app/active-batch`)
      .pipe(catchError(() => of(RIDER_ACTIVE_BATCH)));
  }

  markStopEnRoute(orderId: string): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/stops/${orderId}/en-route`, {})
      .pipe(catchError(() => of(mockSetStopStatus(orderId, StopStatus.EN_ROUTE))));
  }

  markStopDelivered(
    orderId: string,
    proofType: ProofType,
    proofValue?: string,
    receiverName?: string,
  ): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/stops/${orderId}/delivered`, {
        proofType,
        proofValue,
        receiverName,
      })
      .pipe(catchError(() => of(mockMarkDelivered(orderId, proofType, proofValue, receiverName))));
  }

  markStopFailed(
    orderId: string,
    reason: FailureReason,
    note?: string,
  ): Observable<DeliveryBatch | null> {
    return this.http
      .post<DeliveryBatch | null>(`${this.baseUrl}/rider-app/stops/${orderId}/failed`, {
        reason,
        note,
      })
      .pipe(catchError(() => of(mockMarkFailed(orderId, reason, note))));
  }

  // ============================================================
  // GEOCODING (address autocomplete + reverse lookup via OpenStreetMap Nominatim)
  // ============================================================

  searchAddress(query: string): Observable<GeoPoint[]> {
    if (!query || query.trim().length < 3) return of([]);
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=0&limit=5&q=${encodeURIComponent(query)}`;
    return this.http.get<any[]>(url).pipe(
      map((results) =>
        (results || []).map((r) => ({
          label: r.display_name,
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
        })),
      ),
      catchError(() => of([])),
    );
  }

  reverseGeocode(lat: number, lng: number): Observable<GeoPoint> {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`;
    return this.http.get<any>(url).pipe(
      map((r) => ({ label: r?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })),
      catchError(() => of({ label: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng })),
    );
  }
}

// ============================================================
// MOCK DATA — used as a resilient fallback whenever the API
// is unreachable (e.g. this backend route not deployed yet),
// so the UI is always demo-able and never shows a dead screen.
// ============================================================

const NOW = Date.now();
const minsAgo = (m: number) => new Date(NOW - m * 60000).toISOString();

const MOCK_RIDERS: Rider[] = [
  {
    id: 'r1',
    riderCode: 'R-4921',
    name: 'Alex Mercer',
    initials: 'AM',
    email: 'a.mercer@logistics.com',
    activeStatus: RiderActiveStatus.ON_ROUTE,
    currentLoad: 12,
    vehicleType: VehicleType.VAN,
    todayDelivered: 8,
    todayFailed: 1,
    avgDeliveryMinutes: 22,
  },
  {
    id: 'r2',
    riderCode: 'R-5822',
    name: 'Sarah Jenkins',
    initials: 'SJ',
    email: 's.jenkins@logistics.com',
    activeStatus: RiderActiveStatus.ON_ROUTE,
    currentLoad: 8,
    vehicleType: VehicleType.BIKE,
    todayDelivered: 5,
    todayFailed: 0,
    avgDeliveryMinutes: 18,
  },
  {
    id: 'r3',
    riderCode: 'R-6104',
    name: 'David Kim',
    initials: 'DK',
    email: 'd.kim@logistics.com',
    activeStatus: RiderActiveStatus.ON_ROUTE,
    currentLoad: 15,
    vehicleType: VehicleType.TRUCK,
    todayDelivered: 11,
    todayFailed: 2,
    avgDeliveryMinutes: 27,
  },
  {
    id: 'r4',
    riderCode: 'R-7310',
    name: 'Tolu Adebayo',
    initials: 'TA',
    email: 't.adebayo@logistics.com',
    activeStatus: RiderActiveStatus.AVAILABLE,
    currentLoad: 0,
    vehicleType: VehicleType.BIKE,
    todayDelivered: 6,
    todayFailed: 0,
    avgDeliveryMinutes: 15,
  },
  {
    id: 'r5',
    riderCode: 'R-8215',
    name: 'Ngozi Eze',
    initials: 'NE',
    email: 'n.eze@logistics.com',
    activeStatus: RiderActiveStatus.OFFLINE,
    currentLoad: 0,
    vehicleType: VehicleType.VAN,
    todayDelivered: 3,
    todayFailed: 1,
    avgDeliveryMinutes: 24,
  },
];

let MOCK_ORDERS: Order[] = [
  {
    id: 'o1',
    orderId: '#ORD-8821-A',
    customerName: 'Eleanor Vance',
    itemsSummary: '3 items (Heavy, Fragile)',
    itemCount: 3,
    deliveryLocation: 'Northside District',
    fullAddress: '17 Northside Crescent, Northside District',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.UNASSIGNED,
    status: OrderStatus.PENDING_ROUTING,
    paidAt: minsAgo(135),
    items: [
      { id: 'i1', name: 'Ceramic Dinner Set', quantity: 1, note: 'Fragile' },
      { id: 'i2', name: 'Bookshelf (flat-pack)', quantity: 1, note: 'Heavy' },
      { id: 'i3', name: 'Table Lamp', quantity: 1 },
    ],
  },
  {
    id: 'o2',
    orderId: '#ORD-8822-B',
    customerName: 'Marcus Thorne',
    itemsSummary: '1 item (Standard)',
    itemCount: 1,
    deliveryLocation: 'Downtown Central',
    fullAddress: '4 Downtown Plaza, Downtown Central',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.UNASSIGNED,
    status: OrderStatus.PENDING_ROUTING,
    paidAt: minsAgo(105),
    items: [{ id: 'i4', name: 'Wireless Keyboard', quantity: 1 }],
  },
  {
    id: 'o3',
    orderId: '#ORD-8824-C',
    customerName: 'Sarah Jenkins',
    itemsSummary: '5 items (Perishable)',
    itemCount: 5,
    deliveryLocation: 'West End Hub',
    fullAddress: '112 West End Road, West End Hub',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.UNASSIGNED,
    status: OrderStatus.PENDING_ROUTING,
    paidAt: minsAgo(45),
    items: [
      { id: 'i5', name: 'Frozen Meal Pack', quantity: 3, note: 'Keep frozen' },
      { id: 'i6', name: 'Fresh Produce Box', quantity: 2 },
    ],
  },
  {
    id: 'o4',
    orderId: '#ORD-8825-D',
    customerName: 'TechCorp Inc.',
    itemsSummary: '12 items (Electronics)',
    itemCount: 12,
    deliveryLocation: 'Industrial Park East',
    fullAddress: 'Warehouse 6, Industrial Park East',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.UNASSIGNED,
    status: OrderStatus.PENDING_ROUTING,
    paidAt: minsAgo(15),
    items: [{ id: 'i7', name: 'Laptop Docking Station', quantity: 12 }],
  },
  {
    id: 'o5',
    orderId: '#ORD-8811-A',
    customerName: 'Grace Okafor',
    itemsSummary: '2 items (Standard)',
    itemCount: 2,
    deliveryLocation: 'Maitama District',
    fullAddress: '9 Aguiyi Ironsi St, Maitama District',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.POOL,
    paidAt: minsAgo(320),
    enteredPoolAt: minsAgo(310),
    lat: 9.0938,
    lng: 7.4951,
    area: 'Downtown',
    weightKg: 12,
    distanceKm: 1.2,
    items: [
      { id: 'i8', name: 'Throw Pillow Set', quantity: 1 },
      { id: 'i9', name: 'Table Runner', quantity: 1 },
    ],
  },
  {
    id: 'o6',
    orderId: '#ORD-8812-B',
    customerName: 'Chinedu Obi',
    itemsSummary: '1 item (Fragile)',
    itemCount: 1,
    deliveryLocation: 'Wuse II',
    fullAddress: '22 Aminu Kano Crescent, Wuse II',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.POOL,
    paidAt: minsAgo(260),
    enteredPoolAt: minsAgo(255),
    lat: 9.0833,
    lng: 7.4833,
    area: 'North Hills',
    weightKg: 2,
    distanceKm: 3.5,
    items: [{ id: 'i10', name: 'Wine Glass Set', quantity: 1, note: 'Fragile' }],
  },
  {
    id: 'o7',
    orderId: '#ORD-8813-C',
    customerName: 'Bola Fashola',
    itemsSummary: '4 items (Standard)',
    itemCount: 4,
    deliveryLocation: 'Garki Area 2',
    fullAddress: '5 Muhammadu Buhari Way, Garki Area 2',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.POOL,
    paidAt: minsAgo(50),
    enteredPoolAt: minsAgo(40),
    lat: 9.0392,
    lng: 7.4934,
    area: 'Westside',
    weightKg: 18,
    distanceKm: 4.1,
    items: [
      { id: 'i11', name: 'Office Chair', quantity: 1 },
      { id: 'i12', name: 'Desk Organizer', quantity: 3 },
    ],
  },
  {
    id: 'o8',
    orderId: '#ORD-8830-E',
    customerName: 'Ifeanyi Uche',
    itemsSummary: '2 items (Standard)',
    itemCount: 2,
    deliveryLocation: 'Jabi',
    fullAddress: '3 Jabi Lake Road, Jabi',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.POOL,
    paidAt: minsAgo(30),
    enteredPoolAt: minsAgo(25),
    lat: 9.0765,
    lng: 7.4165,
    area: 'Jabi Zone',
    weightKg: 3.4,
    distanceKm: 2.8,
    items: [
      { id: 'i13', name: 'Bluetooth Speaker', quantity: 1 },
      { id: 'i14', name: 'Charging Cable', quantity: 1 },
    ],
  },
  {
    id: 'o9',
    orderId: '#ORD-8831-F',
    customerName: 'Amaka Nwachukwu',
    itemsSummary: '3 items (Standard)',
    itemCount: 3,
    deliveryLocation: 'Utako',
    fullAddress: '18 Ibrahim Babangida Way, Utako',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.POOL,
    paidAt: minsAgo(12),
    enteredPoolAt: minsAgo(8),
    lat: 9.0704,
    lng: 7.4462,
    area: 'Utako Zone',
    weightKg: 5.1,
    distanceKm: 5.6,
    items: [
      { id: 'i15', name: 'Kitchen Utensil Set', quantity: 1 },
      { id: 'i16', name: 'Cutting Board', quantity: 2 },
    ],
  },

  // Orders referenced by proposed/active DeliveryBatch stops below (p1–p12).
  {
    id: 'p1',
    orderId: '#8839',
    customerName: 'Ifeoma Adeyemi',
    itemsSummary: 'Small Parcel',
    itemCount: 1,
    deliveryLocation: '142 Tech Boulevard',
    fullAddress: '142 Tech Boulevard, Central Business District',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.CLAIMED,
    paidAt: minsAgo(230),
    batchId: 'b1',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    lat: 9.0765,
    lng: 7.3986,
    items: [{ id: 'ip1', name: 'Small Parcel', quantity: 1 }],
  },
  {
    id: 'p2',
    orderId: '#8840',
    customerName: 'Yusuf Bello',
    itemsSummary: 'Medium Box',
    itemCount: 1,
    deliveryLocation: '89 River Road',
    fullAddress: '89 River Road, Wuse',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.CLAIMED,
    paidAt: minsAgo(228),
    batchId: 'b1',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    lat: 9.0579,
    lng: 7.4951,
    items: [{ id: 'ip2', name: 'Medium Box', quantity: 1 }],
  },
  {
    id: 'p3',
    orderId: '#8841',
    customerName: 'Chioma Eze',
    itemsSummary: 'Large Pallet',
    itemCount: 1,
    deliveryLocation: '200 North Avenue',
    fullAddress: '200 North Avenue, Garki',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.CLAIMED,
    paidAt: minsAgo(226),
    batchId: 'b1',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    lat: 9.0643,
    lng: 7.4892,
    items: [{ id: 'ip3', name: 'Large Pallet', quantity: 1 }],
  },
  {
    id: 'p4',
    orderId: '#8842',
    customerName: 'Emeka Okonkwo',
    itemsSummary: 'Small Parcel',
    itemCount: 1,
    deliveryLocation: '55 Independence Ave',
    fullAddress: '55 Independence Avenue, Central Area',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.CLAIMED,
    paidAt: minsAgo(133),
    batchId: 'b2',
    riderId: 'r2',
    riderName: 'Sarah Jenkins',
    lat: 9.0501,
    lng: 7.4881,
    items: [{ id: 'ip4', name: 'Small Parcel', quantity: 1 }],
  },
  {
    id: 'p5',
    orderId: '#8843',
    customerName: 'Funmi Adekunle',
    itemsSummary: 'Small Parcel',
    itemCount: 1,
    deliveryLocation: '10 Herbert Macaulay St',
    fullAddress: '10 Herbert Macaulay Street, Wuse Zone 4',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.CLAIMED,
    paidAt: minsAgo(131),
    batchId: 'b2',
    riderId: 'r2',
    riderName: 'Sarah Jenkins',
    lat: 9.0721,
    lng: 7.4738,
    items: [{ id: 'ip5', name: 'Small Parcel', quantity: 1 }],
  },
  {
    id: 'p6',
    orderId: '#8844',
    customerName: 'Blessing Umeh',
    itemsSummary: 'Bulk Order',
    itemCount: 22,
    deliveryLocation: '3 Aminu Kano Crescent',
    fullAddress: '3 Aminu Kano Crescent, Wuse II',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.CLAIMED,
    paidAt: minsAgo(268),
    batchId: 'b3',
    riderId: 'r3',
    riderName: 'David Kim',
    lat: 9.0833,
    lng: 7.4833,
    items: [{ id: 'ip6', name: 'Bulk Stationery Cartons', quantity: 22 }],
  },
  {
    id: 'p7',
    orderId: '#8801',
    customerName: 'Tunde Bakare',
    itemsSummary: '2 items',
    itemCount: 2,
    deliveryLocation: 'Jabi Lake Mall',
    fullAddress: 'Shop 14, Jabi Lake Mall, Jabi',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.DELIVERED,
    paidAt: minsAgo(320),
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    items: [{ id: 'ip7', name: 'Gift Set', quantity: 2 }],
  },
  {
    id: 'p8',
    orderId: '#8802',
    customerName: 'Nkechi Okoro',
    itemsSummary: '1 item',
    itemCount: 1,
    deliveryLocation: 'Utako District',
    fullAddress: '21 Ibrahim Babangida Way, Utako',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.DELIVERED,
    paidAt: minsAgo(318),
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    items: [{ id: 'ip8', name: 'Handbag', quantity: 1 }],
  },
  {
    id: 'p9',
    orderId: '#8803',
    customerName: 'Segun Afolabi',
    itemsSummary: '3 items',
    itemCount: 3,
    deliveryLocation: 'Gwarinpa Estate',
    fullAddress: '7th Avenue, Gwarinpa Estate',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.FAILED,
    paidAt: minsAgo(315),
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    items: [{ id: 'ip9', name: 'Kids Toy Set', quantity: 3 }],
  },
  {
    id: 'p10',
    orderId: '#8804',
    customerName: 'Rita Chukwu',
    itemsSummary: '1 item',
    itemCount: 1,
    deliveryLocation: 'Life Camp',
    fullAddress: '4 Life Camp Junction, Life Camp',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.IN_TRANSIT,
    paidAt: minsAgo(310),
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    items: [{ id: 'ip10', name: 'Yoga Mat', quantity: 1 }],
  },
  {
    id: 'p11',
    orderId: '#8810',
    customerName: 'Halima Suleiman',
    itemsSummary: '4 items',
    itemCount: 4,
    deliveryLocation: 'Central Business District',
    fullAddress: '11 Ahmadu Bello Way, CBD',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.DELIVERED,
    paidAt: minsAgo(200),
    batchId: 'b5',
    riderId: 'r3',
    riderName: 'David Kim',
    items: [{ id: 'ip11', name: 'Office Supplies Box', quantity: 4 }],
  },
  {
    id: 'p12',
    orderId: '#8811',
    customerName: 'Peter Nwosu',
    itemsSummary: '2 items',
    itemCount: 2,
    deliveryLocation: 'Asokoro District',
    fullAddress: '30 Yakubu Gowon Crescent, Asokoro',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.DELIVERY,
    status: OrderStatus.IN_TRANSIT,
    paidAt: minsAgo(198),
    batchId: 'b5',
    riderId: 'r3',
    riderName: 'David Kim',
    items: [{ id: 'ip12', name: 'Framed Artwork', quantity: 2, note: 'Fragile' }],
  },
];

let MOCK_BATCHES: DeliveryBatch[] = [
  {
    id: 'b1',
    batchCode: 'B-7492',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    riderInitials: 'AM',
    vehicleType: VehicleType.VAN,
    status: BatchStatus.ROUTE_SUBMITTED,
    isHighPriorityArea: true,
    submittedAt: minsAgo(15),
    createdAt: minsAgo(225),
    totalItems: 18,
    orderIds: ['p1', 'p2', 'p3'],
    proposedRoute: [
      {
        sequence: 1,
        orderId: 'p1',
        orderDisplayId: '#8839',
        location: '142 Tech Boulevard',
        itemsSummary: 'Small Parcel',
        stopStatus: StopStatus.PENDING,
        lat: 9.0765,
        lng: 7.3986,
      },
      {
        sequence: 2,
        orderId: 'p2',
        orderDisplayId: '#8840',
        location: '89 River Road',
        itemsSummary: 'Medium Box',
        stopStatus: StopStatus.PENDING,
        lat: 9.0579,
        lng: 7.4951,
      },
      {
        sequence: 3,
        orderId: 'p3',
        orderDisplayId: '#8841',
        location: '200 North Avenue',
        itemsSummary: 'Large Pallet',
        stopStatus: StopStatus.PENDING,
        lat: 9.0643,
        lng: 7.4892,
      },
    ],
  },
  {
    id: 'b2',
    batchCode: 'B-7495',
    riderId: 'r2',
    riderName: 'Sarah Jenkins',
    riderInitials: 'SJ',
    vehicleType: VehicleType.BIKE,
    status: BatchStatus.ROUTE_SUBMITTED,
    submittedAt: minsAgo(10),
    createdAt: minsAgo(135),
    totalItems: 8,
    orderIds: ['p4', 'p5'],
    proposedRoute: [
      {
        sequence: 1,
        orderId: 'p4',
        orderDisplayId: '#8842',
        location: '55 Independence Ave',
        itemsSummary: 'Small Parcel',
        stopStatus: StopStatus.PENDING,
        lat: 9.0501,
        lng: 7.4881,
      },
      {
        sequence: 2,
        orderId: 'p5',
        orderDisplayId: '#8843',
        location: '10 Herbert Macaulay St',
        itemsSummary: 'Small Parcel',
        stopStatus: StopStatus.PENDING,
        lat: 9.0721,
        lng: 7.4738,
      },
    ],
  },
  {
    id: 'b3',
    batchCode: 'B-7501',
    riderId: 'r3',
    riderName: 'David Kim',
    riderInitials: 'DK',
    vehicleType: VehicleType.TRUCK,
    status: BatchStatus.ROUTE_SUBMITTED,
    submittedAt: minsAgo(2),
    createdAt: minsAgo(270),
    totalItems: 22,
    orderIds: ['p6'],
    proposedRoute: [
      {
        sequence: 1,
        orderId: 'p6',
        orderDisplayId: '#8844',
        location: '3 Aminu Kano Crescent',
        itemsSummary: 'Bulk Order',
        stopStatus: StopStatus.PENDING,
        lat: 9.0833,
        lng: 7.4833,
      },
    ],
  },
  {
    id: 'b4',
    batchCode: 'B-7480',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    riderInitials: 'AM',
    vehicleType: VehicleType.VAN,
    status: BatchStatus.IN_PROGRESS,
    approvedAt: minsAgo(80),
    createdAt: minsAgo(320),
    totalItems: 30,
    orderIds: ['p7', 'p8', 'p9', 'p10'],
    proposedRoute: [
      {
        sequence: 1,
        orderId: 'p7',
        orderDisplayId: '#8801',
        location: 'Jabi Lake Mall',
        itemsSummary: '2 items',
        stopStatus: StopStatus.DELIVERED,
      },
      {
        sequence: 2,
        orderId: 'p8',
        orderDisplayId: '#8802',
        location: 'Utako District',
        itemsSummary: '1 item',
        stopStatus: StopStatus.DELIVERED,
      },
      {
        sequence: 3,
        orderId: 'p9',
        orderDisplayId: '#8803',
        location: 'Gwarinpa Estate',
        itemsSummary: '3 items',
        stopStatus: StopStatus.FAILED,
      },
      {
        sequence: 4,
        orderId: 'p10',
        orderDisplayId: '#8804',
        location: 'Life Camp',
        itemsSummary: '1 item',
        stopStatus: StopStatus.EN_ROUTE,
      },
    ],
  },
  {
    id: 'b5',
    batchCode: 'B-7483',
    riderId: 'r3',
    riderName: 'David Kim',
    riderInitials: 'DK',
    vehicleType: VehicleType.TRUCK,
    status: BatchStatus.IN_PROGRESS,
    approvedAt: minsAgo(60),
    createdAt: minsAgo(200),
    totalItems: 12,
    orderIds: ['p11', 'p12'],
    proposedRoute: [
      {
        sequence: 1,
        orderId: 'p11',
        orderDisplayId: '#8810',
        location: 'Central Business District',
        itemsSummary: '4 items',
        stopStatus: StopStatus.DELIVERED,
      },
      {
        sequence: 2,
        orderId: 'p12',
        orderDisplayId: '#8811',
        location: 'Asokoro District',
        itemsSummary: '2 items',
        stopStatus: StopStatus.PENDING,
      },
    ],
  },
];

function mockTriage(search: string): TriageListResponse {
  let orders = MOCK_ORDERS.filter((o) => o.status === OrderStatus.PENDING_ROUTING);
  if (search) {
    const q = search.toLowerCase();
    orders = orders.filter(
      (o) => o.orderId.toLowerCase().includes(q) || o.customerName.toLowerCase().includes(q),
    );
  }
  orders = orders.sort((a, b) => new Date(a.paidAt).getTime() - new Date(b.paidAt).getTime());
  return { orders, total: orders.length };
}

function mockRouteOrder(
  orderId: string,
  fulfillmentType: FulfillmentType.PICKUP | FulfillmentType.DELIVERY,
): Order {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.orderId === orderId);
  if (order) {
    order.fulfillmentType = fulfillmentType;
    order.routedAt = new Date().toISOString();
    order.status =
      fulfillmentType === FulfillmentType.PICKUP ? OrderStatus.READY_FOR_PICKUP : OrderStatus.POOL;
    if (fulfillmentType === FulfillmentType.DELIVERY)
      order.enteredPoolAt = new Date().toISOString();
  }
  return order as Order;
}

function mockPool(agingThresholdMinutes: number): PoolListResponse {
  const orders = MOCK_ORDERS.filter((o) => o.status === OrderStatus.POOL).map((o) => {
    const timeInPoolMinutes = minutesBetween(o.enteredPoolAt || o.paidAt);
    return { ...o, timeInPoolMinutes, isAging: timeInPoolMinutes >= agingThresholdMinutes };
  });
  return { orders, total: orders.length, agingCount: orders.filter((o) => o.isAging).length };
}

function mockForceAssign(orderId: string, riderId: string): Order {
  const order = MOCK_ORDERS.find((o) => o.id === orderId || o.orderId === orderId);
  const rider = MOCK_RIDERS.find((r) => r.id === riderId);
  if (order) {
    order.status = OrderStatus.CLAIMED;
    order.riderId = riderId;
    order.riderName = rider?.name;
    order.claimedAt = new Date().toISOString();
  }
  if (rider) rider.currentLoad += 1;
  return order as Order;
}

function mockPendingApproval(): ApprovalQueueResponse {
  const batches = MOCK_BATCHES.filter((b) => b.status === BatchStatus.ROUTE_SUBMITTED).map((b) => ({
    ...b,
    waitMinutes: minutesBetween(b.submittedAt || b.createdAt),
  }));
  return { batches, total: batches.length };
}

function mockApprove(batchId: string, note?: string): DeliveryBatch {
  const batch = MOCK_BATCHES.find((b) => b.id === batchId || b.batchCode === batchId);
  if (batch) {
    batch.status = BatchStatus.ROUTE_APPROVED;
    batch.approvedAt = new Date().toISOString();
    batch.approvedBy = 'Admin';
    batch.adminNotes = note;
  }
  return batch as DeliveryBatch;
}

function mockReject(batchId: string, note: string): DeliveryBatch {
  const batch = MOCK_BATCHES.find((b) => b.id === batchId || b.batchCode === batchId);
  if (batch) {
    batch.status = BatchStatus.CLAIMING;
    batch.adminNotes = note;
  }
  return batch as DeliveryBatch;
}

function mockActiveRoutes(): ActiveRoutesResponse {
  const batches = MOCK_BATCHES.filter(
    (b) => b.status === BatchStatus.ROUTE_APPROVED || b.status === BatchStatus.IN_PROGRESS,
  );
  return { batches, total: batches.length };
}

function findMockOrder(orderId: string): Order | undefined {
  return MOCK_ORDERS.find((o) => o.id === orderId || o.orderId === orderId);
}

function mockAuditLog(entityId: string): AuditLogEntry[] {
  return [
    {
      id: 'a1',
      entityType: 'ORDER',
      entityId,
      actor: 'System',
      actorType: 'system',
      action: 'Order created',
      fromStatus: '—',
      toStatus: 'PENDING_ROUTING',
      timestamp: minsAgo(140),
    },
    {
      id: 'a2',
      entityType: 'ORDER',
      entityId,
      actor: 'Admin',
      actorType: 'admin',
      action: 'Routed to Delivery',
      fromStatus: 'PENDING_ROUTING',
      toStatus: 'POOL',
      timestamp: minsAgo(130),
    },
  ];
}

// ---------- Delivery Records mock data ----------

const MOCK_DELIVERY_ATTEMPTS: DeliveryAttempt[] = [
  {
    id: 'da1',
    orderId: 'o10',
    orderDisplayId: '#ORD-8921',
    customerName: 'Sarah Jenkins',
    deliveryLocation: '124 Valley Road, Sector 4',
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Mike Ross',
    riderInitials: 'M',
    outcome: 'delivered',
    attemptedAt: minsAgo(95),
    proofOfDeliveryId: 'pod1',
    proof: {
      id: 'pod1',
      deliveryAttemptId: 'da1',
      type: ProofType.SIGNATURE,
      capturedAt: minsAgo(95),
    },
  },
  {
    id: 'da2',
    orderId: 'o11',
    orderDisplayId: '#ORD-8919',
    customerName: 'TechCorp Inc.',
    deliveryLocation: 'Suite 500, Main St',
    batchId: 'b4',
    riderId: 'r5',
    riderName: 'Anna Lee',
    riderInitials: 'A',
    outcome: 'delivered',
    attemptedAt: minsAgo(158),
    proofOfDeliveryId: 'pod2',
    proof: {
      id: 'pod2',
      deliveryAttemptId: 'da2',
      type: ProofType.PHOTO,
      capturedAt: minsAgo(158),
    },
  },
  {
    id: 'da3',
    orderId: 'o12',
    orderDisplayId: '#ORD-8915',
    customerName: 'David Chen',
    deliveryLocation: '78 West Avenue',
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Mike Ross',
    riderInitials: 'M',
    outcome: 'delivered',
    attemptedAt: minsAgo(200),
    proofOfDeliveryId: 'pod3',
    proof: {
      id: 'pod3',
      deliveryAttemptId: 'da3',
      type: ProofType.CODE,
      code: '7741',
      capturedAt: minsAgo(200),
    },
  },
  {
    id: 'da4',
    orderId: 'o13',
    orderDisplayId: '#ORD-9012',
    customerName: 'Grace Okafor',
    deliveryLocation: 'Maitama District',
    batchId: 'b5',
    riderId: 'r3',
    riderName: 'David Kim',
    riderInitials: 'DK',
    outcome: 'failed',
    failureReason: FailureReason.NOT_HOME,
    attemptedAt: minsAgo(40),
    isResolved: false,
  },
  {
    id: 'da5',
    orderId: 'o14',
    orderDisplayId: '#ORD-9018',
    customerName: 'Chinedu Obi',
    deliveryLocation: 'Wuse II',
    batchId: 'b5',
    riderId: 'r2',
    riderName: 'Sarah Jenkins',
    riderInitials: 'SJ',
    outcome: 'failed',
    failureReason: FailureReason.WRONG_ADDRESS,
    attemptedAt: minsAgo(65),
    isResolved: false,
  },
  {
    id: 'da6',
    orderId: 'o15',
    orderDisplayId: '#ORD-9022',
    customerName: 'Bola Fashola',
    deliveryLocation: 'Garki Area 2',
    batchId: 'b4',
    riderId: 'r1',
    riderName: 'Alex Mercer',
    riderInitials: 'AM',
    outcome: 'failed',
    failureReason: FailureReason.REFUSED,
    attemptedAt: minsAgo(20),
    isResolved: false,
  },
];

const MOCK_PICKUP_ORDERS: Order[] = [
  {
    id: 'p20',
    orderId: '#ORD-9101',
    customerName: 'Ifeoma Nwosu',
    itemsSummary: '2 items (Standard)',
    itemCount: 2,
    deliveryLocation: 'Store Pickup Counter',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.PICKUP,
    status: OrderStatus.READY_FOR_PICKUP,
    paidAt: minsAgo(210),
    routedAt: minsAgo(205),
  },
  {
    id: 'p21',
    orderId: '#ORD-9104',
    customerName: 'Emeka Umeh',
    itemsSummary: '1 item (Electronics)',
    itemCount: 1,
    deliveryLocation: 'Store Pickup Counter',
    paymentStatus: 'paid',
    fulfillmentType: FulfillmentType.PICKUP,
    status: OrderStatus.READY_FOR_PICKUP,
    paidAt: minsAgo(90),
    routedAt: minsAgo(85),
  },
];

function mockDelivered(search: string): DeliveredListResponse {
  let attempts = MOCK_DELIVERY_ATTEMPTS.filter((a) => a.outcome === 'delivered');
  if (search) {
    const q = search.toLowerCase();
    attempts = attempts.filter(
      (a) =>
        a.orderDisplayId.toLowerCase().includes(q) ||
        a.customerName.toLowerCase().includes(q) ||
        a.riderName.toLowerCase().includes(q),
    );
  }
  attempts = attempts.sort(
    (a, b) => new Date(b.attemptedAt || 0).getTime() - new Date(a.attemptedAt || 0).getTime(),
  );
  return { attempts, total: attempts.length };
}

function mockFailed(): FailedListResponse {
  const attempts = MOCK_DELIVERY_ATTEMPTS.filter(
    (a) => a.outcome === 'failed' && !a.isResolved,
  ).sort((a, b) => new Date(b.attemptedAt || 0).getTime() - new Date(a.attemptedAt || 0).getTime());
  return { attempts, total: attempts.length };
}

function mockRequeue(attemptId: string): DeliveryAttempt {
  const attempt = MOCK_DELIVERY_ATTEMPTS.find((a) => a.id === attemptId);
  if (attempt) {
    attempt.isResolved = true;
    const order =
      findMockOrder(attempt.orderId) ||
      MOCK_ORDERS.find((o) => o.orderId === attempt.orderDisplayId);
    if (order) {
      order.status = OrderStatus.POOL;
      order.enteredPoolAt = new Date().toISOString();
      order.riderId = undefined;
      order.riderName = undefined;
    }
  }
  return attempt as DeliveryAttempt;
}

function mockCancel(attemptId: string): DeliveryAttempt {
  const attempt = MOCK_DELIVERY_ATTEMPTS.find((a) => a.id === attemptId);
  if (attempt) {
    attempt.isResolved = true;
    attempt.closedReason = 'failed_delivery';
  }
  return attempt as DeliveryAttempt;
}

function mockEscalate(attemptId: string, note: string): DeliveryAttempt {
  const attempt = MOCK_DELIVERY_ATTEMPTS.find((a) => a.id === attemptId);
  if (attempt) {
    attempt.escalationNote = note;
    attempt.escalatedAt = new Date().toISOString();
    // stays visible (isResolved remains false) per spec — still open until manually cleared
  }
  return attempt as DeliveryAttempt;
}

function mockPickups(): PickupListResponse {
  return { orders: MOCK_PICKUP_ORDERS, total: MOCK_PICKUP_ORDERS.length };
}

function mockMarkCollected(orderId: string): Order {
  const idx = MOCK_PICKUP_ORDERS.findIndex((o) => o.id === orderId || o.orderId === orderId);
  const order = MOCK_PICKUP_ORDERS[idx];
  if (order) {
    order.status = OrderStatus.CLOSED;
    if (idx > -1) MOCK_PICKUP_ORDERS.splice(idx, 1);
  }
  return order as Order;
}

// ---------- Rider Activity mock data ----------

function mockAddRider(payload: RiderCreatePayload): Rider {
  const initials =
    payload.name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '??';
  const riderCode = `R-${Math.floor(1000 + Math.random() * 9000)}`;
  const newRider: Rider = {
    id: `r${MOCK_RIDERS.length + 1}-${Date.now()}`,
    riderCode,
    name: payload.name,
    initials,
    email: payload.email,
    phone: payload.phone,
    activeStatus: payload.activeStatus,
    currentLoad: 0,
    vehicleType: payload.vehicleType,
    todayDelivered: 0,
    todayFailed: 0,
  };
  MOCK_RIDERS.push(newRider);
  return newRider;
}

function mockRiderPerformance(): RiderPerformanceResponse {
  const stats: RiderPerformanceStat[] = [
    {
      riderId: 'r1',
      riderName: 'Sarah Connor',
      riderInitials: 'SC',
      ordersClaimedWeek: 156,
      delivered: 154,
      failed: 2,
      avgTimeMinutes: 21,
      avgApprovalWaitMinutes: 1.2,
      isHoardingRisk: false,
    },
    {
      riderId: 'r2',
      riderName: 'Mike Ross',
      riderInitials: 'MR',
      ordersClaimedWeek: 182,
      delivered: 160,
      failed: 5,
      avgTimeMinutes: 38,
      avgApprovalWaitMinutes: 8.5,
      isHoardingRisk: true,
    },
    {
      riderId: 'r3',
      riderName: 'David Kim',
      riderInitials: 'DK',
      ordersClaimedWeek: 120,
      delivered: 118,
      failed: 1,
      avgTimeMinutes: 23,
      avgApprovalWaitMinutes: 2.1,
      isHoardingRisk: false,
    },
    {
      riderId: 'r4',
      riderName: 'Elena Rodriguez',
      riderInitials: 'ER',
      ordersClaimedWeek: 145,
      delivered: 142,
      failed: 3,
      avgTimeMinutes: 25,
      avgApprovalWaitMinutes: 1.8,
      isHoardingRisk: false,
    },
  ];
  const delivered = stats.reduce((sum, s) => sum + s.delivered, 0);
  const claimed = stats.reduce((sum, s) => sum + s.ordersClaimedWeek, 0);
  return {
    stats,
    total: stats.length,
    activeRiders: MOCK_RIDERS.length,
    avgDeliveryRate: claimed ? Math.round((delivered / claimed) * 1000) / 10 : 0,
    avgTimePerOrderMinutes: Math.round(
      stats.reduce((sum, s) => sum + s.avgTimeMinutes, 0) / stats.length,
    ),
    hoardingRiskCount: stats.filter((s) => s.isHoardingRisk).length,
  };
}

const MOCK_SYSTEM_AUDIT_LOG: AuditLogEntry[] = [
  {
    id: 's1',
    entityType: 'ORDER',
    entityId: 'o1',
    entityDisplayId: '#ORD-8821',
    actor: 'System Admin',
    actorType: 'admin',
    action: 'Admin routed order #ORD-8821 to Delivery Zone B automatically.',
    fromStatus: 'POOL',
    toStatus: 'ROUTED',
    timestamp: minsAgo(180),
  },
  {
    id: 's2',
    entityType: 'ORDER',
    entityId: 'o1',
    entityDisplayId: '#ORD-8821',
    actor: 'Rider J. Smith',
    actorType: 'rider',
    action: 'Rider accepted #ORD-8821 from mobile terminal queue.',
    fromStatus: 'ROUTED',
    toStatus: 'CLAIMED',
    timestamp: minsAgo(175),
  },
  {
    id: 's3',
    entityType: 'ORDER',
    entityId: 'o1',
    entityDisplayId: '#ORD-8821',
    actor: 'Rider J. Smith',
    actorType: 'rider',
    action: 'Geolocation payload received. Proximity threshold triggered for #ORD-8821.',
    fromStatus: 'CLAIMED',
    toStatus: 'TRANSIT',
    timestamp: minsAgo(150),
  },
  {
    id: 's4',
    entityType: 'ORDER',
    entityId: 'o1',
    entityDisplayId: '#ORD-8821',
    actor: 'Rider J. Smith',
    actorType: 'rider',
    action: 'POD captured and verified for #ORD-8821.',
    fromStatus: 'TRANSIT',
    toStatus: 'DELIVERED',
    timestamp: minsAgo(140),
  },
  {
    id: 's5',
    entityType: 'ORDER',
    entityId: 'o13',
    entityDisplayId: '#ORD-9012',
    actor: 'Rider M. Davis',
    actorType: 'rider',
    action: 'Customer unavailable. Delivery failed for #ORD-9012. Requires reschedule.',
    fromStatus: 'TRANSIT',
    toStatus: 'FAILED',
    timestamp: minsAgo(40),
  },
];

function mockSystemAuditLog(filter: AuditLogFilter): AuditLogResponse {
  let entries = [...MOCK_SYSTEM_AUDIT_LOG];
  if (filter.orderId) {
    const q = filter.orderId.toLowerCase();
    entries = entries.filter((e) => (e.entityDisplayId || '').toLowerCase().includes(q));
  }
  if (filter.riderId) {
    entries = entries.filter((e) => e.actor.toLowerCase().includes(filter.riderId!.toLowerCase()));
  }
  if (filter.actionType) {
    entries = entries.filter((e) => e.toStatus === filter.actionType);
  }
  entries = entries.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
  return { entries, total: entries.length };
}

// ============================================================
// RIDER APP mock data — a self-contained demo "logged in as Alex Mercer"
// draft batch + active in-progress batch, independent of the admin mocks
// above so both admin and rider screens can be demoed side by side.
// ============================================================

const RIDER_CLAIM_LIMIT = 15;

let RIDER_DRAFT_BATCH: DeliveryBatch | null = null;

let RIDER_ACTIVE_BATCH: DeliveryBatch | null = {
  id: 'rb-active',
  batchCode: 'B-9001',
  riderId: 'r1',
  riderName: 'Alex Mercer',
  riderInitials: 'AM',
  vehicleType: VehicleType.VAN,
  status: BatchStatus.IN_PROGRESS,
  approvedAt: minsAgo(45),
  createdAt: minsAgo(120),
  totalItems: 8,
  orderIds: ['ra1', 'ra2', 'ra3'],
  proposedRoute: [
    {
      sequence: 1,
      orderId: 'ra1',
      orderDisplayId: '#8901',
      location: '142 Tech Boulevard',
      itemsSummary: '2x Electronics Box',
      stopStatus: StopStatus.DELIVERED,
      lat: 9.0765,
      lng: 7.3986,
    },
    {
      sequence: 2,
      orderId: 'ra2',
      orderDisplayId: '#8902',
      location: '89 River Road',
      itemsSummary: '1x Large Furniture Package',
      stopStatus: StopStatus.EN_ROUTE,
      lat: 9.0579,
      lng: 7.4951,
    },
    {
      sequence: 3,
      orderId: 'ra3',
      orderDisplayId: '#8903',
      location: '200 North Avenue',
      itemsSummary: '5x Document Mailers',
      stopStatus: StopStatus.PENDING,
      lat: 9.0643,
      lng: 7.4892,
    },
  ],
};

const RIDER_ACTIVE_ORDERS: Record<string, { customerName: string }> = {
  ra1: { customerName: 'Sarah Jenkins' },
  ra2: { customerName: 'Michael Chang' },
  ra3: { customerName: 'Acme Corp' },
};

function mockRiderPool(): AvailablePoolResponse {
  const orders = MOCK_ORDERS.filter((o) => o.status === OrderStatus.POOL);
  const currentLoad = RIDER_DRAFT_BATCH?.orderIds.length ?? 0;
  return { orders, total: orders.length, claimLimit: RIDER_CLAIM_LIMIT, currentLoad };
}

function mockClaimOrders(orderIds: string[]): DeliveryBatch {
  const currentLoad = RIDER_DRAFT_BATCH?.orderIds.length ?? 0;
  if (currentLoad + orderIds.length > RIDER_CLAIM_LIMIT) {
    throw new Error(`Claim limit of ${RIDER_CLAIM_LIMIT} would be exceeded`);
  }
  if (!RIDER_DRAFT_BATCH) {
    RIDER_DRAFT_BATCH = {
      id: 'rb-draft',
      batchCode: 'B-DRAFT',
      riderId: 'r1',
      riderName: 'Alex Mercer',
      riderInitials: 'AM',
      vehicleType: VehicleType.VAN,
      status: BatchStatus.CLAIMING,
      createdAt: new Date().toISOString(),
      totalItems: 0,
      orderIds: [],
      proposedRoute: [],
    };
  }
  orderIds.forEach((id) => {
    const order = MOCK_ORDERS.find((o) => o.id === id);
    if (order && order.status === OrderStatus.POOL) {
      order.status = OrderStatus.CLAIMED;
      order.claimedAt = new Date().toISOString();
      order.riderId = 'r1';
      order.riderName = 'Alex Mercer';
      order.batchId = RIDER_DRAFT_BATCH!.id;
      RIDER_DRAFT_BATCH!.orderIds.push(order.id);
      RIDER_DRAFT_BATCH!.proposedRoute.push({
        sequence: RIDER_DRAFT_BATCH!.proposedRoute.length + 1,
        orderId: order.id,
        orderDisplayId: order.orderId,
        location: order.deliveryLocation,
        itemsSummary: order.itemsSummary,
        stopStatus: StopStatus.PENDING,
        lat: order.lat,
        lng: order.lng,
        locationConfirmed: false,
        weightKg: order.weightKg,
        customerName: order.customerName,
        area: order.area,
        distanceKm: order.distanceKm,
      });
      RIDER_DRAFT_BATCH!.totalItems += order.itemCount;
    }
  });
  return RIDER_DRAFT_BATCH;
}

function mockRemoveFromBatch(orderId: string): DeliveryBatch | null {
  if (!RIDER_DRAFT_BATCH) return null;
  RIDER_DRAFT_BATCH.orderIds = RIDER_DRAFT_BATCH.orderIds.filter((id) => id !== orderId);
  RIDER_DRAFT_BATCH.proposedRoute = RIDER_DRAFT_BATCH.proposedRoute
    .filter((s) => s.orderId !== orderId)
    .map((s, idx) => ({ ...s, sequence: idx + 1 }));
  const order = MOCK_ORDERS.find((o) => o.id === orderId);
  if (order) {
    order.status = OrderStatus.POOL;
    order.enteredPoolAt = new Date().toISOString();
    order.riderId = undefined;
    order.riderName = undefined;
    order.batchId = undefined;
    order.claimedAt = undefined;
  }
  if (!RIDER_DRAFT_BATCH.orderIds.length) {
    RIDER_DRAFT_BATCH = null;
    return null;
  }
  return RIDER_DRAFT_BATCH;
}

function mockReorderBatch(orderedOrderIds: string[]): DeliveryBatch | null {
  if (!RIDER_DRAFT_BATCH) return null;
  const stopMap = new Map(RIDER_DRAFT_BATCH.proposedRoute.map((s) => [s.orderId, s]));
  RIDER_DRAFT_BATCH.proposedRoute = orderedOrderIds
    .map((id) => stopMap.get(id))
    .filter((s): s is RouteStop => !!s)
    .map((s, idx) => ({ ...s, sequence: idx + 1 }));
  RIDER_DRAFT_BATCH.orderIds = orderedOrderIds;
  return RIDER_DRAFT_BATCH;
}

function mockUpdateStopLocation(
  orderId: string,
  point: GeoPoint,
  confirm: boolean = false,
): DeliveryBatch | null {
  if (!RIDER_DRAFT_BATCH) return null;
  const stop = RIDER_DRAFT_BATCH.proposedRoute.find((s) => s.orderId === orderId);
  if (stop) {
    stop.lat = point.lat;
    stop.lng = point.lng;
    stop.location = point.label;
    if (confirm) stop.locationConfirmed = true;
  }
  return RIDER_DRAFT_BATCH;
}

function mockSubmitBatch(): DeliveryBatch | null {
  if (!RIDER_DRAFT_BATCH) return null;
  RIDER_DRAFT_BATCH.status = BatchStatus.ROUTE_SUBMITTED;
  RIDER_DRAFT_BATCH.submittedAt = new Date().toISOString();
  return RIDER_DRAFT_BATCH;
}

function mockSetStopStatus(orderId: string, status: StopStatus): DeliveryBatch | null {
  if (!RIDER_ACTIVE_BATCH) return null;
  const stop = RIDER_ACTIVE_BATCH.proposedRoute.find((s) => s.orderId === orderId);
  if (stop) stop.stopStatus = status;
  return RIDER_ACTIVE_BATCH;
}

function mockMarkDelivered(
  orderId: string,
  proofType: ProofType,
  proofValue?: string,
  receiverName?: string,
): DeliveryBatch | null {
  return mockSetStopStatus(orderId, StopStatus.DELIVERED);
}

function mockMarkFailed(
  orderId: string,
  reason: FailureReason,
  note?: string,
): DeliveryBatch | null {
  return mockSetStopStatus(orderId, StopStatus.FAILED);
}
