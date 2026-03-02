import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AttendanceTableRecord } from '../../shared-component/models/attendancetable.model';
import { MOCK_ATTENDANCE } from '../../shared-component/models/attendancetable.mock';
import { OfficeHoursService } from './office-hours.service';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Injectable({ providedIn: 'root' })
export class AttendancetableService {

  private attendanceSubject = new BehaviorSubject<AttendanceTableRecord[]>(MOCK_ATTENDANCE);
  attendance$ = this.attendanceSubject.asObservable();

  getAttendance(filters?: any): Observable<AttendanceTableRecord[]> {
    return of(this.attendanceSubject.value);
  }

  constructor(private officeHoursService: OfficeHoursService) {}

  /*clockAction(
  employeeId: string,
  employeeName: string,
  department: string,
  action: 'IN' | 'OUT'
) {

  const now = new Date();
  const officeHours = this.officeHoursService.getOfficeHours();

  const opening = this.convertToDateTime(officeHours.openingTime);
  const closing = this.convertToDateTime(officeHours.closingTime);

  let status = 'PRESENT';

  if (action === 'IN') {
    if (now > opening) {
      status = 'LATE';
    } else {
      status = 'PRESENT';
    }
  }

  if (action === 'OUT') {
    if (now > closing) {
      status = 'OVERTIME';
    }
  }

  // Save attendance record
  this.saveAttendanceRecord({
    employeeId,
    employeeName,
    department,
    time: now,
    action,
    status
  });
}

private convertToDateTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );
}*/


clockAction(employeeid: string, employeeName: string, department: string, action: 'IN' | 'OUT') {
  const data = [...this.attendanceSubject.value];
  const today = new Date().toISOString().split('T')[0];

  let record = data.find(r => r.employee === employeeName && r.date === today);

  // if no record exists for today, create one
  if (!record) {
    record = {
      id: employeeid,
      employee: employeeName,
      department: department,
      date: today,
      checkIn: null,
      checkOut: null,
      status: 'ABSENT',
      hours: 0
    };
    data.unshift(record);
  }

  const now = new Date();
  const officeHours = this.officeHoursService.getOfficeHours();

  const opening = this.convertToDateTime(officeHours.openingTime);
  const closing = this.convertToDateTime(officeHours.closingTime);

  if (action === 'IN') {
    record.checkIn = now.toLocaleTimeString();

    // ✅ LATE or PRESENT logic
    if (now > opening) {
      record.status = 'LATE';
    } else {
      record.status = 'PRESENT';
    }
  }

  if (action === 'OUT') {
    record.checkOut = now.toLocaleTimeString();
    record.hours = this.calculateHours(record.checkIn!, record.checkOut);

    // ✅ OVERTIME logic (but do not remove LATE)
    if (now > closing) {
      record.status = 'OVERTIME';
    }
  }

  this.attendanceSubject.next(data);
}

private convertToDateTime(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const now = new Date();

  return new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes,
    0
  );
}

  private calculateHours(inTime: string, outTime: string): number {
    const start = new Date(`1970-01-01T${inTime}`);
    const end = new Date(`1970-01-01T${outTime}`);
    return +((end.getTime() - start.getTime()) / 3600000).toFixed(2);
  }

  //hehe


private clockStatusSubject = new BehaviorSubject<ClockStatus>('CLOCKED_OUT');
clockStatus$ = this.clockStatusSubject.asObservable();

getClockStatus() {
  return this.clockStatusSubject.value;
}

setClockStatus(status: ClockStatus) {
  this.clockStatusSubject.next(status);
}

updateAttendanceStatus(employeeId: string, employeeName: string, department: string, date: string, newStatus: AttendanceTableRecord['status']) {

  const data = [...this.attendanceSubject.value];

  const recordIndex = data.findIndex(
    r => r.id === employeeId && r.date === date
  );

  if (recordIndex !== -1) {

    // Update existing record
    data[recordIndex] = {
      ...data[recordIndex],
      status: newStatus
    };

  } else {

    // If record does not exist for that date, create one
    data.unshift({
      id: employeeId,
      employee: employeeName,
      department: department,
      date: date,
      checkIn: null,
      checkOut: null,
      status: newStatus,
      hours: 0
    });

  }

  this.attendanceSubject.next(data);
}

}


/*import { HttpClient, HttpParams } from '@angular/common/http';
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
  }*///ignore this, continue down

  /*private buildParams(filters: any): HttpParams {
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

  return { ...record, status }; }}*/

  

    
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
  } */