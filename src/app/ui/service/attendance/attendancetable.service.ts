import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of, map } from 'rxjs';
import { AttendanceTableRecord } from '../../shared-component/models/attendancetable.model';
import { MOCK_ATTENDANCE } from '../../shared-component/models/attendancetable.mock';
import { OfficeHoursService } from './office-hours.service';

@Injectable({ providedIn: 'root' })
export class AttendancetableService {
  
  private http = inject(HttpClient);
  private officeHoursService = inject(OfficeHoursService);

  getAttendance(filters?: any): Observable<AttendanceTableRecord[]> {
  return of(MOCK_ATTENDANCE).pipe(
    map(records => records.map(r => this.applyAttendanceStatus(r))),
    map(records => this.applyFilters(records, filters))
  );
}

private applyFilters(records: AttendanceTableRecord[], filters?: any): AttendanceTableRecord[] {
  if (!filters) return records;

  return records.filter(r => {

    // Month filter (YYYY-MM)
    if (filters.month && r.date && !r.date.startsWith(filters.month)) {
      return false;
    }

    // Date range
    if (filters.dateFrom && r.date && r.date < filters.dateFrom) {
      return false;
    }

    if (filters.dateTo && r.date && r.date > filters.dateTo) {
      return false;
    }

    // Employee ID
    if (filters.id && !r.id.toLowerCase().includes(filters.id.toLowerCase())) {
      return false;
    }

    // Employee name
    if (filters.employee && !r.employee.toLowerCase().includes(filters.employee.toLowerCase())) {
      return false;
    }

    // Department
    if (filters.department && r.department !== filters.department) {
      return false;
    }

    // Status
    if (filters.status && r.status !== filters.status) {
      return false;
    }

    return true;
  });
}

 /* getAttendance(filters?: any): Observable<AttendanceTableRecord[]> {
    const source$ = !filters
      ? of(MOCK_ATTENDANCE)
      : this.http.get<AttendanceTableRecord[]>('/api/attendance', { params: this.buildParams(filters) });

    return source$.pipe(
      map(records => records.map(r => this.applyAttendanceStatus(r)))
    );
  }*/

  private buildParams(filters: any): HttpParams {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];

      if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        if (Array.isArray(value)) {
          value.forEach((v: string) => {
            params = params.append(key, v);
          });
        } else {
          params = params.set(key, value);
        }
      }
    });

    return params;
  }

      private applyAttendanceStatus(record: AttendanceTableRecord): AttendanceTableRecord {
    const { openingTime, closingTime } = this.officeHoursService.getOfficeHours();

    const toDate = (time: string) => new Date(`1970-01-01T${time}`);

    const openTime = toDate(openingTime);
    const closeTime = toDate(closingTime);

    let status: AttendanceTableRecord['status']='PRESENT';

    if (!record.checkIn) {
      status = 'ABSENT';
    } else {
    const checkInTime = toDate(record.checkIn);

    if (checkInTime > openTime) {
      status = 'LATE';
    }
  } if (record.checkOut) {
      const checkOutTime = toDate(record.checkOut);

      if (checkOutTime > closeTime) {
        status = 'OVERTIME';
      }
    }

  return { ...record, status };

  

    
    // ✅ If backend is not ready, return mock data
    /*if (!filters) {
      return of(MOCK_ATTENDANCE);
    }

    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      const value = filters[key];

      if (value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0)) {
        if (Array.isArray(value)) {
          value.forEach((v: string) => {
            params = params.append(key, v);
          });
        } else {
          params = params.set(key, value);
        }
      }
    });

    return this.http.get<AttendanceTableRecord[]>('/api/attendance', { params });
  } */}}