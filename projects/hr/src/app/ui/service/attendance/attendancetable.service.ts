import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
//import { MOCK_ATTENDANCE } from '../../domain/attendance/attendancetable.mock';
import { OfficeHoursService } from './office-hours.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../shared-component/environments/environment.prod';
import { map } from 'rxjs/operators';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

@Injectable({ providedIn: 'root' })
export class AttendancetableService {

  private attendanceSubject = new BehaviorSubject<AttendanceTableRecord[]>([]);

  // added these two properties after attendanceSubject:
  private localRecords = new Map<string, AttendanceTableRecord>(); // key: `${employeeId}_${date}`

  private localKey(employeeId: number, date: string): string {
    return `${employeeId}_${date}`;
  }

  attendance$ = this.attendanceSubject.asObservable();

  getAttendance(filters?: any): Observable<AttendanceTableRecord[]> {
    return of(this.attendanceSubject.value);
  }

  private absentTimeout: any;
  private absentInterval: any;
  private apiRecordId: number | null = null;

  constructor(private officeHoursService: OfficeHoursService, private http: HttpClient) {
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

private getAuthHeaders(): HttpHeaders {
  const token = sessionStorage.getItem('accessToken')
             ?? sessionStorage.getItem('token')
             ?? sessionStorage.getItem('Token')
             ?? '';

    const tenantId = 'optimax';

 /* const tenantId = sessionStorage.getItem('tenantId')
                ?? sessionStorage.getItem('X-Tenant-ID')
                ?? sessionStorage.getItem('clientId')
                ?? sessionStorage.getItem('tenant')
                ?? 'default'; // check DevTools for the actual sessionStorage key
*/
  // Try to get tenant ID from userBranchInfoRegData
  /*let tenantId = '';
  const branchRaw = sessionStorage.getItem('userBranchInfoRegData');
  if (branchRaw) {
    try {
      const branch = JSON.parse(branchRaw);
      // ⚠️ adjust field name after checking DevTools
      tenantId = branch.tenantId
              ?? branch.branchCode
              ?? branch.code
              ?? branch.clientId
              ?? '';
    } catch {
      console.warn('Failed to parse userBranchInfoRegData');
    }
  }

  if (!tenantId) {
    console.warn('X-Tenant-ID is missing — check userBranchInfoRegData in DevTools');
  }*/
  return new HttpHeaders({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenantId
  });
}

//nna to get the right employee id nnaaaaa
resolveHrEmployeeId(/*username*/sessionUserId: string): Observable<{ id: string; fullName: string; department: string } | null> {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/employees?page=1&size=100`,
    { headers: this.getAuthHeaders() }
  ).pipe(
    map(res => {
      const employees = res.content ?? res;
      //to log employees returned from api
      /*console.log('Employees API response:', employees);
      //const match = employees.find((e: any) => e.user?.username === username);
      
      employees.forEach((e: any) => {
        console.log( 'EMPLOYEE:',
          e.id,
          'LINKED USER:',
          e.user
        );
      }); */

      //

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
        (e: any) => e.user?.id?.toString() === sessionUserId.toString()
      );

      console.log('MATCHED EMPLOYEE:', match);

      if (!match){
        console.log('HR employee not found');
        return null;
      }
      return {
        id: match?.id?.toString(),
        department: match.department?.name ?? '',
        fullName: `${match.firstName ?? ''} ${match.lastName ?? ''}`.trim()
      }; 
    })
  );
}

private mapApiRecord(api: any): AttendanceTableRecord {
  const emp = api.employeeId; // nested employee object

  const fullName = emp
    ? `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim()
    : '';

  const department = emp?.department?.name ?? '';

  // Extract HH:mm:ss time from ISO string for display
  const toTimeStr = (iso: string | null): string | null => {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString();
    } catch {
      return null;
    }
  };

  // API stores location as plain string — wrap it for our DTO
  const toLocation = (locStr: string | null) => {
    if (!locStr) return null;
    return { address: locStr, lat: 0, lng: 0 };
  };

  return {
    //id: emp?.id?.toString() ?? api.id?.toString() ?? '',
    //attendanceRecordId: api.id?.toString(),
    //employeeId: emp?.id?.toString(),
    //id: emp?.id?.toString() ?? '',
    //apiRecordId: api.id,
    id: Number(api.id), //attendancerecordid
    employeeId: Number(emp?.id), //employeeid
    employee: fullName,
    department,
    date: api.attendanceDate ?? null,
    checkIn: toTimeStr(api.checkIn),
    checkOut: toTimeStr(api.checkOut),
    checkInLocation: toLocation(api.checkInLocation),
    checkOutLocation: toLocation(api.checkOutLocation),
    status: api.status ?? 'ABSENT',
    hours: api.hours ?? 0,
    overrideOpen: api.overrideOpen ?? false,
    overrideReason: api.overrideReason ?? '',
    overriddenBy: api.overrideBy
      ? { adminId: Number(api.overrideBy.userId), 
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
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords?page=${page}&size=${size}`,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => {
      const mapped = (res.content ?? []).map((r: any) => this.mapApiRecord(r));
      this.mergeAndPublish(mapped); // ← was attendanceSubject.next(mapped)
    },
    error: (err) => console.error('Failed to fetch attendance records:', err)
  });
}

// GET by date range (admin filter)
fetchByDateRange(from: string, to: string, page: number = 1, size: number = 100): void {
  this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/dateRange?from=${from}&to=${to}&page=${page}&size=${size}`,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => {
      const mapped = (res.content ?? []).map((r: any) => this.mapApiRecord(r));
      this.mergeAndPublish(mapped); // ← was attendanceSubject.next(mapped)
    },
    error: (err) => console.error('Failed to fetch records by date range:', err)
  });
}

// GET by employee ID (employee monthly table)
fetchByEmployee(employeeId: number, page: number = 1, size: number = 100): void {
  this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/employee/${employeeId}?page=${page}&size=${size}`,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => {
      const mapped = (res.content ?? []).map((r: any) => this.mapApiRecord(r));

       // TEMP: diagnostic log
      console.log('=== FETCH BY EMPLOYEE ===');
      console.log('Records returned:', mapped.map((r: AttendanceTableRecord) => ({ 
        id: r.id, 
        employee: r.employee,
        date: r.date 
      })));
      
      this.mergeAndPublish(mapped); // ← was attendanceSubject.next(mapped)
    },
    error: (err) => console.error('Failed to fetch employee records:', err)
  });
}

// GET single record by ID
fetchRecordById(id: number): Observable<AttendanceTableRecord> {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${id}`,
    { headers: this.getAuthHeaders() }
  ).pipe(
    map((res: any) => this.mapApiRecord(res))
  );
}
//POST
/*postAttendanceRecord(payload: {
  employeeId: number;
  attendanceDate: string;
  checkIn: string | null;
  checkOut: string | null;
  checkInLocation: string;
  checkOutLocation: string;
  checkInDistance: number;
  checkOutDistance: number;
  status: string;
  hours: number;
}): Observable<any> {
  const body = {
    id: 0,
    employeeId: payload.employeeId,
    attendanceDate: payload.attendanceDate,
    checkIn: payload.checkIn,
    checkOut: payload.checkOut,
    checkInLocation: payload.checkInLocation,
    checkOutLocation: payload.checkOutLocation,
    checkInDistance: payload.checkInDistance,
    checkOutDistance: payload.checkOutDistance,
    status: payload.status,
    hours: payload.hours,
    overrideOpen: false,
    overrideBy: 0,
    overrideReason: '',
    statusBeforeOverride: payload.status,
    appliedScheduleType: 'OFFICE_HOURS',
    appliedScheduleId: 0,
    appliedExpectedStart: payload.checkIn,
    appliedExpectedEnd: payload.checkOut,
    appliedShiftName: ''
  };

  return this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords`,
    body,
    { headers: this.getAuthHeaders() }
  );
} */

/*private putAttendanceRecord(id: number, payload: any): Observable<any> {
  return this.http.put<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${id}`,
    payload,
    { headers: this.getAuthHeaders() }
  );
}*/

/*private clockInApi(
  employeeId: number,
  checkIn: string,
  checkInLocation: string,
  checkInDistance: number
): void {
  const body = {
    employeeId,
    checkIn,
    checkInLocation,
    checkInDistance
  };

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockIn`,
    body,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => {
      if (res?.id) {
        this.apiRecordId = res.id;
        console.log('Clock-in successful, record ID:', this.apiRecordId);
      } else {
        console.warn('Clock-in succeeded but no ID returned');
      }
    },
    error: (err) => console.error('Clock-in failed:', err)
  });
}*/

private clockInApi(
  employeeId: number,
  //employeeIdStr: string,
  checkIn: string,
  checkInLocation: string,
  checkInDistance: number
): void {
  const body = { employeeId, checkIn, checkInLocation, checkInDistance };

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockIn`,
    body,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => {
      // Store on both the service-level variable AND the local record
      const returnedId = res?.id ?? res?.attendanceId ?? res?.recordId ?? null;

      if (returnedId) {
        this.apiRecordId = returnedId;

        // Persist it on the local record so admin can use it later
        const today = new Date().toISOString().split('T')[0];
        const records = [...this.attendanceSubject.value];
        const record = records.find(r => r.employeeId === employeeId && r.date === today);

        if (record) {
          record.apiRecordId = returnedId;
          this.attendanceSubject.next(records);
        }

        console.log('Clock-in successful, API record ID:', returnedId);
      } else {
        console.warn('Clock-in succeeded but no ID returned in response:', res);
      }
    },
    error: (err) => console.error('Clock-in failed:', err)
  });
}

private clockOutApi(
  employeeId: number,
  checkOut: string,
  checkOutLocation: string,
  checkOutDistance: number
): void {
  const body = {
    employeeId,
    checkOut,
    checkOutLocation,
    checkOutDistance
  };

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockOut`,
    body,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => {
      console.log('Clock-out successful:', res);
      this.apiRecordId = null; // reset for next session
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
    body,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => console.log('Override open successful:', res),
    error: (err) => console.error('Override open failed:', err)
  });
}

/*overrideOpenApi(
  recordId: number,
  actorUserId: number,
  reason: string
): void {
  const body = { actorUserId, reason };

  this.http.post<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${recordId}/override/open`,
    body,
    { headers: this.getAuthHeaders() }
  ).subscribe({
    next: (res) => console.log('Override open successful:', res),
    error: (err) => console.error('Override open failed:', err)
  });
}*/

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

  if (this.hasCompletedToday(employeeId)) return;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const data = [...this.attendanceSubject.value];
  const officeHours = this.officeHoursService.getOfficeHours();
  const closing = this.convertToDateTime(officeHours.closingTime);

  // Find or create local record
  let record = data.find(r => r.employee === employeeName && r.date === today);
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

  // Capture location first
  const location = await this.getCurrentLocation();

  // Calculate distance from office
  let distanceFromOffice = 0;
  if (location && officeHours.companyLatitude && officeHours.companyLongitude) {
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
      const graceTime = this.convertToDateTime(officeHours.latenessGracePeriod);
      record.status = now <= graceTime ? 'PRESENT' : 'LATE';
    }
  }

  if (action === 'OUT') {
    record.checkOut = now.toLocaleTimeString();
    record.checkOutLocation = location
      ? { address: location.address, lat: location.lat, lng: location.lng }
      : null;
    record.hours = this.calculateHours(record.checkIn!, record.checkOut);

    if (now > closing) {
      record.status = 'OVERTIME';
    }
  }

  // Push local update
  //this.attendanceSubject.next(data);

  // Save to local records map so API fetches can't overwrite it
  this.localRecords.set(
    this.localKey(employeeId, today),
    { ...record }
  );

  // Merge with current API data and publish
  const currentApiData = this.attendanceSubject.value.filter(
    r => !this.localRecords.has(this.localKey(r.id, r.date ?? ''))
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
  this.clockOutApi(
    numericEmployeeId, 
    now.toISOString(), 
    location?.address ?? '', 
    distanceFromOffice);
}

  // --- API calls (after local record is fully updated) ---
  /*const numericEmployeeId = parseInt(employeeid);

  if (action === 'IN') {

    const body = {
      id: 0,
      employeeId: numericEmployeeId,
      attendanceDate: today,
      checkIn: now.toISOString(),
      checkOut: null,
      checkInLocation: location?.address ?? '',
      checkOutLocation: '',
      checkInDistance: distanceFromOffice,
      checkOutDistance: 0,
      status: record.status,
      hours: 0,
      overrideOpen: record.overrideOpen ?? false,
      overrideBy: 0,
      overrideReason: '',
      statusBeforeOverride: record.status,
      appliedScheduleType: 'OFFICE_HOURS',
      appliedScheduleId: 0,
      appliedExpectedStart: null,
      appliedExpectedEnd: null,
      appliedShiftName: ''
    };

    this.http.post<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords`,
      body,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (res) => {
        if (res?.id) {
          this.apiRecordId = res.id;
          console.log('Clock-in posted, API record ID:', this.apiRecordId);
        } else {
          console.warn('POST succeeded but no ID returned — PUT may fail on clock-out');
        }
      },
      error: (err) => console.error('Clock-in POST failed:', err)
    });

  } else {

    if (!this.apiRecordId) {
      console.warn('No API record ID stored — skipping PUT for clock-out');
      return;
    }

    const body = {
      id: this.apiRecordId,
      employeeId: numericEmployeeId,
      attendanceDate: today,
      checkIn: record.checkIn
        ? new Date(`${today}T${this.toIsoTime(record.checkIn)}`).toISOString()
        : null,
      checkOut: now.toISOString(),
      checkInLocation: record.checkInLocation?.address ?? '',
      checkOutLocation: location?.address ?? '',
      checkInDistance: record.checkInLocation
        ? this.calculateDistance(
            record.checkInLocation.lat, record.checkInLocation.lng,
            officeHours.companyLatitude ?? 0, officeHours.companyLongitude ?? 0
          )
        : 0,
      checkOutDistance: distanceFromOffice,
      status: record.status,
      hours: record.hours ?? 0,
      overrideOpen: record.overrideOpen ?? false,
      overrideBy: 0,
      overrideReason: record.overrideReason ?? '',
      statusBeforeOverride: record.status,
      appliedScheduleType: 'OFFICE_HOURS',
      appliedScheduleId: 0,
      appliedExpectedStart: null,
      appliedExpectedEnd: null,
      appliedShiftName: ''
    };

    this.putAttendanceRecord(this.apiRecordId, body).subscribe({
      next: (res) => {
        console.log('Clock-out PUT succeeded:', res);
        this.apiRecordId = null; // reset for next session
      },
      error: (err) => console.error('Clock-out PUT failed:', err)
    });
  }*/
}

/*async clockAction(employeeid: string, employeeName: string, department: string, action: 'IN' | 'OUT') {
  const now = new Date();
  const isoNow = now.toISOString();
  const dateStr = now.toISOString().split('T')[0];

  //call the API
  const existingRecord = this.getTodayRecord(employeeid); // use your existing helper

  const payload = {
    employeeId: parseInt(employeeid),       // API expects a number
    attendanceDate: dateStr,
    checkIn:  action === 'IN'  ? isoNow : (existingRecord?.checkIn ?? isoNow),
    checkOut: action === 'OUT' ? isoNow : null,
    checkInLocation:  existingRecord?.checkInLocation?.address  ?? '',
    checkOutLocation: existingRecord?.checkOutLocation?.address ?? '',
    checkInDistance:  existingRecord?.checkInLocation  ? this.getDistance(existingRecord.checkInLocation)  : 0,
    checkOutDistance: existingRecord?.checkOutLocation ? this.getDistance(existingRecord.checkOutLocation) : 0,
    status: existingRecord?.status ?? 'PRESENT',
    hours:  existingRecord?.hours  ? parseFloat(existingRecord.hours) : 0
  };

  this.postAttendanceRecord(payload).subscribe({
    next: (res) => console.log('Attendance posted to API:', res),
    error: (err) => console.error('Failed to post attendance:', err)
  });

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
      checkInLocation: null,
      checkOutLocation: null,
      status: 'ABSENT',
      hours: 0
    };
    data.unshift(record);
  }

   // Capture location
  const location = await this.getCurrentLocation();


  const officeHours = this.officeHoursService.getOfficeHours();

  const opening = this.convertToDateTime(officeHours.openingTime);
  const closing = this.convertToDateTime(officeHours.closingTime);
  const graceTime = this.convertToDateTime(officeHours.latenessGracePeriod)

  // Calculate distance if company location is set and we got coords
  let distance: number | null = null;
  if (location && officeHours.companyLatitude && officeHours.companyLongitude) {
    distance = this.calculateDistance(
      location.lat,
      location.lng,
      officeHours.companyLatitude,
      officeHours.companyLongitude
    );
  }

  if (action === 'IN') {

  record.checkIn = now.toLocaleTimeString();
  record.checkInLocation = location
  ? {
      address: location.address,
      lat: location.lat,
      lng: location.lng
    }
  : null;  // to store location

  // If admin opened attendance, never mark late
  if (record.overrideOpen) {
    record.status = 'PRESENT';
    // Optional cleanup: remove override after successful clock-in
    record.overrideOpen = false;
  } else {
    const graceTime = this.convertToDateTime(officeHours.latenessGracePeriod);
     record.status = now <= graceTime ? 'PRESENT' : 'LATE';
  }
}

  if (action === 'OUT') {
    record.checkOut = now.toLocaleTimeString();
    record.checkOutLocation = location
    ? {
      address: location.address,
      lat: location.lat,
      lng: location.lng
    }
  : null;

    record.hours = this.calculateHours(record.checkIn!, record.checkOut);
    // OVERTIME logic (but do not remove LATE)
    if (now > closing) {
      record.status = 'OVERTIME';
    }
  }

  this.attendanceSubject.next(data);
}*/

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
      /*data.unshift({
        id: emp.id,
        employee: emp.name,
        department: emp.department,
        date: today,
        checkIn: null,
        checkOut: null,
        checkInLocation: null,
        checkOutLocation: null,
        status: 'ABSENT',
        hours: 0
      });

      changed = true;*/
    }
  });

  if (changed) {
    //this.attendanceSubject.next(data);
    const currentApiData = this.attendanceSubject.value.filter(
      r => !this.localRecords.has(this.localKey(r.id, r.date ?? ''))
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

/*openAttendanceForToday(employeeId: string) {

  const today = new Date().toISOString().split('T')[0];

  const records = [...this.attendanceSubject.value];

  const record = records.find(
    r => r.employeeId === employeeId && r.date === today
  );

  if (!record) return;

  record.overrideOpen = true; //allow record override
  //record.status = 'PRESENT'; // immediately mark PRESENT

  this.attendanceSubject.next(records);
}*/

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
      { timeout: 8000, maximumAge: 0 }
    );
  });
}

private toIsoTime(localeTime: string): string {
  const date = new Date(`1970-01-01 ${localeTime}`);
  return date.toTimeString().split(' ')[0]; // returns HH:mm:ss
}

}
