import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import { Observable, switchMap } from 'rxjs';
import { MOCK_ATTENDANCE } from '../../../../../domain/attendance/attendancetable.mock';
//import { AttendancefilterComponent } from './attendancefilter/attendancefilter.component';
import * as L from 'leaflet';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';
import { UserSessionService } from '../../../../../service/attendance/user-session.service';

delete (L.Icon.Default.prototype as any)._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'assets/leaflet/marker-icon-2x.png',
  iconUrl: 'assets/leaflet/marker-icon.png',
  shadowUrl: 'assets/leaflet/marker-shadow.png'
});

@Component({
  selector: 'app-attendancetable',
  templateUrl: './attendancetable.component.html',
  styleUrl: './attendancetable.component.scss'
})
export class AttendancetableComponent implements OnInit{

  private attendancetableService = inject(AttendancetableService);
  private userSession = inject(UserSessionService);

  attendance: AttendanceTableRecord[] = [];
  filteredAttendance: AttendanceTableRecord[] = [];

  editingRecord: AttendanceTableRecord | null = null;

editStatus: AttendanceTableRecord['status'] = 'PRESENT';
editCheckIn: string | null = null;
editReason = '';

sortColumn: keyof AttendanceTableRecord | '' = '';
sortDirection: 'asc' | 'desc' = 'asc';

mapModalOpen = false;
mapAddress = '';
mapDistance: number | null = null;
private mapInstance: L.Map | null = null;
 private officeHoursService = inject(OfficeHoursService);

 private closingTimer: any;

selectedLocation: { recordId: number; type: 'in' | 'out' } | null = null;
  //heatmapData: any[] = [];
  //lateArrivalsData: any[] = [];
  //statsData: any[] = [];

  @Output() dataChange = new EventEmitter<{ data: AttendanceTableRecord[], filters: any }>();
 
  ngOnInit(): void {
      this.startClosingWatcher();

      //to load data fromAPI on init
      this.attendancetableService.fetchAllRecords();

      this.attendancetableService.attendance$.subscribe(data => {
      this.attendance = data;

      // Reapply filters instead of resetting table
      const hasFilters =
        this.filters?.dateFrom ||
        this.filters?.dateTo ||
        this.filters?.id ||
        this.filters?.employee ||
        this.filters?.department ||
        this.filters?.status;

    if (hasFilters) {
      this.applyFilters();
    } else {
      this.resetToToday();
    }
  });
  /*this.attendancetableService.attendance$.subscribe(data => {
    const today = new Date().toISOString().split('T')[0];

    this.attendance = data;

    // Default = today only
    this.filteredAttendance = data.filter(record => record.date === today);
  });*/
}

isToday(date: string | null): boolean {
  if (!date) return false;
  
  const today = new Date().toISOString().split('T')[0];
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
    record.id,
    actorUserId,
  //parseInt(sessionStorage.getItem('userid') ?? '0'), //userid from session
'Attendance opened by admin' //reason
);
}

openLocationMap(record: AttendanceTableRecord, type: 'in' | 'out') {
  const location = type === 'in'
  ? record.checkInLocation 
  : record.checkOutLocation;

  if (!location) return;

  //guard since lat and long of location arent gotten from API
  // Records loaded from API have lat: 0, lng: 0 — can't map those
  if (location.lat === 0 && location.lng === 0) {
    alert(`Location: ${location.address}\n(Map view not available for this record)`);
    return;
  }

  this.selectedLocation = { recordId: record.id, type };
  this.mapAddress = location.address;
  this.mapModalOpen = true;

  setTimeout(() => this.initMap(location.lat, location.lng), 100);
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
  
filters: any = {};

onFiltersChange(filters: any) {
  this.filters = filters;

  const hasDateRange = filters.dateFrom && filters.dateTo;
  const hasOtherFilters = filters.id || filters.employee || filters.department || filters.status;

  if (!filters.dateFrom && !filters.dateTo && !hasOtherFilters) {
    // No filters at all — reload fresh from API
    this.attendancetableService.fetchAllRecords();
    return;
  }

  if (hasDateRange) {
    // Use the date range API endpoint, then apply remaining filters client-side
    this.attendancetableService.fetchByDateRange(filters.dateFrom, filters.dateTo);
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
  const today = new Date().toISOString().split('T')[0];

  this.filteredAttendance = this.attendance.filter(
    record => record.date === today
  );

  this.dataChange.emit({
    data: this.filteredAttendance,
  filters: this.filters
});
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

    // Status
    if (this.filters.status &&
        record.status !== this.filters.status) {
      return false;
    }

    return true;
  });

  this.dataChange.emit({
    data: this.filteredAttendance,
  filters: this.filters});

/* //if you want it so your sort doesn't reset even after filtering
  if (this.sortColumn) {
  this.sortTable(this.sortColumn);
} */
}

openModifyForm(record: AttendanceTableRecord) {

  this.editingRecord = record;

  this.editStatus = record.status;
  this.editCheckIn = record.checkIn;
  this.editReason = record.overrideReason ?? '';
}

cancelEdit() {
  this.editingRecord = null;
}

saveModification() {

  if (!this.editingRecord) return;

    if (!this.editReason || !this.editReason.trim()) {
    alert('Reason for modification is required.');
    return;
  }

  /*const admin = {
    adminId: 'ADMIN001',
    adminName: 'HR Admin'
  };*/

  const currentUser = this.userSession.getCurrentUser();

if (!currentUser) {
  alert('No logged in user found');
  return;
}

const admin = {
  adminId: Number(currentUser.userId),
  adminName: currentUser.name
};

  this.attendancetableService.overrideAttendance(
    this.editingRecord.id,
    this.editingRecord.date!,
    this.editStatus,
    this.editCheckIn,
    this.editReason,
    admin
  );

  this.editingRecord = null;

  if (this.editReason.trim().length < 5) {
  alert('Reason must be at least 5 characters.');
  return;
}
}

sortTable(column: keyof AttendanceTableRecord) {

  // Toggle direction if same column
  if (this.sortColumn === column) {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    this.sortColumn = column;
    this.sortDirection = 'asc';
  }

  this.filteredAttendance = [...this.filteredAttendance].sort((a, b) => {

    /*let valueA = a[column];
    let valueB = b[column];*/

    let valueA = column === 'overriddenBy'
  ? a.overriddenBy?.adminName
  : a[column];

let valueB = column === 'overriddenBy'
  ? b.overriddenBy?.adminName
  : b[column];

    // Handle null/undefined
    if (valueA == null) return 1;
    if (valueB == null) return -1;

    // Convert to string for comparison (safe fallback)
    valueA = valueA.toString().toLowerCase();
    valueB = valueB.toString().toLowerCase();

    if (valueA < valueB) return this.sortDirection === 'asc' ? -1 : 1;
    if (valueA > valueB) return this.sortDirection === 'asc' ? 1 : -1;

    return 0;
  });
}

}
