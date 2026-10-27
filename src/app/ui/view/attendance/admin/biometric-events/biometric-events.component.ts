import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subject, interval } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AttendanceEventService } from '../../../../service/attendance/attendance-event.service';
import { AttendanceEventDTO } from '../../../../domain/attendance/attendance-event.dto';
import { AttendanceRecordService } from '../../../../service/attendance/attendance-record.service';
import { ToastService } from '../../../../shared-component/service/toast/toast.service';

@Component({
  selector: 'app-biometric-events',
  templateUrl: './biometric-events.component.html',
  styleUrl: './biometric-events.component.scss'
})
export class BiometricEventsComponent implements OnInit, OnDestroy {

  events: AttendanceEventDTO[] = [];
  isLoading = false;
  isProcessing = false;
  showUnprocessedOnly = false;

  totalSize = 0;
  currentPage = 1;
  readonly pageSize = 20;

  private destroy$ = new Subject<void>();

  constructor(
    private eventService: AttendanceEventService,
    private recordService: AttendanceRecordService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadEvents();
    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => this.loadEvents());
  }

  loadEvents(): void {
    this.isLoading = true;
    const obs$ = this.showUnprocessedOnly
      ? this.eventService.getUnprocessedEvents()
      : this.eventService.getEvents(this.currentPage, this.pageSize);

    obs$.pipe(takeUntil(this.destroy$)).subscribe({
      next: res => {
        this.events = res.content;
        this.totalSize = res.totalSize;
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  toggleFilter(unprocessedOnly: boolean): void {
    this.showUnprocessedOnly = unprocessedOnly;
    this.currentPage = 1;
    this.loadEvents();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.loadEvents();
  }

  get totalPages(): number {
    return Math.ceil(this.totalSize / this.pageSize) || 1;
  }

  processAll(): void {
    this.isProcessing = true;
    this.recordService.processUnhandledBiometricEvents().pipe(takeUntil(this.destroy$)).subscribe({
      next: count => {
        this.toast.success(`Processed ${count} biometric event(s) successfully`);
        this.isProcessing = false;
        this.loadEvents();
      },
      error: () => {
        this.toast.error('Failed to process biometric events');
        this.isProcessing = false;
      }
    });
  }

  employeeName(event: AttendanceEventDTO): string {
    const emp = event.employeeId as any;
    if (!emp) return event.employeeCode || '—';
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
    return name || event.employeeCode || '—';
  }

  toDate(value: any): Date | null {
    if (!value) return null;
    if (Array.isArray(value)) {
      const [y, mo, d, h = 0, m = 0, s = 0] = value;
      return new Date(y, mo - 1, d, h, m, s);
    }
    const dt = new Date(value);
    return isNaN(dt.getTime()) ? null : dt;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
