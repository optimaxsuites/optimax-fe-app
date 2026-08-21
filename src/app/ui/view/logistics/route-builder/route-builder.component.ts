import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subject, takeUntil } from 'rxjs';
import { LogisticsService } from '../../../service/logistics/logistics.service';
import { BatchStatus, DeliveryBatch, GeoPoint, Order, RouteStop } from '../../../domain/logistics/logistics.dto';

type BuilderView = 'choose' | 'build';
type BuildSubTab = 'stops' | 'map';

interface Toast {
  id: number;
  message: string;
}

@Component({
  selector: 'app-route-builder',
  templateUrl: './route-builder.component.html',
  styleUrl: './route-builder.component.scss'
})
export class RouteBuilderComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  view: BuilderView = 'choose';
  buildSubTab: BuildSubTab = 'stops';

  readonly BatchStatus = BatchStatus;

  // ---------------- Choose Orders ----------------
  pool: Order[] = [];
  filteredPool: Order[] = [];
  searchTerm = '';
  selectedOrderIds = new Set<string>();
  isPoolLoading = true;
  claimLimit = 15;
  currentLoad = 0;
  claimLimitMessage: string | null = null;
  isClaiming = false;

  // ---------------- Build Route ----------------
  myBatch: DeliveryBatch | null = null;
  isBatchLoading = true;
  isSubmitting = false;
  private dragFromIndex: number | null = null;

  activeOrderId: string | null = null;

  toasts: Toast[] = [];
  private toastCounter = 0;

  constructor(private logisticsService: LogisticsService) {}

  ngOnInit(): void {
    this.loadPool();
    this.loadBatch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setView(view: BuilderView): void {
    this.view = view;
  }

  setBuildSubTab(tab: BuildSubTab): void {
    this.buildSubTab = tab;
  }

  // ============================================================
  // VIEW 1 — CHOOSE ORDERS
  // ============================================================

  loadPool(): void {
    this.isPoolLoading = true;
    this.logisticsService
      .getRiderAvailablePool()
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.pool = res.orders;
        this.claimLimit = res.claimLimit;
        this.currentLoad = res.currentLoad;
        this.isPoolLoading = false;
        this.applyFilter();
      });
  }

  onSearchChange(value: string): void {
    this.searchTerm = value;
    this.applyFilter();
  }

  private applyFilter(): void {
    const q = this.searchTerm.trim().toLowerCase();
    this.filteredPool = !q
      ? this.pool
      : this.pool.filter(
          (o) =>
            o.orderId.toLowerCase().includes(q) ||
            o.customerName.toLowerCase().includes(q) ||
            (o.area || '').toLowerCase().includes(q) ||
            o.deliveryLocation.toLowerCase().includes(q)
        );
  }

  toggleSelect(order: Order): void {
    if (this.selectedOrderIds.has(order.id)) this.selectedOrderIds.delete(order.id);
    else this.selectedOrderIds.add(order.id);
  }

  isSelected(order: Order): boolean {
    return this.selectedOrderIds.has(order.id);
  }

  get selectedCount(): number {
    return this.selectedOrderIds.size;
  }

  get wouldExceedLimit(): boolean {
    return this.currentLoad + this.selectedCount > this.claimLimit;
  }

  initials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '?';
  }

  addToMyRoute(): void {
    if (!this.selectedOrderIds.size) return;
    if (this.wouldExceedLimit) {
      this.claimLimitMessage = `You've reached your active order limit (${this.claimLimit}). Deliver some before claiming more.`;
      return;
    }
    this.claimLimitMessage = null;
    this.isClaiming = true;
    const ids = Array.from(this.selectedOrderIds);
    this.logisticsService
      .claimOrders(ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (batch) => {
          this.myBatch = batch;
          this.pool = this.pool.filter((o) => !this.selectedOrderIds.has(o.id));
          this.applyFilter();
          this.currentLoad += ids.length;
          this.selectedOrderIds.clear();
          this.isClaiming = false;
          this.pushToast(`${ids.length} order${ids.length === 1 ? '' : 's'} added to your route`);
          this.view = 'build';
          this.autoSelectActiveStop();
        },
        error: () => {
          this.isClaiming = false;
          this.claimLimitMessage = `You've reached your active order limit (${this.claimLimit}). Deliver some before claiming more.`;
        }
      });
  }

  // ============================================================
  // VIEW 2 — BUILD ROUTE
  // ============================================================

  loadBatch(): void {
    this.isBatchLoading = true;
    this.logisticsService
      .getMyBatch()
      .pipe(takeUntil(this.destroy$))
      .subscribe((batch) => {
        this.myBatch = batch;
        this.isBatchLoading = false;
        this.autoSelectActiveStop();
      });
  }

  private autoSelectActiveStop(): void {
    if (!this.myBatch) {
      this.activeOrderId = null;
      return;
    }
    const stillValid = this.myBatch.proposedRoute.some((s) => s.orderId === this.activeOrderId);
    if (!stillValid) {
      const firstUnconfirmed = this.myBatch.proposedRoute.find((s) => !s.locationConfirmed);
      this.activeOrderId = firstUnconfirmed?.orderId ?? null;
    }
  }

  selectStopForPin(stop: RouteStop): void {
    if (!this.isBatchEditable) return;
    this.activeOrderId = stop.orderId;
    this.buildSubTab = 'map';
  }

  onMapLocationPicked(point: GeoPoint): void {
    if (!this.activeOrderId) return;
    const orderId = this.activeOrderId;
    this.logisticsService
      .confirmStopLocation(orderId, point)
      .pipe(takeUntil(this.destroy$))
      .subscribe((batch) => {
        this.myBatch = batch;
        this.pushToast('Location confirmed');
        const next = batch?.proposedRoute.find((s) => !s.locationConfirmed && s.orderId !== orderId);
        this.activeOrderId = next?.orderId ?? null;
      });
  }

  get isBatchEditable(): boolean {
    return !this.myBatch || this.myBatch.status === BatchStatus.CLAIMING;
  }

  get confirmedStops(): RouteStop[] {
    return this.myBatch?.proposedRoute.filter((s) => s.locationConfirmed) ?? [];
  }

  get unconfirmedCount(): number {
    return (this.myBatch?.proposedRoute.length ?? 0) - this.confirmedStops.length;
  }

  // ---- Reordering: drag-and-drop (desktop) + up/down buttons (touch fallback) ----

  onDragStart(index: number): void {
    this.dragFromIndex = index;
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(index: number): void {
    if (this.dragFromIndex === null || this.dragFromIndex === index || !this.myBatch) return;
    const stops = [...this.myBatch.proposedRoute];
    const [moved] = stops.splice(this.dragFromIndex, 1);
    stops.splice(index, 0, moved);
    this.dragFromIndex = null;
    this.persistOrder(stops.map((s) => s.orderId));
  }

  moveStop(index: number, direction: -1 | 1): void {
    if (!this.myBatch) return;
    const stops = [...this.myBatch.proposedRoute];
    const target = index + direction;
    if (target < 0 || target >= stops.length) return;
    [stops[index], stops[target]] = [stops[target], stops[index]];
    this.persistOrder(stops.map((s) => s.orderId));
  }

  private persistOrder(orderedIds: string[]): void {
    this.logisticsService
      .reorderBatch(orderedIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe((batch) => {
        this.myBatch = batch;
      });
  }

  removeStop(stop: RouteStop): void {
    this.logisticsService
      .removeFromBatch(stop.orderId)
      .pipe(takeUntil(this.destroy$))
      .subscribe((batch) => {
        this.myBatch = batch;
        this.currentLoad = Math.max(0, this.currentLoad - 1);
        this.pushToast(`${stop.orderDisplayId} released back to the pool`);
        this.loadPool();
        this.autoSelectActiveStop();
      });
  }

  // ---- Location confirmation (handled inline via app-route-builder-map) ----

  submitForApproval(): void {
    if (!this.myBatch || !this.myBatch.proposedRoute.length) return;
    this.isSubmitting = true;
    this.logisticsService
      .submitBatchForApproval()
      .pipe(takeUntil(this.destroy$))
      .subscribe((batch) => {
        this.myBatch = batch;
        this.isSubmitting = false;
        this.pushToast('Route submitted — waiting for admin approval.');
      });
  }

  private pushToast(message: string): void {
    const id = ++this.toastCounter;
    this.toasts.push({ id, message });
    setTimeout(() => {
      this.toasts = this.toasts.filter((t) => t.id !== id);
    }, 3500);
  }
}
