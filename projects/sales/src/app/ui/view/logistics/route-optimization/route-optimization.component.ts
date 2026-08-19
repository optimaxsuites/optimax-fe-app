import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { LogisticsService } from '../../../service/logistics/logistics.service';
import { DELIVERY_STATUS_META, DeliveryRoute } from '../../../domain/logistics/logistics.dto';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-route-optimization',
  templateUrl: './route-optimization.component.html',
  styleUrl: './route-optimization.component.scss'
})
export class RouteOptimizationComponent implements OnInit, OnDestroy {
  statusMeta = DELIVERY_STATUS_META;

  isLoading = true;
  routes: DeliveryRoute[] = [];
  selectedRoute?: DeliveryRoute;
  isOptimizing = false;

  private destroy$ = new Subject<void>();

  constructor(
    private logisticsService: LogisticsService,
    private messageService: MessageService,
  ) { }

  ngOnInit(): void {
    this.logisticsService.getRoutes().pipe(takeUntil(this.destroy$)).subscribe(routes => {
      this.routes = routes;
      this.selectedRoute = routes[0];
      this.isLoading = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  selectRoute(route: DeliveryRoute): void {
    this.selectedRoute = route;
  }

  optimize(): void {
    if (!this.selectedRoute || this.selectedRoute.optimized) return;
    this.isOptimizing = true;
    this.logisticsService.optimizeRoute(this.selectedRoute.id).subscribe({
      next: (updated) => {
        this.isOptimizing = false;
        if (updated) {
          this.selectedRoute = updated;
          const idx = this.routes.findIndex(r => r.id === updated.id);
          if (idx !== -1) this.routes[idx] = updated;
          this.messageService.add({ severity: 'success', summary: 'Route optimized', detail: `Saved ${this.distanceSavedPct()}% distance and ${this.timeSavedPct()}% time.` });
        }
      },
      error: () => { this.isOptimizing = false; }
    });
  }

  distanceSavedPct(): number {
    if (!this.selectedRoute?.totalDistanceKmBeforeOptimization) return 0;
    const before = this.selectedRoute.totalDistanceKmBeforeOptimization;
    const after = this.selectedRoute.totalDistanceKm;
    return Math.round(((before - after) / before) * 100);
  }

  timeSavedPct(): number {
    if (!this.selectedRoute?.estimatedDurationMinBeforeOptimization) return 0;
    const before = this.selectedRoute.estimatedDurationMinBeforeOptimization;
    const after = this.selectedRoute.estimatedDurationMin;
    return Math.round(((before - after) / before) * 100);
  }

  costSavedAmount(): number {
    if (!this.selectedRoute?.estimatedFuelCostBeforeOptimization) return 0;
    return this.selectedRoute.estimatedFuelCostBeforeOptimization - this.selectedRoute.estimatedFuelCost;
  }

  formatCurrency(v: number): string {
    return this.logisticsService.formatCurrency(v);
  }

  formatDuration(min: number): string {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  routeStatusColor(status: string): string {
    switch (status) {
      case 'DRAFT': return '#8a8f98';
      case 'OPTIMIZED': return '#2563eb';
      case 'ACTIVE': return '#16a34a';
      case 'COMPLETED': return '#6b7280';
      default: return '#8a8f98';
    }
  }
}
