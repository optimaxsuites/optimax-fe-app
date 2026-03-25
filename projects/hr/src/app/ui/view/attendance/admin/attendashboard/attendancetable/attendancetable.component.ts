import { Component, inject, OnInit, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AttendancetableService } from '../../../../../service/attendance/attendancetable.service';
import { AttendanceTableRecord } from '../../../../../domain/attendance/attendancetable.dto';
import { Observable, switchMap } from 'rxjs';
import { MOCK_ATTENDANCE } from '../../../../../domain/attendance/attendancetable.mock';
//import { AttendancefilterComponent } from './attendancefilter/attendancefilter.component';
import * as L from 'leaflet';
import { OfficeHoursService } from '../../../../../service/attendance/office-hours.service';

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

  private attendancetableService = inject(AttendancetableService)

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

selectedLocation: { recordId: string; type: 'in' | 'out' } | null = null;
  //heatmapData: any[] = [];
  //lateArrivalsData: any[] = [];
  //statsData: any[] = [];

  @Output() dataChange = new EventEmitter<{ data: AttendanceTableRecord[], filters: any }>();
 
  ngOnInit(): void {
  this.attendancetableService.attendance$.subscribe(data => {
    const today = new Date().toISOString().split('T')[0];

    this.attendance = data;

    // Default = today only
    this.filteredAttendance = data.filter(record => record.date === today);
  });
}

isToday(date: string | null): boolean {
  if (!date) return false;
  
  const today = new Date().toISOString().split('T')[0];
  return date === today;
}

openAttendance(record: AttendanceTableRecord) {
  record.overrideOpen = true;
  this.attendancetableService.openAttendanceForToday(record.id);
}

openLocationMap(record: AttendanceTableRecord, type: 'in' | 'out') {
  const location = type === 'in' 
  ? record.checkInLocation 
  : record.checkOutLocation;

  if (!location) return;

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

  const hasFilters =
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
  }
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

  const admin = {
    adminId: 'ADMIN001',
    adminName: 'HR Admin'
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
