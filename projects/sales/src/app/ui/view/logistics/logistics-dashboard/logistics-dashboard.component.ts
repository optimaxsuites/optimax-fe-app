import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject, forkJoin, takeUntil } from 'rxjs';
import { LogisticsService } from '../../../service/logistics/logistics.service';
import { TableColumn } from '../../../shared-component/view/table/table.component';
import {
  Delivery,
  DELIVERY_PRIORITY_META,
  DELIVERY_STATUS_META,
  Driver,
  LogisticsDashboardSummary,
  Vehicle,
} from '../../../domain/logistics/logistics.dto';

type RangeOption = 'today' | 'week' | 'month';

@Component({
  selector: 'app-logistics-dashboard',
  templateUrl: './logistics-dashboard.component.html',
  styleUrl: './logistics-dashboard.component.scss',
})
export class LogisticsDashboardComponent implements OnInit, OnDestroy {
  statusMeta = DELIVERY_STATUS_META;
  priorityMeta = DELIVERY_PRIORITY_META;

  isLoading = true;
  range: RangeOption = 'month';

  summary?: LogisticsDashboardSummary;
  recentDeliveries: Delivery[] = [];
  attentionDeliveries: Delivery[] = [];
  fleetAlerts: { label: string; detail: string; severity: 'critical' | 'warning' }[] = [];

  recentDeliveryColumns: TableColumn[] = [
    { header: 'Delivery' },
    { header: 'Destination' },
    { header: 'Driver' },
    { header: 'Status' },
    { header: 'Priority' },
    { header: 'Updated' },
  ];

  // Typed accessors for use inside the app-table row template (see note in
  // delivery-management.component.ts for why direct indexing there fails
  // strict template type-checking).
  statusColor(status: Delivery['status']): string {
    return this.statusMeta[status].color;
  }
  statusLabel(status: Delivery['status']): string {
    return this.statusMeta[status].label;
  }
  priorityColor(priority: Delivery['priority']): string {
    return this.priorityMeta[priority].color;
  }
  priorityLabel(priority: Delivery['priority']): string {
    return this.priorityMeta[priority].label;
  }

  private destroy$ = new Subject<void>();

  constructor(
    private logisticsService: LogisticsService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  changeRange(range: RangeOption): void {
    this.range = range;
    this.loadAll();
  }

  private loadAll(): void {
    this.isLoading = true;
    forkJoin({
      summary: this.logisticsService.getDashboardSummary(),
      recent: this.logisticsService.getDeliveries({ page: 0, size: 8 }),
      vehicles: this.logisticsService.getVehicles(),
      drivers: this.logisticsService.getDrivers(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ summary, recent, vehicles, drivers }) => {
          this.summary = summary;
          this.recentDeliveries = recent.data;
          this.attentionDeliveries = recent.data
            .filter((d) => d.status === 'DELAYED' || d.priority === 'URGENT')
            .slice(0, 5);
          this.fleetAlerts = this.buildFleetAlerts(vehicles, drivers);
          this.isLoading = false;
        },
        error: () => {
          this.isLoading = false;
        },
      });
  }

  private buildFleetAlerts(
    vehicles: Vehicle[],
    drivers: Driver[],
  ): { label: string; detail: string; severity: 'critical' | 'warning' }[] {
    const alerts: { label: string; detail: string; severity: 'critical' | 'warning' }[] = [];
    vehicles.forEach((v) => {
      if (v.status === 'OUT_OF_SERVICE') {
        alerts.push({
          label: v.plateNumber,
          detail: `${v.name} is out of service`,
          severity: 'critical',
        });
      } else if (v.status === 'MAINTENANCE') {
        alerts.push({
          label: v.plateNumber,
          detail: `Undergoing scheduled maintenance`,
          severity: 'warning',
        });
      }
      v.documents.forEach((doc) => {
        if (doc.status === 'expired')
          alerts.push({
            label: v.plateNumber,
            detail: `${doc.name} has expired`,
            severity: 'critical',
          });
        else if (doc.status === 'expiring')
          alerts.push({
            label: v.plateNumber,
            detail: `${doc.name} expires soon`,
            severity: 'warning',
          });
      });
    });
    drivers.forEach((d) => {
      const daysToExpiry = Math.ceil(
        (new Date(d.licenseExpiry).getTime() - Date.now()) / (1000 * 3600 * 24),
      );
      if (daysToExpiry < 60)
        alerts.push({
          label: d.name,
          detail: `Driver's license expires in ${daysToExpiry} days`,
          severity: daysToExpiry < 14 ? 'critical' : 'warning',
        });
    });
    return alerts.slice(0, 6);
  }

  formatRelativeTime(iso?: string): string {
    if (!iso) return '—';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.round(hrs / 24)}d ago`;
  }

  goToDelivery(delivery: Delivery): void {
    this.router.navigate(['/admin/logistics/track', delivery.deliveryNumber]);
  }

  goToDeliveries(): void {
    this.router.navigate(['/admin/logistics/deliveries']);
  }

  goToFleet(): void {
    this.router.navigate(['/admin/logistics/fleet']);
  }
}
