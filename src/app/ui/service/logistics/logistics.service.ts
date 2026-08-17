import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, delay } from 'rxjs/operators';
import {
  Delivery,
  DeliveryFilters,
  DeliveryPriority,
  DeliveryRoute,
  DeliveryStatus,
  DeliveryType,
  Driver,
  DriverFormPayload,
  LogisticsAnalytics,
  LogisticsDashboardSummary,
  NewDeliveryPayload,
  PagedResult,
  Vehicle,
  VehicleFormPayload,
} from '../../domain/logistics/logistics.dto';
import { environment } from '../../shared-component/service/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class LogisticsService {

  private readonly base = `${environment.apiBaseUrl}/x/api/v2/logistics`;

  private get tenantId(): string {
    const h = window.location.hostname;
    return (h.includes('localhost') || h.includes('127.0.0.1')) ? 'optimax' : h.split('.')[0] || 'optimax';
  }

  constructor(private http: HttpClient) { }

  // ============================================
  // DASHBOARD
  // ============================================

  getDashboardSummary(): Observable<LogisticsDashboardSummary> {
    return this.http.get<LogisticsDashboardSummary>(`${this.base}/dashboard-summary`).pipe(
      catchError(() => of(this.mockSummary()))
    );
  }

  getAnalytics(range: 'today' | 'week' | 'month' = 'month'): Observable<LogisticsAnalytics> {
    const params = new HttpParams().set('dateRange', range);
    return this.http.get<LogisticsAnalytics>(`${this.base}/analytics`, { params }).pipe(
      catchError(() => of(this.mockAnalytics()))
    );
  }

  getRecentDeliveries(limit: number = 6): Observable<Delivery[]> {
    return this.getDeliveries({ page: 0, size: limit }).pipe(
      delay(0),
      catchError(() => of({ data: this.allDeliveries.slice(0, limit), total: this.allDeliveries.length })),
    ) as unknown as Observable<Delivery[]>;
  }

  // ============================================
  // DELIVERIES
  // ============================================

  getDeliveries(filters: DeliveryFilters): Observable<PagedResult<Delivery>> {
    let params = new HttpParams().set('tenantId', this.tenantId);
    if (filters?.page !== undefined) params = params.set('page', String((filters.page || 0) + 1));
    if (filters?.size !== undefined) params = params.set('size', String(filters.size));
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.status && filters.status !== 'ALL') params = params.set('status', filters.status);
    if (filters?.type && filters.type !== 'ALL') params = params.set('type', filters.type);
    if (filters?.priority && filters.priority !== 'ALL') params = params.set('priority', filters.priority);

    return this.http.get<PagedResult<Delivery>>(`${this.base}/deliveries`, { params }).pipe(
      catchError(() => of(this.filterMockDeliveries(filters)))
    );
  }

  getDeliveryById(id: string): Observable<Delivery | undefined> {
    return this.http.get<Delivery>(`${this.base}/deliveries/${id}`).pipe(
      catchError(() => of(this.allDeliveries.find(d => d.id === id)))
    );
  }

  updateDeliveryStatus(id: string, status: DeliveryStatus, note?: string): Observable<Delivery | undefined> {
    return this.http.patch<Delivery>(`${this.base}/deliveries/${id}/status`, { status, note }).pipe(
      catchError(() => {
        const d = this.allDeliveries.find(x => x.id === id);
        if (d) {
          d.status = status;
          d.timeline.push({ status, label: status.replace('_', ' '), timestamp: new Date().toISOString(), note });
        }
        return of(d);
      })
    );
  }

  createDelivery(payload: NewDeliveryPayload): Observable<Delivery> {
    return this.http.post<Delivery>(`${this.base}/deliveries`, payload).pipe(
      delay(400),
      catchError(() => {
        const driver = payload.driverId ? this.allDriversStore.find(d => d.id === payload.driverId) : undefined;
        const vehicle = payload.vehicleId ? this.allVehiclesStore.find(v => v.id === payload.vehicleId) : undefined;
        const now = new Date();
        const created: Delivery = {
          id: `del-new-${Date.now()}`,
          deliveryNumber: `DEL-${100000 + Math.floor(Math.random() * 89999)}`,
          type: payload.type,
          status: 'PENDING',
          priority: payload.priority,
          origin: { label: payload.originLabel, line1: payload.originLine1, city: 'Lagos', state: 'Lagos' },
          destination: {
            label: payload.destinationLabel,
            line1: payload.destinationLine1,
            city: 'Lagos',
            state: 'Lagos',
            contactName: payload.destinationContactName,
            contactPhone: payload.destinationContactPhone,
          },
          linkedOrderRef: payload.linkedOrderRef,
          linkedModule: 'Sales',
          driverId: driver?.id,
          driverName: driver?.name,
          vehicleId: vehicle?.id,
          vehiclePlate: vehicle?.plateNumber,
          items: payload.items.map((it, i) => ({ id: `new-it-${i}`, name: it.name, sku: it.sku, quantity: it.quantity, unit: it.unit })),
          itemCount: payload.items.reduce((s, it) => s + it.quantity, 0),
          distanceKm: 0,
          cost: 0,
          createdAt: now.toISOString(),
          timeline: [{ status: 'PENDING', label: 'Order created', timestamp: now.toISOString(), actor: 'You' }],
          notes: payload.notes,
        };
        this.allDeliveries.unshift(created);
        return of(created);
      })
    );
  }

  assignDriverAndVehicle(deliveryId: string, driverId: string, vehicleId: string): Observable<Delivery | undefined> {
    return this.http.post<Delivery>(`${this.base}/deliveries/${deliveryId}/assign`, { driverId, vehicleId }).pipe(
      catchError(() => {
        const d = this.allDeliveries.find(x => x.id === deliveryId);
        const driver = this.allDriversStore.find(x => x.id === driverId);
        const vehicle = this.allVehiclesStore.find(x => x.id === vehicleId);
        if (d) {
          d.driverId = driverId;
          d.driverName = driver?.name;
          d.vehicleId = vehicleId;
          d.vehiclePlate = vehicle?.plateNumber;
        }
        return of(d);
      })
    );
  }

  // ============================================
  // FLEET
  // ============================================

  getVehicles(status?: VehicleFilterStatus): Observable<Vehicle[]> {
    let params = new HttpParams();
    if (status && status !== 'ALL') params = params.set('status', status);
    return this.http.get<Vehicle[]>(`${this.base}/vehicles`, { params }).pipe(
      catchError(() => of(status && status !== 'ALL' ? this.allVehiclesStore.filter(v => v.status === status) : this.allVehiclesStore))
    );
  }

  getVehicleById(id: string): Observable<Vehicle | undefined> {
    return this.http.get<Vehicle>(`${this.base}/vehicles/${id}`).pipe(
      catchError(() => of(this.allVehiclesStore.find(v => v.id === id)))
    );
  }

  createVehicle(payload: VehicleFormPayload): Observable<Vehicle> {
    return this.http.post<Vehicle>(`${this.base}/vehicles`, payload).pipe(
      delay(400),
      catchError(() => {
        const driver = payload.assignedDriverId ? this.allDriversStore.find(d => d.id === payload.assignedDriverId) : undefined;
        const created: Vehicle = {
          id: `veh-new-${Date.now()}`,
          plateNumber: payload.plateNumber,
          name: payload.name,
          type: payload.type,
          status: payload.status,
          capacityKg: payload.capacityKg,
          odometerKm: 0,
          fuelLevelPct: 100,
          ageYears: 0,
          purchaseDate: payload.purchaseDate || new Date().toISOString(),
          lastServiceDate: new Date().toISOString(),
          nextServiceDue: new Date(Date.now() + 90 * 86400000).toISOString(),
          nextServiceKm: 5000,
          assignedDriverId: driver?.id,
          assignedDriverName: driver?.name,
          homeBranch: payload.homeBranch,
          documents: [],
          utilizationPct: 0,
          activeDeliveries: 0,
          totalDeliveriesCompleted: 0,
        };
        this.allVehiclesStore.push(created);
        return of(created);
      })
    );
  }

  updateVehicle(id: string, payload: Partial<VehicleFormPayload>): Observable<Vehicle | undefined> {
    return this.http.patch<Vehicle>(`${this.base}/vehicles/${id}`, payload).pipe(
      catchError(() => {
        const v = this.allVehiclesStore.find(x => x.id === id);
        if (v) {
          if (payload.plateNumber) v.plateNumber = payload.plateNumber;
          if (payload.name) v.name = payload.name;
          if (payload.type) v.type = payload.type;
          if (payload.status) v.status = payload.status;
          if (payload.capacityKg) v.capacityKg = payload.capacityKg;
          if (payload.homeBranch) v.homeBranch = payload.homeBranch;
          if (payload.assignedDriverId !== undefined) {
            const driver = this.allDriversStore.find(d => d.id === payload.assignedDriverId);
            v.assignedDriverId = driver?.id;
            v.assignedDriverName = driver?.name;
          }
        }
        return of(v);
      })
    );
  }

  getDrivers(): Observable<Driver[]> {
    return this.http.get<Driver[]>(`${this.base}/drivers`).pipe(
      catchError(() => of(this.allDriversStore))
    );
  }

  getDriverById(id: string): Observable<Driver | undefined> {
    return this.http.get<Driver>(`${this.base}/drivers/${id}`).pipe(
      catchError(() => of(this.allDriversStore.find(d => d.id === id)))
    );
  }

  createDriver(payload: DriverFormPayload): Observable<Driver> {
    return this.http.post<Driver>(`${this.base}/drivers`, payload).pipe(
      delay(400),
      catchError(() => {
        const vehicle = payload.assignedVehicleId ? this.allVehiclesStore.find(v => v.id === payload.assignedVehicleId) : undefined;
        const initials = payload.name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
        const created: Driver = {
          id: `drv-new-${Date.now()}`,
          name: payload.name,
          initials,
          phone: payload.phone,
          email: payload.email,
          licenseNumber: payload.licenseNumber,
          licenseExpiry: payload.licenseExpiry,
          status: payload.status,
          assignedVehicleId: vehicle?.id,
          assignedVehiclePlate: vehicle?.plateNumber,
          rating: 0,
          totalDeliveries: 0,
          successRatePct: 0,
          onTimeRatePct: 0,
          yearsOfService: 0,
          homeBranch: payload.homeBranch,
        };
        this.allDriversStore.push(created);
        return of(created);
      })
    );
  }

  updateDriver(id: string, payload: Partial<DriverFormPayload>): Observable<Driver | undefined> {
    return this.http.patch<Driver>(`${this.base}/drivers/${id}`, payload).pipe(
      catchError(() => {
        const d = this.allDriversStore.find(x => x.id === id);
        if (d) {
          if (payload.name) d.name = payload.name;
          if (payload.phone) d.phone = payload.phone;
          if (payload.email) d.email = payload.email;
          if (payload.licenseNumber) d.licenseNumber = payload.licenseNumber;
          if (payload.licenseExpiry) d.licenseExpiry = payload.licenseExpiry;
          if (payload.status) d.status = payload.status;
          if (payload.homeBranch) d.homeBranch = payload.homeBranch;
          if (payload.assignedVehicleId !== undefined) {
            const vehicle = this.allVehiclesStore.find(v => v.id === payload.assignedVehicleId);
            d.assignedVehicleId = vehicle?.id;
            d.assignedVehiclePlate = vehicle?.plateNumber;
          }
        }
        return of(d);
      })
    );
  }

  // ============================================
  // ROUTE OPTIMIZATION
  // ============================================

  getRoutes(): Observable<DeliveryRoute[]> {
    return this.http.get<DeliveryRoute[]>(`${this.base}/routes`).pipe(
      catchError(() => of(this.allRoutes))
    );
  }

  getRouteById(id: string): Observable<DeliveryRoute | undefined> {
    return this.http.get<DeliveryRoute>(`${this.base}/routes/${id}`).pipe(
      catchError(() => of(this.allRoutes.find(r => r.id === id)))
    );
  }

  optimizeRoute(id: string): Observable<DeliveryRoute | undefined> {
    return this.http.post<DeliveryRoute>(`${this.base}/routes/${id}/optimize`, {}).pipe(
      delay(900),
      catchError(() => {
        const r = this.allRoutes.find(x => x.id === id);
        if (r && !r.optimized) {
          r.totalDistanceKmBeforeOptimization = r.totalDistanceKm;
          r.estimatedDurationMinBeforeOptimization = r.estimatedDurationMin;
          r.estimatedFuelCostBeforeOptimization = r.estimatedFuelCost;
          r.totalDistanceKm = +(r.totalDistanceKm * 0.79).toFixed(1);
          r.estimatedDurationMin = Math.round(r.estimatedDurationMin * 0.74);
          r.estimatedFuelCost = Math.round(r.estimatedFuelCost * 0.79);
          r.optimized = true;
          r.status = 'OPTIMIZED';
        }
        return of(r);
      })
    );
  }

  // ============================================
  // TRACKING
  // ============================================

  trackByDeliveryNumber(deliveryNumber: string): Observable<Delivery | undefined> {
    return this.http.get<Delivery>(`${this.base}/track/${deliveryNumber}`).pipe(
      catchError(() => of(this.allDeliveries.find(d => d.deliveryNumber.toLowerCase() === deliveryNumber.toLowerCase())))
    );
  }

  // ============================================
  // HELPERS
  // ============================================

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount || 0);
  }

  // ============================================
  // MOCK DATA — used only as a fallback when the real endpoint is unavailable
  // ============================================

  private filterMockDeliveries(filters: DeliveryFilters): PagedResult<Delivery> {
    let data = [...this.allDeliveries];
    if (filters?.search) {
      const s = filters.search.toLowerCase();
      data = data.filter(d =>
        d.deliveryNumber.toLowerCase().includes(s) ||
        d.destination.contactName?.toLowerCase().includes(s) ||
        d.destination.label.toLowerCase().includes(s) ||
        d.driverName?.toLowerCase().includes(s)
      );
    }
    if (filters?.status && filters.status !== 'ALL') data = data.filter(d => d.status === filters.status);
    if (filters?.type && filters.type !== 'ALL') data = data.filter(d => d.type === filters.type);
    if (filters?.priority && filters.priority !== 'ALL') data = data.filter(d => d.priority === filters.priority);

    const total = data.length;
    const page = filters?.page || 0;
    const size = filters?.size || 20;
    data = data.slice(page * size, page * size + size);
    return { data, total };
  }

  private mockSummary(): LogisticsDashboardSummary {
    const d = this.allDeliveries;
    return {
      activeDeliveries: d.filter(x => ['DISPATCHED', 'IN_TRANSIT', 'PICKING', 'PACKING'].includes(x.status)).length,
      pendingDeliveries: d.filter(x => x.status === 'PENDING').length,
      delayedDeliveries: d.filter(x => x.status === 'DELAYED').length,
      deliveredToday: d.filter(x => x.status === 'DELIVERED').length,
      availableVehicles: this.allVehiclesStore.filter(v => v.status === 'ACTIVE' || v.status === 'IDLE').length,
      availableDrivers: this.allDriversStore.filter(dr => dr.status === 'ON_DUTY').length,
      urgentCount: d.filter(x => x.priority === 'URGENT' && x.status !== 'DELIVERED' && x.status !== 'CANCELLED').length,
    };
  }

  private mockAnalytics(): LogisticsAnalytics {
    const byType: { type: DeliveryType; count: number }[] = (
      ['BRANCH_TRANSFER', 'SUPPLIER_PURCHASE', 'CUSTOMER_DELIVERY', 'RETURN_DELIVERY', 'BULK_TRANSFER'] as DeliveryType[]
    ).map(type => ({ type, count: this.allDeliveries.filter(d => d.type === type).length }));

    const byStatus: { status: DeliveryStatus; count: number }[] = (
      ['PENDING', 'PICKING', 'PACKING', 'DISPATCHED', 'IN_TRANSIT', 'DELAYED', 'ARRIVED', 'DELIVERED', 'CANCELLED'] as DeliveryStatus[]
    ).map(status => ({ status, count: this.allDeliveries.filter(d => d.status === status).length }));

    return {
      performance: {
        deliverySuccessRatePct: 94,
        deliverySuccessRateTrendPct: 5,
        onTimeDeliveryRatePct: 87,
        onTimeDeliveryRateTrendPct: 3,
        avgDeliveryTimeMin: 45,
        avgDeliveryTimeTrendPct: -10,
        vehicleUtilizationPct: 78,
        vehicleUtilizationTrendPct: 8,
      },
      volume: {
        totalDeliveriesThisMonth: 1247,
        avgDailyDeliveries: 42,
        peakHour: '11:00 - 12:00',
        busiestDay: 'Friday',
      },
      cost: {
        totalDeliveryCost: 4500000,
        costPerDelivery: 3610,
        fuelCost: 1800000,
        driverCost: 2700000,
      },
      fleet: {
        totalVehicles: 12,
        activeVehicles: 9,
        maintenanceVehicles: 2,
        idleVehicles: 1,
        averageAgeYears: 3.5,
      },
      driver: {
        bestDriverName: 'John Doe',
        bestDriverSuccessRatePct: 98,
        mostDeliveriesDriverName: 'Jane Smith',
        mostDeliveriesCount: 156,
        averageRating: 4.7,
        driverTurnoverPct: 12,
      },
      deliveriesByType: byType,
      deliveriesByStatus: byStatus,
      dailyTrend: this.buildDailyTrend(),
    };
  }

  private buildDailyTrend(): { date: string; completed: number; delayed: number }[] {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((d, i) => ({
      date: d,
      completed: [38, 42, 40, 44, 51, 30, 22][i],
      delayed: [3, 2, 4, 2, 5, 1, 1][i],
    }));
  }

  // ---- Static mock entities (deterministic, resembles real operational data) ----

  private allDriversStore: Driver[] = [
    { id: 'drv-1', name: 'John Doe', initials: 'JD', phone: '+234 803 555 0110', licenseNumber: 'LG-DL-88213', licenseExpiry: '2027-03-14', status: 'ON_DELIVERY', assignedVehicleId: 'veh-1', assignedVehiclePlate: 'LND-224-KJA', rating: 4.9, totalDeliveries: 341, successRatePct: 98, onTimeRatePct: 95, yearsOfService: 4, homeBranch: 'Lekki' },
    { id: 'drv-2', name: 'Jane Smith', initials: 'JS', phone: '+234 803 555 0121', licenseNumber: 'LG-DL-77410', licenseExpiry: '2026-11-02', status: 'ON_DELIVERY', assignedVehicleId: 'veh-2', assignedVehiclePlate: 'LND-118-KJA', rating: 4.8, totalDeliveries: 412, successRatePct: 96, onTimeRatePct: 91, yearsOfService: 5, homeBranch: 'Mushin' },
    { id: 'drv-3', name: 'Ibrahim Musa', initials: 'IM', phone: '+234 803 555 0132', licenseNumber: 'LG-DL-65310', licenseExpiry: '2025-09-21', status: 'ON_DUTY', assignedVehicleId: 'veh-3', assignedVehiclePlate: 'LND-305-KJA', rating: 4.6, totalDeliveries: 298, successRatePct: 93, onTimeRatePct: 88, yearsOfService: 3, homeBranch: 'Ikeja' },
    { id: 'drv-4', name: 'Amaka Chukwu', initials: 'AC', phone: '+234 803 555 0143', licenseNumber: 'LG-DL-54211', licenseExpiry: '2026-05-30', status: 'OFF_DUTY', rating: 4.7, totalDeliveries: 256, successRatePct: 95, onTimeRatePct: 90, yearsOfService: 2, homeBranch: 'Lekki' },
    { id: 'drv-5', name: 'Tunde Bakare', initials: 'TB', phone: '+234 803 555 0154', licenseNumber: 'LG-DL-43112', licenseExpiry: '2027-01-11', status: 'ON_DUTY', assignedVehicleId: 'veh-5', assignedVehiclePlate: 'LND-451-KJA', rating: 4.4, totalDeliveries: 189, successRatePct: 90, onTimeRatePct: 84, yearsOfService: 1, homeBranch: 'Mushin' },
    { id: 'drv-6', name: 'Grace Effiong', initials: 'GE', phone: '+234 803 555 0165', licenseNumber: 'LG-DL-32013', licenseExpiry: '2026-08-19', status: 'ON_LEAVE', rating: 4.5, totalDeliveries: 201, successRatePct: 92, onTimeRatePct: 87, yearsOfService: 2, homeBranch: 'Ikeja' },
    { id: 'drv-7', name: 'Segun Adeyemi', initials: 'SA', phone: '+234 803 555 0176', licenseNumber: 'LG-DL-21914', licenseExpiry: '2025-12-04', status: 'ON_DUTY', assignedVehicleId: 'veh-7', assignedVehiclePlate: 'LND-762-KJA', rating: 4.3, totalDeliveries: 167, successRatePct: 89, onTimeRatePct: 83, yearsOfService: 1, homeBranch: 'Lekki' },
  ];

  private allVehiclesStore: Vehicle[] = [
    { id: 'veh-1', plateNumber: 'LND-224-KJA', name: 'Hilux 01', type: 'TRUCK', status: 'ACTIVE', capacityKg: 2500, odometerKm: 68210, fuelLevelPct: 72, ageYears: 2, purchaseDate: '2024-02-10', lastServiceDate: '2026-06-01', nextServiceDue: '2026-09-01', nextServiceKm: 72000, assignedDriverId: 'drv-1', assignedDriverName: 'John Doe', homeBranch: 'Lekki', utilizationPct: 91, activeDeliveries: 2, totalDeliveriesCompleted: 214,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2026-12-01', status: 'valid' }, { name: 'Road Worthiness', expiresAt: '2026-09-05', status: 'expiring' }] },
    { id: 'veh-2', plateNumber: 'LND-118-KJA', name: 'Sprinter Van 02', type: 'VAN', status: 'ACTIVE', capacityKg: 1200, odometerKm: 51340, fuelLevelPct: 54, ageYears: 3, purchaseDate: '2023-04-18', lastServiceDate: '2026-05-15', nextServiceDue: '2026-08-15', nextServiceKm: 55000, assignedDriverId: 'drv-2', assignedDriverName: 'Jane Smith', homeBranch: 'Mushin', utilizationPct: 88, activeDeliveries: 3, totalDeliveriesCompleted: 301,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2027-01-20', status: 'valid' }, { name: 'Road Worthiness', expiresAt: '2027-01-01', status: 'valid' }] },
    { id: 'veh-3', plateNumber: 'LND-305-KJA', name: 'Bus 03', type: 'TRUCK', status: 'ACTIVE', capacityKg: 3000, odometerKm: 94810, fuelLevelPct: 38, ageYears: 5, purchaseDate: '2021-06-02', lastServiceDate: '2026-07-02', nextServiceDue: '2026-10-02', nextServiceKm: 98000, assignedDriverId: 'drv-3', assignedDriverName: 'Ibrahim Musa', homeBranch: 'Ikeja', utilizationPct: 76, activeDeliveries: 1, totalDeliveriesCompleted: 189,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2026-08-30', status: 'expiring' }, { name: 'Road Worthiness', expiresAt: '2026-04-01', status: 'expired' }] },
    { id: 'veh-4', plateNumber: 'LND-090-KJA', name: 'Bike 04', type: 'BIKE', status: 'MAINTENANCE', capacityKg: 40, odometerKm: 22110, fuelLevelPct: 0, ageYears: 1, purchaseDate: '2025-01-08', lastServiceDate: '2026-08-10', nextServiceDue: '2026-08-16', nextServiceKm: 23000, homeBranch: 'Lekki', utilizationPct: 0, activeDeliveries: 0, totalDeliveriesCompleted: 88,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2027-02-14', status: 'valid' }] },
    { id: 'veh-5', plateNumber: 'LND-451-KJA', name: 'Sprinter Van 05', type: 'VAN', status: 'ACTIVE', capacityKg: 1200, odometerKm: 33220, fuelLevelPct: 81, ageYears: 2, purchaseDate: '2024-09-19', lastServiceDate: '2026-06-20', nextServiceDue: '2026-09-20', nextServiceKm: 37000, assignedDriverId: 'drv-5', assignedDriverName: 'Tunde Bakare', homeBranch: 'Mushin', utilizationPct: 84, activeDeliveries: 2, totalDeliveriesCompleted: 132,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2027-03-11', status: 'valid' }, { name: 'Road Worthiness', expiresAt: '2026-11-11', status: 'valid' }] },
    { id: 'veh-6', plateNumber: 'LND-620-KJA', name: 'Hilux 06', type: 'TRUCK', status: 'IDLE', capacityKg: 2500, odometerKm: 41880, fuelLevelPct: 66, ageYears: 3, purchaseDate: '2023-11-30', lastServiceDate: '2026-05-01', nextServiceDue: '2026-08-01', nextServiceKm: 45000, homeBranch: 'Ikeja', utilizationPct: 45, activeDeliveries: 0, totalDeliveriesCompleted: 176,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2026-10-10', status: 'valid' }] },
    { id: 'veh-7', plateNumber: 'LND-762-KJA', name: 'Sprinter Van 07', type: 'VAN', status: 'ACTIVE', capacityKg: 1200, odometerKm: 18040, fuelLevelPct: 47, ageYears: 1, purchaseDate: '2025-03-22', lastServiceDate: '2026-07-15', nextServiceDue: '2026-10-15', nextServiceKm: 22000, assignedDriverId: 'drv-7', assignedDriverName: 'Segun Adeyemi', homeBranch: 'Lekki', utilizationPct: 79, activeDeliveries: 1, totalDeliveriesCompleted: 61,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2027-04-02', status: 'valid' }] },
    { id: 'veh-8', plateNumber: 'LND-833-KJA', name: 'Bike 08', type: 'BIKE', status: 'ACTIVE', capacityKg: 40, odometerKm: 9210, fuelLevelPct: 92, ageYears: 1, purchaseDate: '2025-05-14', lastServiceDate: '2026-07-01', nextServiceDue: '2026-10-01', nextServiceKm: 12000, homeBranch: 'Mushin', utilizationPct: 68, activeDeliveries: 1, totalDeliveriesCompleted: 44,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2027-01-09', status: 'valid' }] },
    { id: 'veh-9', plateNumber: 'LND-902-KJA', name: 'Truck 09', type: 'TRUCK', status: 'OUT_OF_SERVICE', capacityKg: 4000, odometerKm: 132900, fuelLevelPct: 12, ageYears: 7, purchaseDate: '2019-02-01', lastServiceDate: '2026-03-01', nextServiceDue: '2026-06-01', nextServiceKm: 133500, homeBranch: 'Ikeja', utilizationPct: 0, activeDeliveries: 0, totalDeliveriesCompleted: 402,
      documents: [{ name: 'Vehicle Insurance', expiresAt: '2026-05-01', status: 'expired' }, { name: 'Road Worthiness', expiresAt: '2026-05-01', status: 'expired' }] },
  ];

  private allRoutes: DeliveryRoute[] = [
    {
      id: 'rt-1', name: 'Lekki AM Run', status: 'DRAFT', driverId: 'drv-1', driverName: 'John Doe', vehicleId: 'veh-1', vehiclePlate: 'LND-224-KJA',
      totalDistanceKm: 38.4, estimatedDurationMin: 132, estimatedFuelCost: 9200, createdAt: '2026-08-13T06:10:00Z', scheduledFor: '2026-08-13T08:00:00Z', optimized: false,
      stops: [
        { order: 1, deliveryId: 'del-1', deliveryNumber: 'DEL-100241', address: { label: 'Lekki Phase 1', line1: '12 Admiralty Way', city: 'Lagos', state: 'Lagos' }, status: 'PENDING', etaMinutesFromStart: 18, distanceFromPrevKm: 6.2 },
        { order: 2, deliveryId: 'del-2', deliveryNumber: 'DEL-100244', address: { label: 'Chevron Drive', line1: '4 Chevron Drive', city: 'Lagos', state: 'Lagos' }, status: 'PENDING', etaMinutesFromStart: 41, distanceFromPrevKm: 9.8 },
        { order: 3, deliveryId: 'del-3', deliveryNumber: 'DEL-100249', address: { label: 'Ikate', line1: '8 Freedom Way', city: 'Lagos', state: 'Lagos' }, status: 'PENDING', etaMinutesFromStart: 76, distanceFromPrevKm: 12.1 },
        { order: 4, deliveryId: 'del-4', deliveryNumber: 'DEL-100252', address: { label: 'Ajah', line1: '19 Addo Road', city: 'Lagos', state: 'Lagos' }, status: 'PENDING', etaMinutesFromStart: 132, distanceFromPrevKm: 10.3 },
      ],
    },
    {
      id: 'rt-2', name: 'Mushin–Ikeja Midday', status: 'OPTIMIZED', driverId: 'drv-2', driverName: 'Jane Smith', vehicleId: 'veh-2', vehiclePlate: 'LND-118-KJA',
      totalDistanceKm: 22.7, totalDistanceKmBeforeOptimization: 29.9, estimatedDurationMin: 96, estimatedDurationMinBeforeOptimization: 128, estimatedFuelCost: 5100, estimatedFuelCostBeforeOptimization: 6600,
      createdAt: '2026-08-13T05:40:00Z', scheduledFor: '2026-08-13T11:00:00Z', optimized: true,
      stops: [
        { order: 1, deliveryId: 'del-5', deliveryNumber: 'DEL-100238', address: { label: 'Mushin Market', line1: '3 Ojuwoye St', city: 'Lagos', state: 'Lagos' }, status: 'DISPATCHED', etaMinutesFromStart: 14, distanceFromPrevKm: 4.1 },
        { order: 2, deliveryId: 'del-6', deliveryNumber: 'DEL-100240', address: { label: 'Isolo', line1: '21 Ago Palace Way', city: 'Lagos', state: 'Lagos' }, status: 'DISPATCHED', etaMinutesFromStart: 38, distanceFromPrevKm: 7.5 },
        { order: 3, deliveryId: 'del-7', deliveryNumber: 'DEL-100245', address: { label: 'Ikeja GRA', line1: '9 Oduduwa Cres', city: 'Lagos', state: 'Lagos' }, status: 'PENDING', etaMinutesFromStart: 96, distanceFromPrevKm: 11.1 },
      ],
    },
    {
      id: 'rt-3', name: 'Ajah Bulk Distribution', status: 'ACTIVE', driverId: 'drv-5', driverName: 'Tunde Bakare', vehicleId: 'veh-5', vehiclePlate: 'LND-451-KJA',
      totalDistanceKm: 51.2, estimatedDurationMin: 187, estimatedFuelCost: 12300, createdAt: '2026-08-12T22:00:00Z', scheduledFor: '2026-08-13T07:30:00Z', optimized: true,
      totalDistanceKmBeforeOptimization: 63.5, estimatedDurationMinBeforeOptimization: 240, estimatedFuelCostBeforeOptimization: 15200,
      stops: [
        { order: 1, deliveryId: 'del-8', deliveryNumber: 'DEL-100230', address: { label: 'Sangotedo Branch', line1: '5 Abraham Adesanya Rd', city: 'Lagos', state: 'Lagos' }, status: 'DELIVERED', etaMinutesFromStart: 22, distanceFromPrevKm: 8.4 },
        { order: 2, deliveryId: 'del-9', deliveryNumber: 'DEL-100232', address: { label: 'Awoyaya Branch', line1: '2 Lekki-Epe Expy', city: 'Lagos', state: 'Lagos' }, status: 'DELIVERED', etaMinutesFromStart: 61, distanceFromPrevKm: 14.7 },
        { order: 3, deliveryId: 'del-10', deliveryNumber: 'DEL-100235', address: { label: 'Abraham Adesanya', line1: '11 Abraham Adesanya Rd', city: 'Lagos', state: 'Lagos' }, status: 'IN_TRANSIT', etaMinutesFromStart: 130, distanceFromPrevKm: 16.9 },
        { order: 4, deliveryId: 'del-11', deliveryNumber: 'DEL-100236', address: { label: 'Eleko', line1: 'KM 40 Lekki-Epe Expy', city: 'Lagos', state: 'Lagos' }, status: 'PENDING', etaMinutesFromStart: 187, distanceFromPrevKm: 11.2 },
      ],
    },
  ];

  private _deliveriesStore?: Delivery[];

  private get allDeliveries(): Delivery[] {
    if (!this._deliveriesStore) {
      this._deliveriesStore = this.buildMockDeliveries();
    }
    return this._deliveriesStore;
  }

  private buildMockDeliveries(): Delivery[] {
    const types: DeliveryType[] = ['BRANCH_TRANSFER', 'SUPPLIER_PURCHASE', 'CUSTOMER_DELIVERY', 'RETURN_DELIVERY', 'BULK_TRANSFER'];
    const priorities: DeliveryPriority[] = ['URGENT', 'HIGH', 'MEDIUM', 'LOW'];
    const customers = ['Adaeze Okoye', 'Bright Star Stores', 'Chinedu Eze', 'Femi Adigun', 'Golden Foods Ltd', 'Hauwa Bello', 'Prime Retailers'];
    const branches = ['Lekki Branch', 'Mushin Branch', 'Ikeja Branch', 'Warehouse A', 'Warehouse B'];

    const rows: { status: DeliveryStatus; type: DeliveryType; priority: DeliveryPriority; driverIdx: number }[] = [
      { status: 'DELIVERED', type: 'CUSTOMER_DELIVERY', priority: 'HIGH', driverIdx: 0 },
      { status: 'IN_TRANSIT', type: 'CUSTOMER_DELIVERY', priority: 'URGENT', driverIdx: 1 },
      { status: 'DISPATCHED', type: 'BRANCH_TRANSFER', priority: 'MEDIUM', driverIdx: 2 },
      { status: 'DELAYED', type: 'CUSTOMER_DELIVERY', priority: 'HIGH', driverIdx: 4 },
      { status: 'PENDING', type: 'SUPPLIER_PURCHASE', priority: 'LOW', driverIdx: -1 },
      { status: 'PACKING', type: 'BULK_TRANSFER', priority: 'MEDIUM', driverIdx: -1 },
      { status: 'PICKING', type: 'RETURN_DELIVERY', priority: 'LOW', driverIdx: -1 },
      { status: 'DELIVERED', type: 'CUSTOMER_DELIVERY', priority: 'MEDIUM', driverIdx: 6 },
      { status: 'ARRIVED', type: 'BRANCH_TRANSFER', priority: 'HIGH', driverIdx: 1 },
      { status: 'DELIVERED', type: 'CUSTOMER_DELIVERY', priority: 'URGENT', driverIdx: 0 },
      { status: 'CANCELLED', type: 'CUSTOMER_DELIVERY', priority: 'LOW', driverIdx: -1 },
      { status: 'IN_TRANSIT', type: 'BULK_TRANSFER', priority: 'MEDIUM', driverIdx: 4 },
      { status: 'DELIVERED', type: 'SUPPLIER_PURCHASE', priority: 'MEDIUM', driverIdx: 2 },
      { status: 'DELAYED', type: 'CUSTOMER_DELIVERY', priority: 'URGENT', driverIdx: 6 },
      { status: 'PENDING', type: 'CUSTOMER_DELIVERY', priority: 'HIGH', driverIdx: -1 },
      { status: 'DELIVERED', type: 'RETURN_DELIVERY', priority: 'LOW', driverIdx: 0 },
      { status: 'DISPATCHED', type: 'CUSTOMER_DELIVERY', priority: 'HIGH', driverIdx: 1 },
      { status: 'DELIVERED', type: 'CUSTOMER_DELIVERY', priority: 'MEDIUM', driverIdx: 2 },
    ];

    return rows.map((r, i) => {
      const driver = r.driverIdx >= 0 ? this.allDriversStore[r.driverIdx] : undefined;
      const num = 100230 + i * 3;
      const createdHoursAgo = 3 + i * 4;
      const created = new Date(Date.now() - createdHoursAgo * 3600 * 1000);
      const dest = customers[i % customers.length];
      const origin = branches[i % branches.length];
      const isCustomer = r.type === 'CUSTOMER_DELIVERY' || r.type === 'RETURN_DELIVERY';

      const timeline: import('../../domain/logistics/logistics.dto').DeliveryTimelineEvent[] = [
        { status: 'PENDING', label: 'Order created', timestamp: created.toISOString(), actor: 'System' },
      ];
      const order: DeliveryStatus[] = ['PENDING', 'PICKING', 'PACKING', 'DISPATCHED', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'];
      const currentIdx = order.indexOf(r.status);
      if (currentIdx > 0) {
        for (let s = 1; s <= currentIdx; s++) {
          timeline.push({
            status: order[s],
            label: order[s].replace('_', ' '),
            timestamp: new Date(created.getTime() + s * 35 * 60000).toISOString(),
            actor: driver?.name || 'Warehouse',
          });
        }
      }
      if (r.status === 'DELAYED') {
        timeline.push({ status: 'DELAYED', label: 'Delayed — traffic on route', timestamp: new Date(created.getTime() + 90 * 60000).toISOString(), actor: driver?.name });
      }
      if (r.status === 'CANCELLED') {
        timeline.push({ status: 'CANCELLED', label: 'Cancelled by customer', timestamp: new Date(created.getTime() + 20 * 60000).toISOString(), actor: 'System' });
      }

      return {
        id: `del-${i + 1}`,
        deliveryNumber: `DEL-${num}`,
        type: r.type,
        status: r.status,
        priority: r.priority,
        origin: { label: origin, line1: `${origin}, Warehouse Complex`, city: 'Lagos', state: 'Lagos' },
        destination: isCustomer
          ? { label: dest, line1: `${12 + i} Adeola Odeku St`, city: 'Lagos', state: 'Lagos', contactName: dest, contactPhone: `+234 80${i}1 234 5${(670 + i) % 900}` }
          : { label: branches[(i + 2) % branches.length], line1: `${branches[(i + 2) % branches.length]}, Zone ${i % 4 + 1}`, city: 'Lagos', state: 'Lagos' },
        linkedOrderRef: isCustomer ? `SO-${20250 + i}` : `PO-${18320 + i}`,
        linkedModule: isCustomer ? 'Sales' : (r.type === 'SUPPLIER_PURCHASE' ? 'Procurement' : 'Branch Management'),
        driverId: driver?.id,
        driverName: driver?.name,
        vehicleId: driver?.assignedVehicleId,
        vehiclePlate: driver?.assignedVehiclePlate,
        items: [
          { id: `it-${i}-1`, name: 'Packaged Goods Carton', sku: `SKU-${1000 + i}`, quantity: 4 + (i % 6), unit: 'ctn' },
          { id: `it-${i}-2`, name: 'Sealed Bundle', sku: `SKU-${2000 + i}`, quantity: 2 + (i % 3), unit: 'pcs' },
        ],
        itemCount: 6 + (i % 6),
        distanceKm: +(6 + (i * 2.3) % 24).toFixed(1),
        cost: 2500 + (i * 340) % 6000,
        createdAt: created.toISOString(),
        scheduledAt: new Date(created.getTime() + 30 * 60000).toISOString(),
        dispatchedAt: currentIdx >= 3 ? new Date(created.getTime() + 105 * 60000).toISOString() : undefined,
        eta: (r.status !== 'DELIVERED' && r.status !== 'CANCELLED') ? new Date(Date.now() + (25 + i * 5) * 60000).toISOString() : undefined,
        deliveredAt: r.status === 'DELIVERED' ? new Date(created.getTime() + 175 * 60000).toISOString() : undefined,
        timeline,
        proofOfDelivery: r.status === 'DELIVERED' ? { receivedBy: dest, deliveredAt: new Date(created.getTime() + 175 * 60000).toISOString(), notes: 'Received in good condition' } : undefined,
        currentLocation: (r.status === 'IN_TRANSIT' || r.status === 'DISPATCHED') ? { lat: 6.45 + (i % 5) * 0.01, lng: 3.4 + (i % 5) * 0.01 } : undefined,
        notes: r.status === 'DELAYED' ? 'Heavy traffic reported along Third Mainland Bridge.' : undefined,
      } as Delivery;
    });
  }
}

type VehicleFilterStatus = import('../../domain/logistics/logistics.dto').VehicleStatus | 'ALL';
