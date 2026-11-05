import { Component, inject, OnInit, Output, EventEmitter, HostListener, ChangeDetectorRef, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import { CorrectionRequest } from '../../../../../domain/attendance/correctionrequest.dto';
import { map, Observable, of, switchMap } from 'rxjs';
import * as L from 'leaflet';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { UserSessionService } from '../../../../../service/attendance/user-session.service';
import { ApprovalStatus, FlagType } from '../../../../../domain/attendance/attendance-event.dto';
import { TableColumn, TableAction } from '../../../../../shared-component/view/table/table.component';
import { ToastService } from '../../../../../shared-component/service/toast/toast.service';
import { AdminCorrectionApprovalService } from '../../../../../service/attendance/admin-correction-approval.service';
import { CrossBranchApprovalService } from '../../../../../service/attendance/cross-branch-approval.service';
import { CrossBranchAttendanceService } from '../../../../../service/attendance/cross-branch-attendance.service';
import { environment } from '../../../../../shared-component/environments/environment.prod';

@Component({
  selector: 'app-attendancetable',
  templateUrl: './attendancetable.component.html',
  styleUrl: './attendancetable.component.scss'
})
export class AttendancetableComponent implements OnInit, OnChanges {

  private attendancetableService = inject(AttendancetableService);
  private userSession = inject(UserSessionService);
  private toastService = inject(ToastService);
  private correctionRequestService = inject(AdminCorrectionApprovalService);
  private crossBranchApprovalService = inject(CrossBranchApprovalService);
  private crossBranchAttendanceService = inject(CrossBranchAttendanceService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];
  isLoading = true;
  private preservedCorrections: Map<number, any> = new Map();

  @Input() externalFilters: AttendanceTableRecord[] | null = null;

  openActionMenu: number | null = null;
  selectedRecords: Set<number> = new Set();
  showMassApproveConfirm = false;

  toggleActionMenu(recordId: number): void {
    this.openActionMenu = this.openActionMenu === recordId ? null : recordId;
  }

  editingRecord: AttendanceTableRecord | null = null;
  detailsRecord: AttendanceTableRecord | null = null;

editStatus: AttendanceTableRecord['status'] = 'PRESENT';
editCheckIn: string | null = null;
editCheckOut: string | null = null;
editReason = '';
originalCheckIn: string | null = null;
originalCheckOut: string | null = null;

// Modification & Approval tracking
modificationFlags: Map<number, { flagType: FlagType; approvalStatus: ApprovalStatus }> = new Map();
approverNotes: Map<number, string> = new Map();

// Shared Table Configuration (headers only - content defined in custom body template)
tableColumns: TableColumn<AttendanceTableRecord>[] = [
  { header: 'Employee', field: 'employee', sortable: true },
  { header: 'Department', field: 'department', sortable: true },
  { header: 'Date', field: 'date', sortable: true },
  { header: 'Location', field: 'checkInLocation.address', sortable: false },
  { header: 'Clock In', field: 'checkIn', sortable: true },
  { header: 'Clock Out', field: 'checkOut', sortable: true },
  { header: 'Status', field: 'status', sortable: true },
  { header: 'Hours', field: 'hours', sortable: true },
  { header: 'Flags', field: 'flags', sortable: false }
];

tableActions: TableAction<AttendanceTableRecord>[] = [
  {
    id: 'details',
    label: 'View',
    icon: 'fa-solid fa-eye',
    ariaLabel: 'View attendance details',
    visible: () => true
  }
];


mapModalOpen = false;
mapAddress = '';
mapDistance: number | null = null;
private mapInstance: L.Map | null = null;
 private officeHoursService = inject(OfficeHoursService);

 private closingTimer: any;

selectedLocation: { recordId: AttendanceTableRecord['id']; type: 'in' | 'out' } | null = null;

  @Output() dataChange = new EventEmitter<{ data: AttendanceTableRecord[], filters: any }>();
 
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['externalFilters'] && this.externalFilters) {
      this.filteredAttendance = this.withCorrections([...this.externalFilters]);
      this.cdr.markForCheck();
    }
  }

  ngOnInit(): void {
      this.startClosingWatcher();
      this.isLoading = true;

      // Subscribe to total records count
      this.attendancetableService.totalRecords$.subscribe(total => {
        this.totalRecords = total;
        this.cdr.detectChanges();
      });

      // Subscribe to real-time updates from service
      this.attendancetableService.attendance$.subscribe(data => {
        this.attendance = this.withCorrections(data);
        this.filteredAttendance = [...this.attendance];
        this.isLoading = false;
        this.dataChange.emit({
          data: this.filteredAttendance,
          filters: this.filters
        });
        this.cdr.detectChanges();
      });

      // Initialize and subscribe to correction requests
      // Load any saved corrections from localStorage
      const savedCorrections = JSON.parse(localStorage.getItem('correctionRequests') || '[]') as AttendanceTableRecord[];
      if (savedCorrections.length > 0) {
        savedCorrections.forEach(corrRecord => {
          const index = this.attendance.findIndex(a => a.id === corrRecord.id);
          if (index > -1) {
            this.attendance[index] = {
              ...this.attendance[index],
              correctionRequest: corrRecord.correctionRequest
            };
          }
        });
        this.filteredAttendance = [...this.attendance];
        this.cdr.detectChanges();
      }

      // Subscribe to correction requests and merge with attendance
      this.correctionRequestService.correctionRequests$.subscribe(correctionRequests => {
        this.latestCorrections = correctionRequests;
        this.attendance = this.withCorrections(this.attendance);

        this.filteredAttendance = [...this.attendance];
        this.dataChange.emit({
          data: this.filteredAttendance,
          filters: this.filters
        });
        this.cdr.detectChanges();
      });
  }

  private latestCorrections: CorrectionRequest[] = [];

  // Attendance refreshes replace the records, so corrections must be re-applied each time.
  private withCorrections(records: AttendanceTableRecord[]): AttendanceTableRecord[] {
    return records.map(record => {
      const corr = this.latestCorrections.find(c =>
        c.employeeId === record.employeeId &&
        !!record.date && !!c.date &&
        new Date(record.date).toDateString() === new Date(c.date).toDateString()
      );
      if (!corr) return record;
      let result: AttendanceTableRecord = record;

      // An approved correction replaces the clock times, so the status is recomputed from them.
      if (corr.status === 'SUBMITTED' && (corr.requestedClockIn || corr.requestedClockOut)) {
        const pad = (n: number) => String(n).padStart(2, '0');
        const time = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
        result = this.attendancetableService.recalculateStatus({
          ...record,
          checkIn: corr.requestedClockIn ? time(corr.requestedClockIn) : record.checkIn,
          checkOut: corr.requestedClockOut ? time(corr.requestedClockOut) : record.checkOut
        });
      }

      return {
        ...result,
        correctionRequest: {
          id: parseInt(corr.id),
          type: corr.correctionType,
          reason: corr.description || '',
          status: corr.status,
          requestedAt: corr.date,
          requestedBy: corr.employeeName,
          requestedClockIn: corr.requestedClockIn,
          requestedClockOut: corr.requestedClockOut
        }
      };
    });
  }

  private mergePreservedCorrections(): void {
    if (this.preservedCorrections.size === 0) {
      return;
    }

    let merged = false;
    this.preservedCorrections.forEach((correction, recordId) => {
      const index = this.attendance.findIndex(a => a.id === recordId);
      if (index > -1) {
        this.attendance[index].correctionRequest = correction;
        merged = true;
      }
    });

    if (merged) {
      this.applyFilters();
    }
  }

isToday(date: string | null): boolean {
  if (!date) return false;
  
  const today = this.formatDateLocal(new Date());
  return date === today;
}

isOfficeClosed(): boolean {

  const officeHours = this.officeHoursService.getOfficeHours();

  const [hour, minute] = officeHours.closingTime.split(':').map(Number);

  const closing = new Date();
  closing.setHours(hour, minute, 0, 0);

  return new Date() >= closing;
}

private startClosingWatcher() {

  this.closingTimer = setInterval(() => {

    // force change detection
    this.filteredAttendance = [...this.filteredAttendance];

  }, 60000); // check every minute
}

openAttendance(record: AttendanceTableRecord) {
  record.overrideOpen = true;
  const actorUserId = parseInt(sessionStorage.getItem('userid') ?? '0')
  this.attendancetableService.openAttendanceForToday(
    record.employeeId ?? '',
    actorUserId,
  //parseInt(sessionStorage.getItem('userid') ?? '0'), //userid from session
'Attendance opened by admin' //reason
);
  this.toastService.success(`✅ Attendance opened for ${record.employee}`);
}

openLocationMap(record: AttendanceTableRecord, type: 'in' | 'out') {
  const location = type === 'in'
  ? record.checkInLocation
  : record.checkOutLocation;

  if (!location) {

    return;
  }

  //guard since lat and long of location arent gotten from API
  // Records loaded from API have lat: 0, lng: 0 — can't map those
  if (location.lat === 0 && location.lng === 0) {
    alert(`Location: ${location.address}\n(Map view not available for this record)`);
    return;
  }


  this.selectedLocation = { recordId: record.id, type };
  this.mapAddress = location.address;
  this.mapModalOpen = true;

  // Increased timeout to ensure modal is rendered before initializing map
  setTimeout(() => {

    this.initMap(location.lat, location.lng);
  }, 300);
}

// helper method
private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return +(R * c).toFixed(2);
}

private async initMap(empLat: number, empLng: number) {
  if (this.mapInstance) {
    this.mapInstance.remove();
    this.mapInstance = null;
  }

  const officeHours = this.officeHoursService.getOfficeHours();

  //const hasCompany = officeHours?.companyLatitude && officeHours?.companyLongitude;

  this.mapInstance = L.map('leaflet-map').setView([empLat, empLng], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(this.mapInstance);

  // Employee marker
  const empMarker = L.marker([empLat, empLng]).addTo(this.mapInstance);
  empMarker.bindPopup('🧑 Employee location').openPopup();

  // Company marker + Line
  if (officeHours.companyLatitude && officeHours.companyLongitude) {

    const compLat = officeHours.companyLatitude;
    const compLng = officeHours.companyLongitude;

    L.marker([compLat, compLng],
      { icon: L.divIcon({ className: 'company-marker', html: '🏢', iconSize: [30, 30] }) }
    ).addTo(this.mapInstance)
    .bindPopup(`🏢 ${officeHours.companyName ?? 'Company'}`);

    // Draw a line between them
    L.polyline(
      [[empLat, empLng], [compLat, compLng]],
      { color: '#10b981', weight: 2, dashArray: '6, 6' }
    ).addTo(this.mapInstance);

    // Calculate distance here
    this.mapDistance = this.calculateDistance(
      empLat,
      empLng,
      compLat,
      compLng
    );

    // Fit both markers in view
    this.mapInstance.fitBounds([
      [empLat, empLng],
      [compLat, compLng]
    ], { padding: [40, 40] });
  } else {
    this.mapDistance = null;
  }

  setTimeout(() => {
    this.mapInstance?.invalidateSize();
  }, 0);
}

closeMap() {
  this.mapModalOpen = false;
  this.selectedLocation = null;
  if (this.mapInstance) {
    this.mapInstance.remove();
    this.mapInstance = null;
  }
}

filters: any = {
    dateFrom: '',
    dateTo: '',
    id: '',
    employee: '',
    department: '',
    status: '',
    branch: '',
    correctionStatus: ''
  };

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalRecords = 0;
  pageSizeOptions = [10, 25, 50, 100];

onFiltersChange(filters: any) {
  this.filters = { ...this.filters, ...filters };

  // Reset to first page when filters change
  this.currentPage = 1;

  const hasDateRange = filters.dateFrom && filters.dateTo;
  const hasOtherFilters = filters.id || filters.employee || filters.department || filters.status;

  if (!filters.dateFrom && !filters.dateTo && !hasOtherFilters) {
    // No filters at all — reload fresh from API with pagination
    this.attendancetableService.fetchAllRecords(this.currentPage, this.pageSize);
    return;
  }

  if (hasDateRange) {
    // Use the date range API endpoint with pagination, then apply remaining filters client-side
    this.attendancetableService.fetchByDateRange(filters.dateFrom, filters.dateTo, this.currentPage, this.pageSize);
    // applyFilters() will be triggered automatically by the attendance$ subscription
  } else {
    // No date range — filter client-side only
    this.applyFilters();
  }

  /*const hasFilters =
    filters.dateFrom ||
    filters.dateTo ||
    filters.id ||
    filters.employee ||
    filters.department ||
    filters.status;

  if (!hasFilters) {
    this.resetToToday();
  } else {
    this.applyFilters();
  }*/
}

resetToToday() {
  const today = this.formatDateLocal(new Date());

  const todayRecords = this.attendance.filter(record => record.date ? this.formatDateLocal(record.date) === today : false);

  // If no records for today, show all records
  this.filteredAttendance = todayRecords.length > 0 ? todayRecords : this.attendance;

  this.populateCalculatedFields();



  this.dataChange.emit({
    data: this.filteredAttendance,
  filters: this.filters
});
}

  // Pagination Methods
  onPageChange(event: any): void {
    this.currentPage = event.pageIndex + 1; // Angular Material paginator is 0-indexed
    this.pageSize = event.pageSize;
    this.loadPageData();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.currentPage = 1; // Reset to first page
    this.loadPageData();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.getTotalPages()) {
      this.currentPage = page;
      this.loadPageData();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.getTotalPages()) {
      this.currentPage++;
      this.loadPageData();
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadPageData();
    }
  }

  getTotalPages(): number {
    return Math.ceil(this.totalRecords / this.pageSize);
  }

  getStartRecord(): number {
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  getEndRecord(): number {
    const end = this.currentPage * this.pageSize;
    return end > this.totalRecords ? this.totalRecords : end;
  }

  private loadPageData(): void {
    const hasDateRange = this.filters.dateFrom && this.filters.dateTo;

    if (hasDateRange) {
      this.attendancetableService.fetchByDateRange(
        this.filters.dateFrom,
        this.filters.dateTo,
        this.currentPage,
        this.pageSize
      );
    } else {
      this.attendancetableService.fetchAllRecords(this.currentPage, this.pageSize);
    }
  }

private formatDateLocal(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

applyFilters() {
  this.filteredAttendance = this.attendance.filter(record => {

    const recordDate = record.date ?? '';

    // Date period filter
    if (this.filters.dateFrom && recordDate < this.filters.dateFrom) return false;
    if (this.filters.dateTo && recordDate > this.filters.dateTo) return false;

    // Employee ID
    if (this.filters.id &&
        !record.id.toString().includes(this.filters.id)) {
      return false;
    }

    // Employee Name
    if (this.filters.employee &&
        !record.employee.toLowerCase().includes(this.filters.employee.toLowerCase())) {
      return false;
    }

    // Department
    if (this.filters.department &&
        record.department !== this.filters.department) {
      return false;
    }

    // Branch
    if (this.filters.branch) {
      const branchId = parseInt(this.filters.branch);
      if (record.checkedInBranchId !== branchId) {
        return false;
      }
    }

    // Status
    if (this.filters.status &&
        record.status !== this.filters.status) {
      return false;
    }

    // Correction Request Filter
    if (this.filters.correctionStatus) {
      switch (this.filters.correctionStatus) {
        case 'HAS_PENDING':
          if (!record.correctionRequest || record.correctionRequest.status !== 'PENDING') {
            return false;
          }
          break;
        case 'HAS_APPROVED':
          if (!record.correctionRequest || record.correctionRequest.status !== 'SUBMITTED') {
            return false;
          }
          break;
        case 'HAS_REJECTED':
          if (!record.correctionRequest || record.correctionRequest.status !== 'REJECTED') {
            return false;
          }
          break;
        case 'NO_REQUEST':
          if (record.correctionRequest) {
            return false;
          }
          break;
      }
    }

    return true;
  });

  this.populateCalculatedFields();

  this.dataChange.emit({
    data: this.filteredAttendance,
  filters: this.filters});
}

openModifyForm(record: AttendanceTableRecord) {

  this.editingRecord = record;

  this.editStatus = record.status;
  this.editCheckIn = record.checkIn;
  this.editReason = record.overrideReason ?? '';
}

cancelEdit() {
  this.editingRecord = null;
  this.toastService.info('Changes cancelled');
}

@HostListener('document:keydown.escape')
onEscapeKey() {
  if (this.editingRecord) {
    this.cancelEdit();
  }
  if (this.detailsRecord) {
    this.closeDetails();
  }
  if (this.mapModalOpen) {
    this.closeMap();
  }
}

saveModification() {
  if (!this.editingRecord) return;

  if (!this.editReason || !this.editReason.trim()) {
    alert('Reason for modification is required.');
    return;
  }

  if (this.editReason.trim().length < 5) {
    alert('Reason must be at least 5 characters.');
    return;
  }

  const currentUser = this.userSession.getCurrentUser();
  if (!currentUser) {
    this.toastService.error('No logged in user found');
    return;
  }

  const admin = {
    adminId: Number(currentUser.userId),
    adminName: currentUser.name
  };

  // `editingRecord.date` is `Date | null` — pulled into a local so the
  // ternary narrows cleanly. (A trailing `!` here instead of `?? ''` trips
  // a TS narrowing quirk: it recomputes from the declared `Date | null`
  // type rather than the narrowed `null`, resurrecting `Date` in the
  // union and failing the `string` param below.)
  const editingDate = this.editingRecord.date;

  this.attendancetableService.overrideAttendance(
    this.editingRecord.employeeId ?? '',
    editingDate instanceof Date
      ? editingDate.toISOString().split('T')[0]
      : editingDate ?? '',
    this.editStatus,
    this.editCheckIn,
    this.editReason,
    admin
  );

  // Update local data and save to storage
  const index = this.attendance.findIndex(r => r.id === this.editingRecord!.id);
  if (index !== -1) {
    this.attendance[index] = {
      ...this.attendance[index],
      status: this.editStatus,
      checkIn: this.editCheckIn || this.attendance[index].checkIn,
      overriddenBy: admin,
      overrideReason: this.editReason
    };
    this.applyFilters();
  }

  this.editingRecord = null;
  this.toastService.success('Attendance record updated successfully');
}

// Handle shared table action clicks (Modify, Open, View Details)
onTableActionClick(event: { actionId: string; row: AttendanceTableRecord }): void {
  if (event.actionId === 'details') {
    this.openDetails(event.row);
  } else if (event.actionId === 'modify') {
    this.openModifyForm(event.row);
  } else if (event.actionId === 'open') {
    this.openAttendance(event.row);
  }
}

openDetails(record: AttendanceTableRecord): void {
  this.detailsRecord = record;
}

closeDetails(): void {
  this.detailsRecord = null;
}

// ── STEP 2: Inline Modification Tracking ────────────────────────────────
markAsModification(record: AttendanceTableRecord): void {
  if (!this.editingRecord) return;

  // Store original values for tracking
  this.originalCheckIn = record.checkIn ?? null;
  this.originalCheckOut = record.checkOut ?? null;

  // Check if values actually changed
  const hasChanges =
    this.editCheckIn !== this.originalCheckIn ||
    this.editCheckOut !== this.originalCheckOut ||
    this.editStatus !== record.status;

  if (!hasChanges) {
    alert('No changes detected. Please modify at least one field.');
    return;
  }

  // Flag record as requiring approval for correction
  this.modificationFlags.set(record.id, {
    flagType: 'CORRECTION',
    approvalStatus: 'PENDING'
  });


}

// ── STEP 3: Auto-detect Cross-Branch Biometric Check-ins ────────────────
checkCrossBranchBiometric(record: AttendanceTableRecord, deviceBranchCode: string, employeeHomeBranchCode: string): boolean {
  if (deviceBranchCode !== employeeHomeBranchCode) {
    // Auto-flag for cross-branch
    this.modificationFlags.set(record.id, {
      flagType: 'CROSS_BRANCH_BIOMETRIC',
      approvalStatus: 'PENDING'
    });


    return true;
  }
  return false;
}

// ── STEP 4: Approval Workflow ────────────────────────────────────────────
approveFlag(recordId: number, notes: string = ''): void {
  const flag = this.modificationFlags.get(recordId);
  if (flag) {
    flag.approvalStatus = 'APPROVED';
    this.approverNotes.set(recordId, notes);
    this.toastService.success(`Record ${recordId} approved`);

  }
}

rejectFlag(recordId: number, reason: string = ''): void {
  const flag = this.modificationFlags.get(recordId);
  if (flag) {
    flag.approvalStatus = 'REJECTED';
    this.approverNotes.set(recordId, reason);
    this.toastService.warning(`Record ${recordId} rejected`);

  }
}

// ── STEP 5: Correction Request Approval Workflow ─────────────────────────
approveCorrectionRequest(recordId: number): void {
  const adminName = sessionStorage.getItem('fullname') || 'Admin';

  // Find record in both arrays to ensure updates everywhere
  const attendanceRecord = this.attendance.find(r => r.id === recordId);
  const filteredRecord = this.filteredAttendance.find(r => r.id === recordId);

  // The service is keyed by the correction request id, not the attendance record id
  const correctionId = (attendanceRecord ?? filteredRecord)?.correctionRequest?.id;
  if (correctionId === undefined) {
    this.toastService.error('No correction request found for this record');
    return;
  }

  this.correctionRequestService.approveCorrectionRequest(correctionId, adminName).subscribe({
    next: () => {
      // Approval only changes the request status; the attendance record is left untouched.
      if (attendanceRecord?.correctionRequest) {
        attendanceRecord.correctionRequest.status = 'SUBMITTED';
        attendanceRecord.correctionRequest.approvedBy = adminName;
      }
      if (filteredRecord?.correctionRequest) {
        filteredRecord.correctionRequest.status = 'SUBMITTED';
        filteredRecord.correctionRequest.approvedBy = adminName;
      }
      this.detailsRecord = null;
      this.applyFilters();
      this.toastService.success(`✅ Correction request approved for ${attendanceRecord?.employee}`);
    },
    error: err => {
      console.error('Failed to approve correction request:', err);
      this.toastService.error('Failed to approve correction request');
    }
  });
}

rejectCorrectionRequest(recordId: number, reason: string = ''): void {
  const rejectionReason = reason || 'Rejected by admin';

  // Find record in both arrays
  const attendanceRecord = this.attendance.find(r => r.id === recordId);
  const filteredRecord = this.filteredAttendance.find(r => r.id === recordId);

  const correctionId = (attendanceRecord ?? filteredRecord)?.correctionRequest?.id;
  if (correctionId === undefined) {
    this.toastService.error('No correction request found for this record');
    return;
  }

  this.correctionRequestService.rejectCorrectionRequest(correctionId, rejectionReason).subscribe({
    next: () => {
      if (attendanceRecord?.correctionRequest) {
        attendanceRecord.correctionRequest.status = 'REJECTED';
        attendanceRecord.correctionRequest.rejectionReason = rejectionReason;
      }
      if (filteredRecord?.correctionRequest) {
        filteredRecord.correctionRequest.status = 'REJECTED';
        filteredRecord.correctionRequest.rejectionReason = rejectionReason;
      }
      this.detailsRecord = null;
      this.applyFilters();
      this.toastService.warning(`❌ Rejected! ${attendanceRecord?.employee} status remains ${attendanceRecord?.status}`);
    },
    error: err => {
      console.error('Failed to reject correction request:', err);
      this.toastService.error('Failed to reject correction request');
    }
  });
}

// ── STEP 6: Cross-Branch Approval Workflow ────────────────────────────────
approveCrossBranch(recordId: number): void {
  this.decideCrossBranch(recordId, 'APPROVE', 'Cross-branch attendance approved');
}

rejectCrossBranch(recordId: number, reason: string = ''): void {
  this.decideCrossBranch(recordId, 'REJECT', reason || 'Unauthorized cross-branch attendance');
}

/**
 * Sends a cross-branch decision to the server, then updates the table. These used to be kept only in
 * the approver's browser, so the server (and payroll) never saw the approval and the day could count
 * as absent. The row only changes once the server has accepted the decision.
 */
private decideCrossBranch(recordId: number, action: 'APPROVE' | 'REJECT', note: string): void {
  const rows = [this.attendance, this.filteredAttendance]
    .map(list => list.find(r => r.id === recordId))
    .filter((r): r is AttendanceTableRecord => !!r && !!r.isCrossBranchAttendance);
  const record = rows[0];
  if (!record) return;

  const approver = this.userSession.getCurrentUser();
  if (!approver) {
    this.toastService.error('No logged in user found');
    return;
  }

  this.findCrossBranchRequestId(record).pipe(
    switchMap(requestId => {
      if (requestId === null) {
        throw new Error('No matching cross-branch request was found on the server for this check-in.');
      }
      return action === 'APPROVE'
        ? this.crossBranchAttendanceService.approveCrossBranchRequest(requestId, approver.id, approver.name, note)
        : this.crossBranchAttendanceService.rejectCrossBranchRequest(requestId, approver.id, approver.name, note);
    })
  ).subscribe({
    next: () => {
      rows.forEach(r => {
        r.crossBranchApprovalStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
        r.status = action === 'APPROVE' ? 'PRESENT' : 'ABSENT';
      });
      // Keeps the badge in step on this device until the next refresh brings the server's copy.
      if (action === 'APPROVE') {
        this.crossBranchApprovalService.approveCrossBranch(recordId, approver.name, note);
      } else {
        this.crossBranchApprovalService.rejectCrossBranch(recordId, approver.name, note);
      }
      this.detailsRecord = null;
      this.applyFilters();
      this.cdr.detectChanges();
      if (action === 'APPROVE') {
        this.toastService.success(`Approved: ${record.employee} cross-branch (${record.homeBranchName} → ${record.checkedInBranchName})`);
      } else {
        this.toastService.warning(`Rejected: ${record.employee} cross-branch attendance marked invalid`);
      }
    },
    error: (err) => {
      console.error('Cross-branch decision failed:', err);
      const detail = err?.error?.message || err?.message || 'The server did not accept the decision.';
      this.toastService.error(`Could not ${action === 'APPROVE' ? 'approve' : 'reject'} ${record.employee}'s cross-branch check-in: ${detail}`);
    }
  });
}

/**
 * The server's cross-branch request behind a table row. Rows are attendance records, not requests,
 * so a stored numeric request id is used when there is one; otherwise the pending request for the
 * same employee and work day.
 */
private findCrossBranchRequestId(record: AttendanceTableRecord): Observable<number | null> {
  const storedId = Number((record as any).crossBranchRequestId);
  if (Number.isFinite(storedId) && storedId > 0) return of(storedId);

  const day = (value: any) => {
    const date = value ? new Date(value) : null;
    if (!date || isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const recordDay = day(record.date);
  const employeeId = String(record.employeeId ?? '');

  return this.crossBranchAttendanceService.getOutstandingRequests().pipe(
    map(requests => {
      const match = requests.find(req => {
        const reqEmployeeId = String((req.employeeId as any)?.id ?? req.employeeId ?? '');
        const reqDay = String(req.workDate || req.requestDate || '').slice(0, 10);
        return reqEmployeeId === employeeId && (!recordDay || reqDay === recordDay);
      });
      return match?.id ?? null;
    })
  );
}

// Helper: Get flag indicator for table
getFlagIndicator(recordId: number): { icon: string; label: string; color: string } | null {
  const flag = this.modificationFlags.get(recordId);
  if (!flag) return null;

  const icons: Record<FlagType, string> = {
    'CORRECTION': '🔧',
    'CROSS_BRANCH_BIOMETRIC': '🌍'
  };

  const labels: Record<FlagType, string> = {
    'CORRECTION': 'Modified',
    'CROSS_BRANCH_BIOMETRIC': 'Cross-Branch'
  };

  const colors: Record<ApprovalStatus, string> = {
    'PENDING': '#FFA500',     // Orange
    'APPROVED': '#10B981',    // Green
    'REJECTED': '#EF4444'     // Red
  };

  return {
    icon: icons[flag.flagType],
    label: labels[flag.flagType],
    color: colors[flag.approvalStatus]
  };
}

// Helper: Check if record has pending approval
hasPendingApproval(recordId: number): boolean {
  const flag = this.modificationFlags.get(recordId);
  return flag?.approvalStatus === 'PENDING';
}

// Helper: Get CSS class for status badge
getStatusClass(status: string): string {
  const statusMap: Record<string, string> = {
    'PRESENT': 'status-present',
    'LATE': 'status-late',
    'ABSENT': 'status-absent',
    'ON_LEAVE': 'status-leave',
    'OVERTIME': 'status-overtime'
  };
  return statusMap[status] || '';
}

// Calculate hours worked from check-in and check-out times
calculateHours(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  try {
    const inTime = new Date(`1970-01-01T${checkIn}`);
    const outTime = new Date(`1970-01-01T${checkOut}`);
    const diffMs = outTime.getTime() - inTime.getTime();
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
  } catch {
    return 0;
  }
}

// Calculate late minutes (time after expected start time 09:00)
calculateLateMinutes(checkIn: string | null, expectedStart: string = '09:00'): number {
  if (!checkIn) return 0;
  try {
    const inTime = new Date(`1970-01-01T${checkIn}`);
    const expectedTime = new Date(`1970-01-01T${expectedStart}`);
    const diffMs = inTime.getTime() - expectedTime.getTime();
    const diffMinutes = Math.round(diffMs / (1000 * 60));
    return diffMinutes > 0 ? diffMinutes : 0;
  } catch {
    return 0;
  }
}

// Calculate overtime (hours beyond standard 8-hour workday)
calculateOvertime(hours: number, standardHours: number = 8): number {
  return hours > standardHours ? Math.round((hours - standardHours) * 100) / 100 : 0;
}

// Populate calculated fields for all records
populateCalculatedFields(): void {
  this.filteredAttendance = this.filteredAttendance.map(record => ({
    ...record,
    hours: this.calculateHours(record.checkIn ?? null, record.checkOut ?? null),
    lateMinutes: this.calculateLateMinutes(record.checkIn ?? null),
    overtime: this.calculateOvertime(
      this.calculateHours(record.checkIn ?? null, record.checkOut ?? null)
    )
  }));
}

isCrossBranchAttendance(record: AttendanceTableRecord): boolean {
  return !!(record.isCrossBranchAttendance ||
    (record.checkedInBranchId && record.homeBranchId && record.checkedInBranchId !== record.homeBranchId));
}

getCrossBranchBranchNames(record: AttendanceTableRecord): string {
  if (record.checkedInBranchName && record.homeBranchName) {
    return `From: ${record.homeBranchName} → To: ${record.checkedInBranchName}`;
  }
  return 'Cross-branch attendance';
}

getFieldValue(record: AttendanceTableRecord, field: string): any {
  if (!field) return '';
  if (!field.includes('.')) {
    const value = record[field as keyof AttendanceTableRecord];
    // Format date fields
    if (field === 'date' && value instanceof Date) {
      return value.toLocaleDateString('en-CA'); // YYYY-MM-DD format
    }
    return value || '';
  }
  const parts = field.split('.');
  let value: any = record;
  for (const part of parts) {
    value = value?.[part];
  }
  return value || '-';
}

toggleRecordSelection(recordId: number): void {
  if (this.selectedRecords.has(recordId)) {
    this.selectedRecords.delete(recordId);
  } else {
    this.selectedRecords.add(recordId);
  }
}

isRecordSelected(recordId: number): boolean {
  return this.selectedRecords.has(recordId);
}

openMassApproveConfirm(): void {
  const recordsToApprove = Array.from(this.selectedRecords).filter(id => {
    const record = this.filteredAttendance.find(r => r.id === id);
    return record?.correctionRequest?.status === 'PENDING' ||
           (record?.isCrossBranchAttendance && record?.crossBranchApprovalStatus === 'PENDING');
  });

  if (recordsToApprove.length === 0) {
    this.toastService.warning('No pending corrections or cross-branch selected');
    return;
  }

  this.showMassApproveConfirm = true;
}

cancelMassApprove(): void {
  this.showMassApproveConfirm = false;
}

massApproveCorrectionRequests(): void {
  const recordsToApprove = Array.from(this.selectedRecords).filter(id => {
    const record = this.filteredAttendance.find(r => r.id === id);
    return record?.correctionRequest?.status === 'PENDING' || 
           (record?.isCrossBranchAttendance && record?.crossBranchApprovalStatus === 'PENDING');
  });

  if (recordsToApprove.length === 0) {
    this.toastService.warning('No pending corrections or cross-branch selected');
    this.showMassApproveConfirm = false;
    return;
  }

  const adminName = sessionStorage.getItem('fullname') || 'Admin';
  let correctionCount = 0;
  let crossBranchCount = 0;

  recordsToApprove.forEach(recordId => {
    const record = this.filteredAttendance.find(r => r.id === recordId);
    
    // Approve correction if pending
    if (record?.correctionRequest?.status === 'PENDING') {
      this.approveCorrectionRequest(recordId);
      correctionCount++;
    }
    
    // Approve cross-branch if pending
    if (record?.isCrossBranchAttendance && record?.crossBranchApprovalStatus === 'PENDING') {
      this.approveCrossBranch(recordId);
      crossBranchCount++;
    }
  });

  this.selectedRecords.clear();
  this.showMassApproveConfirm = false;
  
  const messages = [];
  if (correctionCount > 0) messages.push(`${correctionCount} correction(s)`);
  if (crossBranchCount > 0) messages.push(`${crossBranchCount} cross-branch`);
  
  this.toastService.success(`✅ Approved ${messages.join(' and ')}`);
}

clearSelection(): void {
  this.selectedRecords.clear();
}

getSelectedCount(): number {
  return this.selectedRecords.size;
}

getPendingCorrectionCount(): number {
  return this.filteredAttendance.filter(r => r.correctionRequest?.status === 'PENDING').length;
}

getPendingCrossBranchCount(): number {
  return this.filteredAttendance.filter(r => 
    r.isCrossBranchAttendance && r.crossBranchApprovalStatus === 'PENDING'
  ).length;
}

getTotalPendingCount(): number {
  return this.getPendingCorrectionCount() + this.getPendingCrossBranchCount();
}



areAllPendingSelected(): boolean {
  const pendingRecords = this.filteredAttendance.filter(r => 
    r.correctionRequest?.status === 'PENDING' ||
    (r.isCrossBranchAttendance && r.crossBranchApprovalStatus === 'PENDING')
  );
  if (pendingRecords.length === 0) return false;
  return pendingRecords.every(r => this.selectedRecords.has(r.id));
}

selectAllWithPendingCorrections(): void {
  const pendingRecords = this.filteredAttendance.filter(r => 
    r.correctionRequest?.status === 'PENDING' ||
    (r.isCrossBranchAttendance && r.crossBranchApprovalStatus === 'PENDING')
  );
  
  if (this.areAllPendingSelected()) {
    // Deselect all
    pendingRecords.forEach(r => this.selectedRecords.delete(r.id));
  } else {
    // Select all pending
    pendingRecords.forEach(r => this.selectedRecords.add(r.id));
  }
}

}
