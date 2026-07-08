import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { RemoteAttendanceService } from '../../../../service/attendance/remote-attendance.service';
import { FraudDetectionFlags } from '../../../../domain/attendance/remote-attendance.dto';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-fraud-detection-dashboard',
  templateUrl: './fraud-detection-dashboard.component.html',
  styleUrl: './fraud-detection-dashboard.component.scss'
})
export class FraudDetectionDashboardComponent implements OnInit, OnDestroy {
  private remoteService = inject(RemoteAttendanceService);
  private destroy$ = new Subject<void>();

  pendingFlags: FraudDetectionFlags[] = [];
  dashboardStats: any = {};
  isLoading: boolean = true;
  errorMessage: string = '';
  selectedFlag: FraudDetectionFlags | null = null;
  filterBySeverity: string = '';
  filterByType: string = '';

  severityColors: { [key: string]: string } = {
    'LOW': '#ffc107',
    'MEDIUM': '#fd7e14',
    'HIGH': '#dc3545'
  };

  flagTypes = [
    { id: 'SUSPICIOUS_LOCATION', label: 'Suspicious Location', icon: 'fa-map-marker-alt' },
    { id: 'VPN_DETECTED', label: 'VPN Detected', icon: 'fa-shield-alt' },
    { id: 'RAPID_LOCATION_CHANGE', label: 'Rapid Location Change', icon: 'fa-bolt' },
    { id: 'NEW_DEVICE', label: 'New Device', icon: 'fa-laptop' }
  ];

  supervisorId: number = 1; // Should come from session

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.remoteService.getPendingFraudReviews(this.supervisorId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (flags) => {
          this.pendingFlags = flags;
          this.isLoading = false;
        },
        error: (err) => {
          this.errorMessage = 'Failed to load fraud detection data';
          this.isLoading = false;
          console.error(err);
        }
      });

    this.remoteService.getFraudDetectionDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.dashboardStats = stats;
        },
        error: (err) => {
          console.error('Failed to load stats:', err);
        }
      });
  }

  selectFlag(flag: FraudDetectionFlags): void {
    this.selectedFlag = flag;
  }

  approveFraudFlag(flag: FraudDetectionFlags): void {
    this.remoteService.reviewFraudFlag(
      flag.flagId,
      flag.recordId,
      this.supervisorId,
      'APPROVED',
      'Legitimate activity'
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingFlags = this.pendingFlags.filter(f => f.flagId !== flag.flagId);
          this.selectedFlag = null;
        },
        error: (err) => {
          this.errorMessage = 'Failed to approve flag';
          console.error(err);
        }
      });
  }

  rejectFraudFlag(flag: FraudDetectionFlags, reason: string): void {
    this.remoteService.reviewFraudFlag(
      flag.flagId,
      flag.recordId,
      this.supervisorId,
      'REJECTED',
      reason
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingFlags = this.pendingFlags.filter(f => f.flagId !== flag.flagId);
          this.selectedFlag = null;
        },
        error: (err) => {
          this.errorMessage = 'Failed to reject flag';
          console.error(err);
        }
      });
  }

  escalateFraudFlag(flag: FraudDetectionFlags): void {
    this.remoteService.reviewFraudFlag(
      flag.flagId,
      flag.recordId,
      this.supervisorId,
      'ESCALATED',
      'Escalated to HR for further investigation'
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.pendingFlags = this.pendingFlags.filter(f => f.flagId !== flag.flagId);
          this.selectedFlag = null;
        },
        error: (err) => {
          this.errorMessage = 'Failed to escalate flag';
          console.error(err);
        }
      });
  }

  getFilteredFlags(): FraudDetectionFlags[] {
    return this.pendingFlags.filter(flag => {
      const severityMatch = !this.filterBySeverity || flag.severity === this.filterBySeverity;
      const typeMatch = !this.filterByType || flag.flagType === this.filterByType;
      return severityMatch && typeMatch;
    });
  }

  getFlagTypeLabel(flagType: string): string {
    return this.flagTypes.find(ft => ft.id === flagType)?.label || flagType;
  }

  getFlagTypeIcon(flagType: string): string {
    return this.flagTypes.find(ft => ft.id === flagType)?.icon || 'fa-flag';
  }

  getSeverityBadgeClass(severity: string): string {
    switch (severity) {
      case 'HIGH':
        return 'badge-danger';
      case 'MEDIUM':
        return 'badge-warning';
      case 'LOW':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getPendingCount(): number {
    return this.pendingFlags.length;
  }

  getHighSeverityCount(): number {
    return this.pendingFlags.filter(f => f.severity === 'HIGH').length;
  }

  refreshDashboard(): void {
    this.loadDashboard();
  }
}
