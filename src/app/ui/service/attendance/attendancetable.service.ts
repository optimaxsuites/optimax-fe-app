import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
//import { MOCK_ATTENDANCE } from '../../domain/attendance/attendancetable.mock';
import { OfficeHoursService } from './office-hours.service';
import { AttendanceScheduleResolverService } from './attendanceschedulreresolver.service';
import { WorkingWindow } from '../../domain/attendance/working-window.dto';
import { computeShiftTrackingMetrics } from '../workschedule-shift/shift-based-tracking.util';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared-component/environments/environment.prod';
import { map } from 'rxjs/operators';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Injectable({ providedIn: 'root' })
export class AttendancetableService {

  private attendanceSubject = new BehaviorSubject<AttendanceTableRecord[]>([]);

  // added these two properties after attendanceSubject:
  private localRecords = new Map<string, AttendanceTableRecord>(); // key: `${employeeId}_${date}`

  private localKey(employeeId: any, date: string): string {
    return `${employeeId}_${date}`;
  }

  attendance$ = this.attendanceSubject.asObservable();

  getAttendance(filters?: any): Observable<AttendanceTableRecord[]> {
    return of(this.attendanceSubject.value);
  }

  private absentTimeout: any;
  private absentInterval: any;
  //private apiRecordId: number | null = null;

  constructor(
    private officeHoursService: OfficeHoursService,
    private http: HttpClient,
    private attendanceScheduleResolverService: AttendanceScheduleResolverService
  ) {
  // Seed registeredEmployees from current session so absent check works
  // This will grow as employees clock in — for now at least covers the logged-in user
  this.scheduleAbsentCheck();

  // Re-schedule if admin changes office hours
  this.officeHoursService.officeHours$.subscribe(() => {
    this.scheduleAbsentCheck();
  });
}

// ADD this method to register an employee (call it from clockAction when a new record is created):
private ensureRegistered(id: number, name: string, department: string): void {
  const already = this.registeredEmployees.some(e => e.id === id);
  if (!already) {
    this.registeredEmployees.push({ id, name, department });
  }
}

private mergeAndPublish(apiRecords: AttendanceTableRecord[]): void {
  const merged = [...apiRecords];

  // For each local record, either replace the matching API record or prepend it
  this.localRecords.forEach((localRecord, key) => {
    const index = merged.findIndex(
      r => this.localKey(r.employeeId, r.date ?? '') === key
    );

    if (index !== -1) {
      // Local record wins over API record (has live location, real-time status)
      merged[index] = { ...merged[index], ...localRecord };
    } else {
      // No matching API record — prepend the local one
      merged.unshift(localRecord);
    }
  });

  this.attendanceSubject.next(merged);
}

//nna to get the right employee id nnaaaaa
resolveHrEmployeeId(/*username*/sessionUserId: number): Observable<{ id: number; fullName: string; department: string } | null> {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/employees?page=1&size=100`  ).pipe(
    map(res => {
      const employees = res.content ?? res;
      console.log('==============================');
      console.log('SESSION USER ID:', sessionUserId);
      console.log('EMPLOYEES:', employees);

      employees.forEach((e: any, index: number) => {
        console.log(`EMPLOYEE ${index}:`, e);
        console.log('employee.id:', e.id);
        console.log('employee.user:', e.user);
        console.log('employee.userId:', e.userId);
      });
      
      const match = employees.find(
        (e: any) => Number(e.user?.userId) === sessionUserId
      );

      console.log('MATCHED EMPLOYEE:', match);

      //employee.id           // HR employee ID
      //employee.user.id      // internal user object ID
      //employee.user.userId  // actual auth/session user ID

      if (!match){
        console.log('HR employee not found');
        return null;
      }
      return {
        id: Number(match.id),
        department: match.department?.name ?? '',
        fullName: `${match.firstName ?? ''} ${match.lastName ?? ''}`.trim()
      };
    })
  );
}

private mapApiRecord(api: any): AttendanceTableRecord {
  
  const emp = api.employeeId; // nested employee object

  const fullName = emp
    ? `${emp.lastName ?? ''} ${emp.firstName ?? ''}`.trim()
    : '';

  const department = emp?.department?.name ?? '';

  const attendanceDate = api.attendanceDate;

  const isWeekend = (() => {

    if (!Array.isArray(api.attendanceDate)) {
      return false;
    }

    const [year, month, day] = api.attendanceDate;

    const date = new Date(year, month - 1, day);

    return date.getDay() === 0 || date.getDay() === 6;

  })();

  // Extract HH:mm:ss time from ISO string for display

  //const toTimeStr = (iso: string | null): string | null => iso;
  /*{
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return null;
    }
  };*/

  const toDateTime = (value: any): string | null => {

  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {

    const [
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
      nano = 0
    ] = value;

    return new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      Math.floor(nano/1000000)
    ).toISOString();
  }

  return value;
}

  // API stores location as plain string — wrap it for our DTO
  const toLocation = (locStr: string | null) => {
    if (!locStr) return null;
    return { address: locStr, lat: 0, lng: 0 };
  };

  const toDateOnly = (value: any): string | null => {

  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {

    const [year, month, day] = value;

    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  return value;
};

  return {
    id: Number(api.id), //attendancerecordid
    apiRecordId: Number(api.id),
    employeeId: Number(emp?.id), //employeeid
    employee: fullName,
    department,
    date: toDateOnly(api.attendanceDate),
    checkIn: toDateTime(api.checkIn),
    checkOut: toDateTime(api.checkOut),
    checkInLocation: toLocation(api.checkInLocation),
    checkOutLocation: toLocation(api.checkOutLocation),
    status: api.status ?? 'ABSENT',
    hours: api.hours ?? 0,
    overrideOpen: api.overrideOpen ?? false,
    overrideReason: api.overrideReason ?? '',
    overriddenBy: api.overrideBy
      ? { adminId: Number(api.overrideBy.hrEmployeeId), 
        adminName: api.overrideBy.fullname }
      : undefined,
    appliedScheduleType: api.appliedScheduleType === 'OFFICE_HOURS'
     ? 'office-hours' : 'shift',
    appliedScheduleId: api.appliedScheduleId
      ? Number(api.appliedScheduleId)
      : undefined,
    appliedExpectedStart: api.appliedExpectedStart,
    appliedExpectedEnd: api.appliedExpectedEnd,
    appliedShiftName: api.appliedShiftName
  };
}

// GET all records (admin table on load)
fetchAllRecords(page: number = 1, size: number = 100): void {
  this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords?page=${page}&size=${size}`  ).subscribe({
    next: (res) => {
      console.log('RAW API RECORD:', res.content?.[0]);
      const mapped = (res.content ?? [])
      .map((r: any) => this.enrichRecordMetrics(this.mapApiRecord(r)))
      .filter((r: AttendanceTableRecord) => {
        const date = new Date(r.date!);
        const day = date.getDay();
        const isWeekend = day === 0 || day === 0;
        return !(isWeekend && r.status ==='ABSENT');
      });
       console.log('MAPPED RECORD:', mapped[0]);
      this.mergeAndPublish(mapped); // ← was attendanceSubject.next(mapped)
    },
    error: (err) => console.error('Failed to fetch attendance records:', err)
  });
}

// GET by date range (admin filter)
fetchByDateRange(from: string, to: string, page: number = 1, size: number = 100): void {
  this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/dateRange?from=${from}&to=${to}&page=${page}&size=${size}`  ).subscribe({
    next: (res) => {
      const mapped = (res.content ?? [])
      .map((r: any) => this.enrichRecordMetrics(this.mapApiRecord(r)))
      .filter((r: AttendanceTableRecord) => {
        const date = new Date(r.date!);

        const day = date.getDay();

        const isWeekend = day === 0 || day === 6;

        return !(isWeekend && r.status === 'ABSENT');
      });
      this.mergeAndPublish(mapped); // ← was attendanceSubject.next(mapped)
    },
    error: (err) => console.error('Failed to fetch records by date range:', err)
  });
}

// GET by employee ID (employee monthly table)
fetchByEmployee(employeeId: number, page: number = 1, size: number = 100): void {
  this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/employee/${employeeId}?page=${page}&size=${size}`  ).subscribe({
    next: (res) => {
      const mapped = (res.content ?? [])
      .map((r: any) => this.enrichRecordMetrics(this.mapApiRecord(r)))
      .filter((r: AttendanceTableRecord) => {
        const date = new Date(r.date!);

        const day = date.getDay();

        const isWeekend = day === 0 || day === 6;

        return !(isWeekend && r.status === 'ABSENT');
      }) ;

       // TEMP: diagnostic log
      console.log('=== FETCH BY EMPLOYEE ===');
      console.log('Records returned:', mapped.map((r: AttendanceTableRecord) => ({ 
        id: r.id, 
        employee: r.employee,
        date: r.date 
      })));

      console.log('RAW API RESPONSE:', res.content);
      console.log('MAPPED RECORDS:', mapped);
      console.log(mapped.map((r: AttendanceTableRecord) => ({
        date: r.date,
        checkIn: r.checkIn,
        checkOut: r.checkOut
      }))
);
      
      this.mergeAndPublish(mapped); // ← was attendanceSubject.next(mapped)
    },
    error: (err) => console.error('Failed to fetch employee records:', err)
  });
}

// GET single record by ID
fetchRecordById(id: number): Observable<AttendanceTableRecord> {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${id}`  ).pipe(
    map((res: any) => this.enrichRecordMetrics(this.mapApiRecord(res)))
  );
}

private clockInApi(
  employeeId: number,
  //employeeIdStr: string,
  checkIn: string,
  checkInLocation: string,
  checkInDistance: number
): void {
  const body = { 
    employeeId,
    attendanceDate: new Date().toISOString().split('T')[0], 
    checkIn, 
    checkInLocation, 
    checkInDistance };

    console.log('CLOCK IN BODY:', body);

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockIn`,
    body  ).subscribe({
    next: (res) => {
      // Store on both the service-level variable AND the local record
      const returnedId = res?.id ?? res?.attendanceId ?? res?.recordId ?? null;

      if (returnedId) {

        // Persist it on the local record so admin can use it later
        const today = new Date().toISOString().split('T')[0];
        const records = [...this.attendanceSubject.value];
        const record = records.find(
          r => r.employeeId === employeeId && r.date === today
        );

        if (record) {
          //to store API recordID directly on this attendance row
          record.apiRecordId = returnedId;

          // keep localRecords synced too
          this.localRecords.set(
            this.localKey(employeeId, today),
            { ...record }
          );

          this.attendanceSubject.next(records);
        }

        console.log('Clock-in successful, API record ID:', returnedId);
      } else {
        console.warn('Clock-in succeeded but no ID returned in response:', res);
      }
    },
    error: (err) => {
      console.error('Clock-in failed:', err);
      console.log('Full Backend Error body:', err.error);
      console.log('Backend Message:', err?.error?.message);
      alert(err?.error?.message ?? 'Clock-in failed alert');
      }
  });
}

private clockOutApi(
  apiRecordId: number,
  employeeId: number,
  checkOut: string,
  checkOutLocation: string,
  checkOutDistance: number
): void {
  const body = {
    id: apiRecordId,
    employeeId,
    checkOut,
    checkOutLocation,
    checkOutDistance
  };

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockOut`,
    body  ).subscribe({
    next: (res) => {
      console.log('Clock-out successful:', res);
      console.log('CLOCKOUT:', res);
      //this.apiRecordId = null; // reset for next session
    },
    error: (err) => console.error('Clock-out failed:', err)
  });
}

overrideOpenApi(
  apiRecordId: number,
  actorUserId: number,
  reason: string
): void {
  const body = { actorUserId, reason };

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${apiRecordId}/override/open`,
    body  ).subscribe({
    next: (res) => console.log('Override open successful:', res),
    error: (err) => console.error('Override open failed:', err)
  });
}

private getTodayRecord(employeeId: number): AttendanceTableRecord | undefined {
  const today = new Date().toISOString().split('T')[0];
  return this.attendanceSubject.value.find(
    r => r.employeeId === employeeId && r.date === today
  );
}

private scheduleAbsentCheck() {
  // Clear any existing timers before rescheduling
  if (this.absentTimeout) clearTimeout(this.absentTimeout);
  if (this.absentInterval) clearInterval(this.absentInterval);

  const now = new Date();
  const officeHours = this.officeHoursService.getOfficeHours();
  const [hour, minute] = officeHours.absentTime.split(':').map(Number);

  const absentTimeToday = new Date();
  absentTimeToday.setHours(hour, minute, 0, 0);

  const msUntilAbsentTime = absentTimeToday.getTime() - now.getTime();

  if (msUntilAbsentTime > 0) {
    // Fire exactly when absentTime hits
    this.absentTimeout = setTimeout(() => {
      this.autoMarkAbsentIfNeeded();

      // Then keep checking every minute as a safety net
      this.absentInterval = setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
    }, msUntilAbsentTime);

  } else {
    // absentTime already passed
    this.autoMarkAbsentIfNeeded();
    this.absentInterval = setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
  }
}

async clockAction(employeeId: number, employeeName: string, department: string, action: 'IN' | 'OUT') {
  const currentDate = new Date ();
  const day = currentDate.getDay();

  //Sunday = 0, Saturday = 6
  if (day === 0 || day === 6) {
    alert('Attendance is not available on weekends.');
    return;
  }

  if (this.hasCompletedToday(employeeId)) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const data = [...this.attendanceSubject.value];
  const officeHours = this.officeHoursService.getOfficeHours();
  const workingWindow = await firstValueFrom(
    this.attendanceScheduleResolverService.resolve(String(employeeId), now)
  );

  // Find or create local record
  let record = data.find(r => r.employeeId === employeeId && r.date === today);
  this.ensureRegistered(employeeId, employeeName, department);

  if (!record) {
    record = {
      id: 0,
      employeeId: employeeId,
      employee: employeeName,
      department: department,
      date: today,
      checkIn: null,
      checkOut: null,
      checkInLocation: null,
      checkOutLocation: null,
      status: 'ABSENT',
      hours: 0
    };
    data.unshift(record);
  }

  record.appliedScheduleType = workingWindow.scheduleType;
  record.appliedScheduleId = Number(workingWindow.sourceId) || record.appliedScheduleId;
  record.appliedExpectedStart = workingWindow.openingTime;
  record.appliedExpectedEnd = workingWindow.closingTime;
  record.appliedShiftName = workingWindow.shiftName;

  // Capture location first
  const location = await this.getCurrentLocation();

  if (!location) {
    alert(
      'Unale to determine yourlocation. Pleaseensure your Location Services are enable and try again.'
    );
    return;
  }

  // Calculate distance from office
  let distanceFromOffice = 0;
  if (/*location &&*/ officeHours.companyLatitude && officeHours.companyLongitude) {
    distanceFromOffice = this.calculateDistance(
      location.lat, location.lng,
      officeHours.companyLatitude, officeHours.companyLongitude
    );
  }

  // Update local record
  if (action === 'IN') {
    record.checkIn = now.toISOString();
    record.checkInLocation = location
      ? { address: location.address, lat: location.lat, lng: location.lng }
      : null;

    if (record.overrideOpen) {
      record.status = 'PRESENT';
      record.overrideOpen = false;
    } else {
      const graceTime = this.convertToDateTime(workingWindow.latenessGracePeriod);
      record.status = now <= graceTime ? 'PRESENT' : 'LATE';
    }
  }

  if (action === 'OUT') {
    record.checkOut = now.toISOString();
    record.checkOutLocation = location
      ? { address: location.address, lat: location.lat, lng: location.lng }
      : null;
    record.hours = this.calculateHours(record.checkIn!, record.checkOut);
  }

  this.applyTrackingMetrics(record, workingWindow, today);

  // Push local update
  //this.attendanceSubject.next(data);

  // Save to local records map so API fetches can't overwrite it
  this.localRecords.set(
    this.localKey(employeeId, today),
    { ...record }
  );

  // Merge with current API data and publish
  const currentApiData = this.attendanceSubject.value.filter(
    r => !this.localRecords.has(
      this.localKey(r.employeeId, r.date ?? '')
    )
  );
  this.mergeAndPublish(currentApiData);

  // --- API calls (after local record is fully updated) ---
const numericEmployeeId = employeeId;

if (action === 'IN') {
  this.clockInApi(
    numericEmployeeId, 
    //employeeId, 
    now.toISOString(), 
    location?.address ?? '', 
    distanceFromOffice);
} else {
  if (!record.apiRecordId) {

    console.warn(
      'No API record ID found for clock-out',
      record
    );

    return;
  }

  this.clockOutApi(
    record.apiRecordId,
    numericEmployeeId, 
    now.toISOString(), 
    location?.address ?? '', 
    distanceFromOffice);
}

}


private applyTrackingMetrics(
  record: AttendanceTableRecord,
  workingWindow: WorkingWindow,
  dateIso: string
): void {
  const metrics = computeShiftTrackingMetrics(
    workingWindow,
    dateIso,
    {
      clockInIso: record.checkIn,
      clockOutIso: record.checkOut
    },
    { otThresholdMinutes: 30 }
  );

  record.shiftMetrics = metrics;
  record.hours = +metrics.workedHours.toFixed(2);

  if (record.overrideOpen) {
    return;
  }

  if (metrics.isAbsent) {
    record.status = 'ABSENT';
    return;
  }

  if (metrics.isOvertime) {
    record.status = 'OVERTIME';
    return;
  }

  record.status = metrics.isLate ? 'LATE' : 'PRESENT';
}

private enrichRecordMetrics(record: AttendanceTableRecord): AttendanceTableRecord {
  if (!record.date || !record.appliedExpectedStart || !record.appliedExpectedEnd) {
    return record;
  }

  const openingTime = this.toHHmm(record.appliedExpectedStart);
  const officeHours = this.officeHoursService.getOfficeHours();
  const graceMinutes = officeHours.latenessGracePeriod ? this.extractMinutes(officeHours.latenessGracePeriod) : 15;
  const graceTime = this.addMinutes(openingTime, graceMinutes);

  const workingWindow: WorkingWindow = {
    scheduleType: record.appliedScheduleType ?? 'office-hours',
    openingTime: openingTime,
    latenessGracePeriod: graceTime,
    absentTime: this.addMinutes(openingTime, 180),
    closingTime: this.toHHmm(record.appliedExpectedEnd),
    sourceId: String(record.appliedScheduleId ?? 'api-schedule'),
    shiftName: record.appliedShiftName
  };

  this.applyTrackingMetrics(record, workingWindow, record.date);
  return record;
}

private toHHmm(value: unknown): string {
  if (Array.isArray(value)) {
    const hour = Number(value[0] ?? 0);
    const minute = Number(value[1] ?? 0);
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  if (value instanceof Date) {
    return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
  }

  if (value && typeof value === 'object') {
    const time = value as { hour?: number; minute?: number };
    if (time.hour !== undefined || time.minute !== undefined) {
      return `${String(Number(time.hour ?? 0)).padStart(2, '0')}:${String(Number(time.minute ?? 0)).padStart(2, '0')}`;
    }
  }

  const text = String(value ?? '').trim();
  const match = text.match(/(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, '0')}:${match[2]}`;
  }

  return '00:00';
}

private extractMinutes(timeStr: string | any[]): number {
  if (Array.isArray(timeStr)) {
    return Number(timeStr[1] ?? 0);
  }
  const match = String(timeStr).match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

private addMinutes(timeStr: string, minutes: number): string {
  const [hours, mins] = timeStr.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
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
    const start = new Date(inTime);
    const end = new Date(outTime);
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

updateAttendanceStatus(employeeId: number, employeeName: string, department: string, date: string, newStatus: AttendanceTableRecord['status']) {

  const data = [...this.attendanceSubject.value];

  const recordIndex = data.findIndex(
    r => r.employeeId === employeeId && r.date === date
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
      id: 0,
      employeeId: employeeId,
      employee: employeeName,
      department: department,
      date: date,
      checkIn: null,
      checkOut: null,
      checkInLocation: null,
      checkOutLocation: null,
      status: newStatus,
      hours: 0
    });

  }

  this.attendanceSubject.next(data);
}


// (empty ahhhh):
private registeredEmployees: { 
  id: number; 
  name: string; 
  department: string }[] = [];

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
      r => r.employeeId === emp.id && r.date === today
    );

    if (!recordExists) {
      const absentRecord: AttendanceTableRecord = {
      id: 0,
      employeeId: emp.id,
      employee: emp.name,
      department: emp.department,
      date: today,
      checkIn: null,
      checkOut: null,
      checkInLocation: null,
      checkOutLocation: null,
      status: 'ABSENT',
      hours: 0
    };

    const key = this.localKey(emp.id, today);

    // Only mark absent if not already in local records (employee may have just clocked in)
    if (!this.localRecords.has(key)) {
      this.localRecords.set(key, absentRecord);
      changed = true;
    }
    }
  });

  if (changed) {
    //this.attendanceSubject.next(data);
    const currentApiData = this.attendanceSubject.value.filter(
      r => !this.localRecords.has(
        this.localKey(r.employeeId, r.date ?? '')
      )
    );
    this.mergeAndPublish(currentApiData);
  }

}

getTodayStatusForEmployee(employeeId: number): 'CLOCKED_IN' | 'CLOCKED_OUT' | null {
  const today = new Date().toISOString().split('T')[0];
  const record = this.attendanceSubject.value.find(
    r => r.employeeId === employeeId && r.date === today
  );

  if (!record) return null;
  if (record.checkIn && !record.checkOut) return 'CLOCKED_IN';
  if (record.checkIn && record.checkOut) return 'CLOCKED_OUT';
  return null;
}

isEmployeeBlockedToday(employeeId: number): boolean {

  const today = new Date().toISOString().split('T')[0];

  const record = this.attendanceSubject.value.find(
    r => r.employeeId === employeeId && r.date === today
  );

  if (!record) return false;

  // Block only if absent AND not opened by admin
  if (record.status === 'ABSENT' && !record.overrideOpen) {
    return true;
  }

  return false;
}

openAttendanceForToday(employeeId: number, actorUserId: number, reason: string) {

  const today = new Date().toISOString().split('T')[0];
  const records = [...this.attendanceSubject.value];
  const record = records.find(r => r.employeeId === employeeId && r.date === today);

  if (!record) return;

  record.overrideOpen = true;
  this.attendanceSubject.next(records);

  // --- API call ---
  // We need the API record ID — use apiRecordId if same session,
  // or you'll need to store it per-employee (see note below)
  if (record.apiRecordId) {
    this.overrideOpenApi(record.apiRecordId, actorUserId, reason);
  } else {
    console.warn(
      'No API record ID available for override — call may be skipped' +
      `No API record ID on record for employee ${employeeId} — ` +
      `override was applied locally but NOT sent to the API. ` +
      `This happens if the employee clocked in before this session.`
    );
  }
}

hasCompletedToday(employeeId: number): boolean {
  const today = new Date().toDateString();

  const todayRecord = this.attendanceSubject.value.find(record => {
    if (!record.date) return false; //to guar against null
    return (
      record.employeeId === employeeId &&
      new Date(record.date).toDateString() === today
    );
  });

  // If record exists AND both clockIn & clockOut exist → completed
  return !!(todayRecord?.checkIn && todayRecord?.checkOut);
}

overrideAttendance(
  employeeId: number,
  date: string,
  newStatus: AttendanceTableRecord['status'],
  newCheckIn: string | null,
  reason: string,
  admin: { adminId: number; adminName: string }
) {

  const data = [...this.attendanceSubject.value];

  const record = data.find(
    r => r.employeeId === employeeId && r.date === date
  );

  if (!record) return;

  record.status = newStatus;
  record.checkIn = newCheckIn;

  record.overrideReason = reason;

  record.overriddenBy = admin;

  this.attendanceSubject.next(data);
}

importAttendance(records: AttendanceTableRecord[]) {
  const current = [...this.attendanceSubject.value];

  records.forEach(newRecord => {

    // Normalize missing fields (safety)
    newRecord.checkIn = newRecord.checkIn || null;
    newRecord.checkOut = newRecord.checkOut || null;

    // calculate hours here (central logic)
    if (newRecord.checkIn && newRecord.checkOut) {
      newRecord.hours = this.calculateHours(
        newRecord.checkIn,
        newRecord.checkOut
      );
    }

    //Ensure status fallback
    if (!newRecord.status) {
      newRecord.status = 'ABSENT';
    }

    //to check if record already exists (same ID+ date)
    const exists = current.find(
      r => r.employeeId === newRecord.employeeId && r.date === newRecord.date
    );

    if (!exists) {
      current.unshift(newRecord); // preserve date grouping
    } else {
      // Optional: overwrite existing record
      Object.assign(exists, {
        ...exists,
        ...newRecord});
    }
  });

  this.attendanceSubject.next(current);
}

private getCurrentLocation(): Promise<{ address: string; lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'YourAppName/1.0' } }
          );
          const json = await response.json();
          resolve({ address: json.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
        } catch {
          resolve({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });                            // if API fails, fall back to raw coords
        }
      },
      () => resolve(null),
      { enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0 }
    );
  });
}

private toIsoTime(localeTime: string): string {
  const date = new Date(`1970-01-01 ${localeTime}`);
  return date.toTimeString().split(' ')[0]; // returns HH:mm:ss
}

// ============ REPORTING METHODS ============

getWeeklySummary(startDate: string, endDate: string): any {
  const records = this.attendanceSubject.value;
  const start = new Date(startDate);
  const end = new Date(endDate);

  const filtered = records.filter(r => {
    if (!r.date) return false;
    const rDate = new Date(r.date);
    return rDate >= start && rDate <= end;
  });

  const summary = {
    period: { startDate, endDate },
    totalRecords: filtered.length,
    byStatus: {
      present: filtered.filter(r => r.status === 'PRESENT').length,
      late: filtered.filter(r => r.status === 'LATE').length,
      absent: filtered.filter(r => r.status === 'ABSENT').length,
      onLeave: filtered.filter(r => r.status === 'ON_LEAVE').length
    },
    avgHours: this.calculateAvgHours(filtered),
    totalOvertime: this.calculateTotalOvertime(filtered),
    records: filtered
  };

  return summary;
}

getMonthlySummary(year: number, month: number): any {
  const records = this.attendanceSubject.value;
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);

  const filtered = records.filter(r => {
    if (!r.date) return false;
    const rDate = new Date(r.date);
    return rDate >= startDate && rDate <= endDate;
  });

  const dailySummary: any[] = [];
  const tempMap = new Map<string, AttendanceTableRecord[]>();

  filtered.forEach(r => {
    if (!r.date) return;
    if (!tempMap.has(r.date)) {
      tempMap.set(r.date, []);
    }
    tempMap.get(r.date)!.push(r);
  });

  tempMap.forEach((recs, date) => {
    dailySummary.push({
      date,
      present: recs.filter(r => r.status === 'PRESENT').length,
      late: recs.filter(r => r.status === 'LATE').length,
      absent: recs.filter(r => r.status === 'ABSENT').length,
      totalRecords: recs.length
    });
  });

  return {
    period: { year, month },
    totalWorkDays: dailySummary.length,
    totalEmployeeRecords: filtered.length,
    byStatus: {
      present: filtered.filter(r => r.status === 'PRESENT').length,
      late: filtered.filter(r => r.status === 'LATE').length,
      absent: filtered.filter(r => r.status === 'ABSENT').length,
      onLeave: filtered.filter(r => r.status === 'ON_LEAVE').length
    },
    presentRate: this.calculatePresenceRate(filtered),
    absentRate: this.calculateAbsenceRate(filtered),
    avgHours: this.calculateAvgHours(filtered),
    totalOvertime: this.calculateTotalOvertime(filtered),
    dailyBreakdown: dailySummary
  };
}

getAbsenteeismTrend(days: number): any[] {
  const records = this.attendanceSubject.value;
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const filtered = records.filter(r => {
    if (!r.date) return false;
    const rDate = new Date(r.date);
    return rDate >= startDate && rDate <= endDate;
  });

  const trendMap = new Map<string, { date: string; absentCount: number; totalRecords: number; absentRate: number }>();

  filtered.forEach(r => {
    if (!r.date) return;
    if (!trendMap.has(r.date)) {
      trendMap.set(r.date, { date: r.date, absentCount: 0, totalRecords: 0, absentRate: 0 });
    }
    const entry = trendMap.get(r.date)!;
    entry.totalRecords++;
    if (r.status === 'ABSENT') {
      entry.absentCount++;
    }
  });

  const trend: any[] = [];
  trendMap.forEach((value, key) => {
    trend.push({
      ...value,
      absentRate: value.totalRecords > 0 ? +(value.absentCount / value.totalRecords * 100).toFixed(2) : 0
    });
  });

  return trend.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

getComplianceExportData(filters?: { startDate?: string; endDate?: string; department?: string; status?: string }): any[] {
  let records = this.attendanceSubject.value;

  if (filters?.startDate && filters?.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    records = records.filter(r => {
      if (!r.date) return false;
      const rDate = new Date(r.date);
      return rDate >= start && rDate <= end;
    });
  }

  if (filters?.department) {
    records = records.filter(r => r.department === filters.department);
  }

  if (filters?.status) {
    records = records.filter(r => r.status === filters.status);
  }

  return records.map(r => ({
    employeeId: r.employeeId,
    employeeName: r.employee,
    department: r.department,
    date: r.date,
    clockIn: r.checkIn,
    clockOut: r.checkOut,
    status: r.status,
    hours: r.hours,
    location: r.checkInLocation?.address || '-',
    verified: r.overrideOpen ? 'Yes' : 'No',
    verifiedBy: r.overriddenBy?.adminName || '-',
    notes: r.overrideReason || '-'
  }));
}

private calculateAvgHours(records: AttendanceTableRecord[]): number {
  if (records.length === 0) return 0;
  const total = records.reduce((sum, r) => sum + (r.hours || 0), 0);
  return +(total / records.length).toFixed(2);
}

private calculateTotalOvertime(records: AttendanceTableRecord[]): number {
  if (records.length === 0) return 0;
  // This assumes records have an overtime field; adjust if needed
  const total = records.reduce((sum, r) => sum + ((r as any).overtime || 0), 0);
  return +total.toFixed(2);
}

private calculatePresenceRate(records: AttendanceTableRecord[]): number {
  if (records.length === 0) return 0;
  const present = records.filter(r => r.status === 'PRESENT').length;
  return +(present / records.length * 100).toFixed(2);
}

private calculateAbsenceRate(records: AttendanceTableRecord[]): number {
  if (records.length === 0) return 0;
  const absent = records.filter(r => r.status === 'ABSENT').length;
  return +(absent / records.length * 100).toFixed(2);
}

}
