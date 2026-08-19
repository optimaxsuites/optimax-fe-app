import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { LogisticsService } from '../../../service/logistics/logistics.service';
import {
  DELIVERY_STATUS_FLOW,
  DELIVERY_STATUS_META,
  Delivery,
  Driver,
} from '../../../domain/logistics/logistics.dto';

@Component({
  selector: 'app-tracking',
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.scss',
})
export class TrackingComponent implements OnInit, OnDestroy {
  statusMeta = DELIVERY_STATUS_META;
  statusFlow = DELIVERY_STATUS_FLOW;

  searchTerm = '';
  isSearching = false;
  notFound = false;

  delivery?: Delivery;
  driver?: Driver;

  recentlyTracked: Delivery[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private logisticsService: LogisticsService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.logisticsService
      .getDeliveries({ page: 0, size: 5, status: 'IN_TRANSIT' })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => (this.recentlyTracked = res.data));

    const paramNumber = this.route.snapshot.paramMap.get('deliveryNumber');
    if (paramNumber) {
      this.searchTerm = paramNumber;
      this.track();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  track(): void {
    if (!this.searchTerm.trim()) return;
    this.isSearching = true;
    this.notFound = false;
    this.logisticsService
      .trackByDeliveryNumber(this.searchTerm.trim())
      .pipe(takeUntil(this.destroy$))
      .subscribe((res) => {
        this.isSearching = false;
        if (!res) {
          this.notFound = true;
          this.delivery = undefined;
          return;
        }
        this.delivery = res;
        this.driver = undefined;
        if (res.driverId) {
          this.logisticsService
            .getDriverById(res.driverId)
            .pipe(takeUntil(this.destroy$))
            .subscribe((d) => (this.driver = d));
        }
      });
  }

  quickTrack(d: Delivery): void {
    this.searchTerm = d.deliveryNumber;
    this.track();
  }

  currentStepIndex(): number {
    if (!this.delivery) return -1;
    return this.statusFlow.indexOf(this.delivery.status);
  }

  isStepDone(step: string): boolean {
    if (!this.delivery) return false;
    const idx = this.statusFlow.indexOf(step as any);
    return idx <= this.currentStepIndex() && this.delivery.status !== 'CANCELLED';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-NG', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  minutesToEta(): number | null {
    if (!this.delivery?.eta) return null;
    return Math.max(0, Math.round((new Date(this.delivery.eta).getTime() - Date.now()) / 60000));
  }
}
