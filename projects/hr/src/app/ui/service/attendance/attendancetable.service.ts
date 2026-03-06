import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
import { MOCK_ATTENDANCE } from '../../domain/attendance/attendancetable.mock';
import { OfficeHoursService } from './office-hours.service';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Injectable({ providedIn: 'root' })
export class AttendancetableService {

  private attendanceSubject = new BehaviorSubject<AttendanceTableRecord[]>(MOCK_ATTENDANCE);
  attendance$ = this.attendanceSubject.asObservable();

  getAttendance(filters?: any): Observable<AttendanceTableRecord[]> {
    return of(this.attendanceSubject.value);
  }

  constructor(private officeHoursService: OfficeHoursService) {
    setInterval(() => {
    this.autoMarkAbsentIfNeeded();
  }, 60000); // every minute
  }

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
if (this.hasCompletedToday(employeeid)) {
  return; // Block further clocking
}

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

  /*if (action === 'IN') {
    record.checkIn = now.toLocaleTimeString();

    // LATE or PRESENT logic
    if (now > opening) {
      record.status = 'LATE';
    } else {
      record.status = 'PRESENT';
    }
  }*/

  if (action === 'IN') {

  record.checkIn = now.toLocaleTimeString();

  // 🔥 If admin opened attendance, never mark late
  if (record.overrideOpen) {
    record.status = 'PRESENT';

    // Optional cleanup: remove override after successful clock-in
    record.overrideOpen = false;

  } else {

    // Normal Late / Present logic
    if (now > opening) {
      record.status = 'LATE';
    } else {
      record.status = 'PRESENT';
    }

  }
}

  if (action === 'OUT') {
    record.checkOut = now.toLocaleTimeString();
    record.hours = this.calculateHours(record.checkIn!, record.checkOut);

    // OVERTIME logic (but do not remove LATE)
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

private registeredEmployees = [
  { id: '001', name: 'Chrisha Okorocha', department: 'Engineering' },
  { id: '002', name: 'John Doe', department: 'HR' }
];

private lastAbsentRunDate: string | null = null;

private autoMarkAbsentIfNeeded() {

  const now = new Date();

  // Skip Saturdays (6) and Sundays (0)
  const day = now.getDay();
  if (day === 0 || day === 6) {
    return;
  }

  const officeHours = this.officeHoursService.getOfficeHours();

  const [hour, minute] = officeHours.absentTime.split(':').map(Number);

  const absentTimeToday = new Date();
  absentTimeToday.setHours(hour, minute, 0, 0);

  if (now < absentTimeToday) return;

  const today = now.toISOString().split('T')[0];
  const data = [...this.attendanceSubject.value];

  let changed = false;

  this.registeredEmployees.forEach(emp => {

    const recordExists = data.some(
      r => r.id === emp.id && r.date === today
    );

    if (!recordExists) {
      data.unshift({
        id: emp.id,
        employee: emp.name,
        department: emp.department,
        date: today,
        checkIn: null,
        checkOut: null,
        status: 'ABSENT',
        hours: 0
      });

      changed = true;
    }
  });

  if (changed) {
    this.attendanceSubject.next(data);
  }


  /*const officeHours = this.officeHoursService.getOfficeHours();
  const now = new Date();

  const [hour, minute] = officeHours.absentTime.split(':').map(Number);

  const absentTimeToday = new Date();
  absentTimeToday.setHours(hour, minute, 0, 0);

  if (now < absentTimeToday) return;

  const today = now.toISOString().split('T')[0];
  const data = [...this.attendanceSubject.value];

  this.registeredEmployees.forEach(emp => {

    const existingRecord = data.find(
      r => r.id === emp.id && r.date === today
    );

    if (!existingRecord) {
      data.unshift({
        id: emp.id,
        employee: emp.name,
        department: emp.department,
        date: today,
        checkIn: null,
        checkOut: null,
        status: 'ABSENT',
        hours: 0
      });
    }

  });

  this.attendanceSubject.next(data);*/
}

isEmployeeBlockedToday(employeeId: string): boolean {

  const today = new Date().toISOString().split('T')[0];

  const record = this.attendanceSubject.value.find(
    r => r.id === employeeId && r.date === today
  );

  if (!record) return false;

  // Block only if absent AND not opened by admin
  if (record.status === 'ABSENT' && !record.overrideOpen) {
    return true;
  }

  return false;
}

  /*isEmployeeAbsentToday(employeeId: string): boolean {

  const today = new Date().toISOString().split('T')[0];

  const record = this.attendanceSubject.value.find(
    r => r.id === employeeId && r.date === today
  );

  return record?.status === 'ABSENT';
}*/

openAttendanceForToday(employeeId: string) {

  const today = new Date().toISOString().split('T')[0];

  const records = [...this.attendanceSubject.value];

  const record = records.find(
    r => r.id === employeeId && r.date === today
  );

  if (!record) return;

  record.overrideOpen = true; //allow record override
  //record.status = 'PRESENT'; // immediately mark PRESENT

  this.attendanceSubject.next(records);
}

hasCompletedToday(employeeId: string): boolean {
  const today = new Date().toDateString();

  const todayRecord = this.attendanceSubject.value.find(record => {
    if (!record.date) return false; //to guar against null
    return (
      record.id === employeeId &&
      new Date(record.date).toDateString() === today
    );
  });

  // If record exists AND both clockIn & clockOut exist → completed
  return !!(todayRecord?.checkIn && todayRecord?.checkOut);
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