import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
import { OfficeHoursService } from './office-hours.service';
import { AttendanceScheduleResolverService } from './attendanceschedulreresolver.service';
import { WorkingWindow } from '../../domain/attendance/working-window.dto';
import { computeShiftTrackingMetrics } from '../workschedule-shift/shift-based-tracking.util';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared-component/environments/environment.prod';
import { map } from 'rxjs/operators';
import { MOCK_ATTENDANCE_RECORDS } from '../../domain/attendance/mock-attendance-data';

// Backend mode: try live backend (https://be.optimaxsuites.com) first, with mock fallback if offline
// Set to TRUE to test cross-branch approvals, remote check-in, and other features with mock data
const USE_MOCK_DATA_ONLY = true;

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

/**
 * "Today" in the user's own timezone.
 *
 * toISOString() converts to UTC first, so at UTC+1 every clock-in before
 * 01:00 local was being filed under the previous day — and a night shift
 * would resolve the wrong day's schedule entirely. Every date-keyed lookup
 * in this service must go through here so reads and writes agree.
 */
function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Extract time-only (HH:mm:ss) from a Date object in local timezone
 */
function toLocalTimeString(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  const second = String(date.getSeconds()).padStart(2, '0');
  return `${hour}:${minute}:${second}`;
}

// Constants
const STORAGE_KEYS = {
  OFFICE_HOURS: 'officeHours'
};

const API_ENDPOINTS = {
  ALL_RECORDS: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records`,
  RECORDS_BY_RANGE: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records/date-range`,
  RECORD_BY_ID: (id: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records/${id}`,
  RECORD_BY_EMPLOYEE: (id: string) => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records/employee/${id}`,
  CLOCK_IN: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records/clock-in`,
  CLOCK_OUT: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records/clock-out`,
  OVERRIDE_OPEN: (id: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendance-records/${id}/override/open`,
  EMPLOYEES: () => `${environment.apiBaseUrl}/x/api/v2/hr/employees?page=1&size=100`
};

interface RegisteredEmployee {
  id: string;
  name: string;
  department: string;
}

interface ParsedEmployeeResponse {
  id: number;
  fullName: string;
  department: string;
}

const ATTENDANCE_STORAGE_KEY = 'attendanceTestData';

@Injectable({ providedIn: 'root' })
export class AttendancetableService implements OnDestroy {
  private attendanceSubject = new BehaviorSubject<AttendanceTableRecord[]>(
    this.loadInitialData()
  );
  private clockStatusSubject = new BehaviorSubject<ClockStatus>('CLOCKED_OUT');
  private totalRecordsSubject = new BehaviorSubject<number>(0);

  private localRecords = new Map<string, AttendanceTableRecord>();
  private registeredEmployees: RegisteredEmployee[] = [];
  private lastAbsentRunDate: string | null = null;

  private absentTimeout: NodeJS.Timeout | null = null;
  private absentInterval: NodeJS.Timeout | null = null;
  private officeHoursSubscription: Subscription | null = null;

  attendance$ = this.attendanceSubject.asObservable();
  clockStatus$ = this.clockStatusSubject.asObservable();
  totalRecords$ = this.totalRecordsSubject.asObservable();

  constructor(
    private officeHoursService: OfficeHoursService,
    private http: HttpClient,
    private attendanceScheduleResolverService: AttendanceScheduleResolverService
  ) {
    this.scheduleAbsentCheck();
    this.officeHoursSubscription = this.officeHoursService.officeHours$.subscribe(() => {
      this.scheduleAbsentCheck();
    });
    this.fetchAllRecords();
  }

  private loadInitialData(): AttendanceTableRecord[] {
    return this.loadFromStorage();
  }

  ngOnDestroy() {
    if (this.absentTimeout) {
      clearTimeout(this.absentTimeout);
    }
    if (this.absentInterval) {
      clearInterval(this.absentInterval);
    }
    if (this.officeHoursSubscription) {
      this.officeHoursSubscription.unsubscribe();
    }
  }

  // ────────────────────────────────────────────────────────────
  // Public API Methods
  // ────────────────────────────────────────────────────────────

  getAttendance(): Observable<AttendanceTableRecord[]> {
    return of(this.attendanceSubject.value);
  }

  getClockStatus(): ClockStatus {
    return this.clockStatusSubject.value;
  }

  setClockStatus(status: ClockStatus): void {
    this.clockStatusSubject.next(status);
  }

  updateEmployeeIdentity(employeeId: string, employeeName: string, department: string): void {
    const name = employeeName.trim();
    const team = department.trim() || 'Default Department';
    if (!name) return;

    const records = this.attendanceSubject.value.map(record =>
      record.employeeId === employeeId
        && (!record.employee || !record.department || record.department === 'Default Department')
        ? { ...record, employee: record.employee || name, department: record.department || team }
        : record
    );

    this.attendanceSubject.next(records);
    this.saveToStorage(records);
  }

  getTodayRecordForEmployee(employeeId: string): AttendanceTableRecord | undefined {
    const today = toLocalDateString(new Date());
    return this.attendanceSubject.value.find(
      r => r.employeeId === employeeId && (r.date instanceof Date ? toLocalDateString(r.date) : r.date) === today
    );
  }

  getTodayStatusForEmployee(employeeId: string): 'CLOCKED_IN' | 'CLOCKED_OUT' | null {
    const today = toLocalDateString(new Date());
    const record = this.attendanceSubject.value.find(
      r => r.employeeId === employeeId && (r.date instanceof Date ? toLocalDateString(r.date) : r.date) === today
    );

    if (!record) return null;
    if (record.checkIn && !record.checkOut) return 'CLOCKED_IN';
    if (record.checkIn && record.checkOut) return 'CLOCKED_OUT';
    return null;
  }

  isEmployeeBlockedToday(employeeId: string): boolean {
    const today = toLocalDateString(new Date());
    const record = this.attendanceSubject.value.find(
      r => r.employeeId === employeeId && (r.date instanceof Date ? toLocalDateString(r.date) : r.date) === today
    );

    if (!record) return false;
    return record.status === 'ABSENT' && !record.overrideOpen;
  }

  hasCompletedToday(employeeId: string): boolean {
    // record.date is a Date object, so convert to string for comparison
    const today = toLocalDateString(new Date());
    const todayRecord = this.attendanceSubject.value.find(
      record => record.employeeId === employeeId && (record.date instanceof Date ? toLocalDateString(record.date) : record.date) === today
    );

    return !!(todayRecord?.checkIn && todayRecord?.checkOut);
  }

  // ────────────────────────────────────────────────────────────
  // Fetch Methods
  // ────────────────────────────────────────────────────────────

  fetchAllRecords(page: number = 1, size: number = 100): void {
    // In development mode, use fresh mock data (ignore localStorage cache)
    if (USE_MOCK_DATA_ONLY) {
      // Simulate pagination with mock data
      const start = (page - 1) * size;
      const end = start + size;
      const paginatedData = MOCK_ATTENDANCE_RECORDS.slice(start, end);
      
      this.mergeAndPublish(paginatedData.length > 0 ? paginatedData : MOCK_ATTENDANCE_RECORDS);
      this.totalRecordsSubject.next(MOCK_ATTENDANCE_RECORDS.length);
      return;
    }

    this.http.get<any>(API_ENDPOINTS.ALL_RECORDS() + `?page=${page}&size=${size}`).subscribe({
      next: (res) => this.handleFetchSuccess(res),
      error: (err) => this.handleFetchError('fetchAllRecords', err)
    });
  }

  fetchByDateRange(from: string, to: string, page: number = 1, size: number = 100): void {
    // In development mode, skip API calls and use mock data
    if (USE_MOCK_DATA_ONLY) {
      // Simulate pagination with mock data
      const start = (page - 1) * size;
      const end = start + size;
      const paginatedData = MOCK_ATTENDANCE_RECORDS.slice(start, end);
      
      this.mergeAndPublish(paginatedData.length > 0 ? paginatedData : MOCK_ATTENDANCE_RECORDS);
      this.totalRecordsSubject.next(MOCK_ATTENDANCE_RECORDS.length);
      return;
    }

    const url = `${API_ENDPOINTS.RECORDS_BY_RANGE()}?from=${from}&to=${to}&page=${page}&size=${size}`;
    this.http.get<any>(url).subscribe({
      next: (res) => this.handleFetchSuccess(res),
      error: (err) => this.handleFetchError('fetchByDateRange', err)
    });
  }

  fetchByEmployee(employeeId: string, page: number = 1, size: number = 100): void {
    // In development mode, skip API calls and use fresh mock data
    if (USE_MOCK_DATA_ONLY) {
      this.mergeAndPublish(MOCK_ATTENDANCE_RECORDS);
      return;
    }

    this.http.get<any>(API_ENDPOINTS.RECORD_BY_EMPLOYEE(employeeId) + `?page=${page}&size=${size}`).subscribe({
      next: (res) => this.handleFetchSuccess(res),
      error: (err) => this.handleFetchError('fetchByEmployee', err)
    });
  }

  fetchEmployeeRecords(employeeId: string): Observable<AttendanceTableRecord[]> {
    this.fetchByEmployee(employeeId);
    return this.attendance$;
  }

  fetchDailyRecords(): Observable<AttendanceTableRecord[]> {
    this.fetchAllRecords();
    return this.attendance$;
  }

  dateArrayToStr(date: string | number[] | null | undefined): string {
    if (typeof date === 'string') return date;
    if (Array.isArray(date)) {
      return `${date[0]}-${String(date[1]).padStart(2, '0')}-${String(date[2]).padStart(2, '0')}`;
    }
    return '';
  }

  fetchRecordById(id: number): Observable<AttendanceTableRecord> {
    return this.http.get<any>(API_ENDPOINTS.RECORD_BY_ID(id)).pipe(
      map((res: any) => this.enrichRecordMetrics(this.mapApiRecord(res)))
    );
  }

  resolveHrEmployeeId(sessionUserId: number): Observable<ParsedEmployeeResponse | null> {
    return this.http.get<any>(API_ENDPOINTS.EMPLOYEES()).pipe(
      map(res => {
        const employees = res.content ?? res;
        const match = employees.find(
          (e: any) => Number(e.user?.userId) === sessionUserId
        );

        if (!match) return null;

        return {
          id: Number(match.id),
          department: match.department?.name ?? '',
          fullName: `${match.firstName ?? ''} ${match.lastName ?? ''}`.trim()
        };
      })
    );
  }

  // ────────────────────────────────────────────────────────────
  // Clock In/Out
  // ────────────────────────────────────────────────────────────

  async clockAction(
    employeeId: string,
    employeeName: string,
    department: string,
    action: 'IN' | 'OUT'
  ): Promise<void> {
    employeeName = employeeName.trim() || `Employee ${employeeId}`;
    department = department.trim() || 'Default Department';
    if (!this.isWorkingDay()) {
      if (USE_MOCK_DATA_ONLY || environment.env === 'development') {
        console.warn('Clocking in on a non-working day allowed for testing in development mode.');
      } else {
        alert('Attendance is not available on weekends.');
        return;
      }
    }

    if (action === 'IN' && this.hasCompletedToday(employeeId)) {
      if (!USE_MOCK_DATA_ONLY && environment.env !== 'development') {
        throw new Error('Today\'s attendance is already completed.');
      }
    }

    const now = new Date();
    const today = toLocalDateString(now);
    const data = [...this.attendanceSubject.value];
    const officeHours = this.officeHoursService.getOfficeHours();

    // Always resolve against the shift schedule. This used to be skipped in
    // development in favour of hardcoded 09:00–17:00 office hours, which meant
    // a clock-in never picked up the employee's assigned shift times locally.
    // The resolver is synchronous (of()) and falls back to office hours on its
    // own when no shift is assigned, so there is nothing to gain by skipping it.
    const workingWindow: WorkingWindow = await firstValueFrom(
      this.attendanceScheduleResolverService.resolve(String(employeeId), now)
    );

    let record = data.find(r => r.employeeId === employeeId && (r.date instanceof Date ? toLocalDateString(r.date) : r.date) === today);
    if (action === 'OUT' && (!record || !record.checkIn || record.checkOut)) {
      throw new Error('You must clock in before clocking out.');
    }
    if (record) {
      record = { ...record };
    }
    this.ensureRegistered(employeeId, employeeName, department);

    if (!record) {
      record = this.createNewRecord(employeeId, employeeName, department, today);
      data.unshift(record);
    }

    record.appliedScheduleType = workingWindow.scheduleType;
    record.appliedScheduleId = workingWindow.scheduleType === 'shift'
      ? workingWindow.sourceId
      : record.appliedScheduleId;
    record.appliedExpectedStart = workingWindow.openingTime;
    record.appliedExpectedEnd = workingWindow.closingTime;
    record.appliedShiftName = workingWindow.shiftName;

    const location = await this.getCurrentLocation();
    if (action === 'IN' && !location) {
      throw new Error('Location permission is required to clock in.');
    }
    const distanceFromOffice = this.calculateDistanceFromOffice(location, officeHours);

    if (action === 'IN') {
      // Keep the instant for metrics/API consistency. The UI formats this
      // timestamp back to the user's local HH:mm time.
      record.checkIn = toLocalTimeString(now);
      record.checkInLocation = this.formatLocation(location);
      record.status = record.overrideOpen ? 'PRESENT' : this.getCheckInStatus(now, workingWindow);
    } else if (action === 'OUT') {
      record.checkOut = toLocalTimeString(now);
      record.checkOutLocation = this.formatLocation(location);

      record.hours = this.calculateHours(record.checkIn!, record.checkOut);
    }

    this.applyTrackingMetrics(record, workingWindow, today);

    if (action === 'IN') {
      try {
        const response = await this.clockInApi(
          employeeId,
          now.toISOString(),
          location?.address ?? '',
          distanceFromOffice
        );
        const returnedId = response?.id ?? response?.attendanceId ?? response?.recordId;
        if (returnedId) {
          record.apiRecordId = Number(returnedId);
        }
      } catch (apiErr) {
        console.warn('Backend clock-in API call failed; saving record locally:', apiErr);
      }
      this.localRecords.set(this.localKey(employeeId, today), { ...record });
      this.attendanceSubject.next([...this.attendanceSubject.value]);
      this.saveToStorage(this.attendanceSubject.value);
    } else {
      if (record.apiRecordId) {
        try {
          await this.clockOutApi(
            record.apiRecordId,
            employeeId,
            now.toISOString(),
            location?.address ?? '',
            distanceFromOffice
          );
        } catch (apiErr) {
          console.warn('Backend clock-out API call failed; saving record locally:', apiErr);
        }
      }
    }

    this.updateLocalAndPublish(employeeId, today, record);
  }

  // ────────────────────────────────────────────────────────────
  // Remote Check-in
  // ────────────────────────────────────────────────────────────

  async recordRemoteCheckIn(
    employeeId: string,
    employeeName: string,
    department: string,
    metadata: any
  ): Promise<void> {
    const now = new Date();
    const today = toLocalDateString(now);
    const data = [...this.attendanceSubject.value];
    const officeHours = this.officeHoursService.getOfficeHours();
    const workingWindow = await firstValueFrom(
      this.attendanceScheduleResolverService.resolve(String(employeeId), now)
    );

    let record = data.find(r => r.employeeId === employeeId && toLocalDateString(r.date || new Date()) === today);
    this.ensureRegistered(employeeId, employeeName, department);

    if (!record) {
      record = this.createNewRecord(employeeId, employeeName, department, today);
      record.checkIn = toLocalTimeString(now);
      data.unshift(record);
    } else {
      record.checkIn = toLocalTimeString(now);
    }

    record.checkInLocation = metadata?.geoAddress ? {
      address: metadata.geoAddress,
      lat: metadata.gpsCoordinates?.lat || 0,
      lng: metadata.gpsCoordinates?.lng || 0
    } : null;

    record.appliedScheduleType = workingWindow.scheduleType;
    record.appliedScheduleId = workingWindow.scheduleType === 'shift'
      ? workingWindow.sourceId
      : record.appliedScheduleId;
    record.appliedExpectedStart = workingWindow.openingTime;
    record.appliedExpectedEnd = workingWindow.closingTime;
    record.appliedShiftName = workingWindow.shiftName;
    record.clockInSource = 'REMOTE'; // Web button click

    const graceTime = this.convertToDateTime(workingWindow.latenessGracePeriod);
    if (!record.overrideOpen) {
      record.status = now <= graceTime ? 'PRESENT' : 'LATE';
    }

    const distanceFromOffice = metadata?.gpsCoordinates
      ? this.calculateDistance(
        metadata.gpsCoordinates.lat,
        metadata.gpsCoordinates.lng,
        officeHours.companyLatitude || 0,
        officeHours.companyLongitude || 0
      )
      : 0;

    const response = await this.clockInApi(
      employeeId,
      now.toISOString(),
      metadata?.geoAddress || 'Remote',
      distanceFromOffice,
      {
        userAgent: metadata?.userAgent,
        networkType: metadata?.networkType,
        vpnDetected: metadata?.vpnDetected,
        geoAddress: metadata?.geoAddress,
        accuracy: metadata?.accuracy
      }
    );
    const returnedId = response?.id ?? response?.attendanceId ?? response?.recordId;
    if (returnedId) {
      record.apiRecordId = Number(returnedId);
    }

    this.applyTrackingMetrics(record, workingWindow, today);
    this.updateLocalAndPublish(employeeId, today, record);
  }

  // ────────────────────────────────────────────────────────────
  // Override & Status Updates
  // ────────────────────────────────────────────────────────────

  openAttendanceForToday(employeeId: string, actorUserId: number, reason: string): void {
    const today = toLocalDateString(new Date());
    const records = [...this.attendanceSubject.value];
    const record = records.find(r => r.employeeId === employeeId && toLocalDateString(r.date || new Date()) === today);

    if (!record) return;

    record.overrideOpen = true;
    this.attendanceSubject.next(records);
    localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));

    if (record.apiRecordId) {
      this.overrideOpenApi(record.apiRecordId, actorUserId, reason);
    }
  }

  refreshFromLocalStorage(records: AttendanceTableRecord[]): void {
    this.localRecords.clear();
    this.attendanceSubject.next(records);
    this.saveToStorage(records);
  }

  overrideAttendance(
    employeeId: string,
    date: string,
    newStatus: AttendanceTableRecord['status'],
    newCheckIn: string | null,
    reason: string,
    admin: { adminId: number; adminName: string }
  ): void {
    const data = [...this.attendanceSubject.value];
    const record = data.find(r => r.employeeId === employeeId && toLocalDateString(r.date || new Date()) === date);

    if (!record) return;

    record.status = newStatus;
    record.checkIn = newCheckIn;
    record.overrideReason = reason;
    record.overriddenBy = admin;

    this.attendanceSubject.next(data);
  }

  updateAttendanceStatus(
    employeeId: string,
    employeeName: string,
    department: string,
    date: string,
    newStatus: AttendanceTableRecord['status']
  ): void {
    const data = [...this.attendanceSubject.value];
    const recordIndex = data.findIndex(r => r.employeeId === employeeId && toLocalDateString(r.date || new Date()) === date);

    if (recordIndex !== -1) {
      data[recordIndex] = { ...data[recordIndex], status: newStatus };
    } else {
      data.unshift({
        id: 0,
        employeeId,
        employee: employeeName,
        department,
        date: new Date(date),
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

  importAttendance(records: AttendanceTableRecord[]): void {
    const current = [...this.attendanceSubject.value];

    records.forEach(newRecord => {
      newRecord.checkIn = newRecord.checkIn || null;
      newRecord.checkOut = newRecord.checkOut || null;

      if (newRecord.checkIn && newRecord.checkOut) {
        newRecord.hours = this.calculateHours(newRecord.checkIn, newRecord.checkOut);
      }

      newRecord.status = newRecord.status || 'ABSENT';

      const exists = current.find(
        r => r.employeeId === newRecord.employeeId && r.date === newRecord.date
      );

      if (!exists) {
        current.unshift(newRecord);
      } else {
        Object.assign(exists, { ...exists, ...newRecord });
      }
    });

    this.attendanceSubject.next(current);
  }

  // ────────────────────────────────────────────────────────────
  // Reporting
  // ────────────────────────────────────────────────────────────

  getWeeklySummary(startDate: string, endDate: string): any {
    const records = this.attendanceSubject.value;

    const filtered = records.filter(r => {
      if (!r.date) return false;
      const dateStr = toLocalDateString(r.date);
      return dateStr >= startDate && dateStr <= endDate;
    });

    return {
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
  }

  getMonthlySummary(year: number, month: number): any {
    const records = this.attendanceSubject.value;
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;

    const filtered = records.filter(r => {
      if (!r.date) return false;
      const dateStr = toLocalDateString(r.date);
      return dateStr >= startDate && dateStr <= endDate;
    });

    const dailySummary: any[] = [];
    const tempMap = new Map<string, AttendanceTableRecord[]>();

    filtered.forEach(r => {
      if (!r.date) return;
      const dateKey = toLocalDateString(r.date);
      if (!tempMap.has(dateKey)) {
        tempMap.set(dateKey, []);
      }
      tempMap.get(dateKey)!.push(r);
    });

    tempMap.forEach((recs, dateKey) => {
      dailySummary.push({
        date: recs[0].date,  // Use the Date object from first record
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
      const dateStr = toLocalDateString(r.date);
      const startStr = toLocalDateString(startDate);
      const endStr = toLocalDateString(endDate);
      return dateStr >= startStr && dateStr <= endStr;
    });

    const trendMap = new Map<string, { date: string; absentCount: number; totalRecords: number; absentRate: number }>();

    filtered.forEach(r => {
      if (!r.date) return;
      const dateKey = toLocalDateString(r.date);
      if (!trendMap.has(dateKey)) {
        trendMap.set(dateKey, { date: dateKey, absentCount: 0, totalRecords: 0, absentRate: 0 });
      }
      const entry = trendMap.get(dateKey)!;
      entry.totalRecords++;
      if (r.status === 'ABSENT') {
        entry.absentCount++;
      }
    });

    const trend: any[] = [];
    trendMap.forEach((value, dateKey) => {
      trend.push({
        date: new Date(dateKey),  // Convert string back to Date object for template
        absentCount: value.absentCount,
        totalRecords: value.totalRecords,
        absentRate: value.totalRecords > 0 ? +(value.absentCount / value.totalRecords * 100).toFixed(2) : 0
      });
    });

    return trend.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  getComplianceExportData(filters?: { startDate?: string; endDate?: string; department?: string; status?: string }): any[] {
    let records = this.attendanceSubject.value;

    if (filters?.startDate && filters?.endDate) {
      records = records.filter(r => {
        if (!r.date) return false;
        const dateStr = toLocalDateString(r.date);
        return dateStr >= filters.startDate! && dateStr <= filters.endDate!;
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

  // ────────────────────────────────────────────────────────────
  // Private Helper Methods
  // ────────────────────────────────────────────────────────────

  private handleFetchSuccess(res: any): void {
    const mapped = (res.content ?? [])
      .map((r: any) => this.enrichRecordMetrics(this.mapApiRecord(r)))
      .filter((r: AttendanceTableRecord) => this.shouldIncludeRecord(r));

    // Extract pagination metadata
    const totalElements = res.totalElements ?? res.total ?? mapped.length;
    this.totalRecordsSubject.next(totalElements);

    // If API returns empty results, use mock data as fallback
    if (mapped.length === 0) {
      this.mergeAndPublish(MOCK_ATTENDANCE_RECORDS);
      this.totalRecordsSubject.next(MOCK_ATTENDANCE_RECORDS.length);
    } else {
      this.mergeAndPublish(mapped);
    }
  }

  private handleFetchError(method: string, err: any): void {
    const errorMsg = err?.error?.message ?? err?.message ?? err?.statusText ?? 'Unknown error';
    const status = err?.status || 'unknown status';
    // Use mock data as fallback
    this.mergeAndPublish(MOCK_ATTENDANCE_RECORDS);
  }

  private shouldIncludeRecord(record: AttendanceTableRecord): boolean {
    const date = new Date(record.date!);
    const day = date.getDay();
    const isWeekend = day === 0 || day === 6;
    return !(isWeekend && record.status === 'ABSENT');
  }

  private mapApiRecord(api: any): AttendanceTableRecord {
    const emp = api.employeeId;
    const fullName = emp ? `${emp.lastName ?? ''} ${emp.firstName ?? ''}`.trim() : '';
    const department = emp?.department?.name ?? '';

    return {
      id: Number(api.id),
      apiRecordId: Number(api.id),
      employeeId: String(emp?.id),
      employee: fullName,
      department,
      date: this.toDateOnly(api.attendanceDate),
      checkIn: this.toTimeOnly(api.checkIn),
      checkOut: this.toTimeOnly(api.checkOut),
      checkInLocation: this.toLocation(api.checkInLocation),
      checkOutLocation: this.toLocation(api.checkOutLocation),
      status: api.attendanceStatus ?? (api.checkIn ? (api.checkOut ? 'PRESENT' : 'PRESENT') : 'ABSENT'),
      recordStatus: api.recordStatus ?? api.status,
      hours: api.totalHours ?? 0,
      overrideOpen: api.overrideOpen ?? false,
      overrideReason: api.overrideReason ?? '',
      overriddenBy: api.overrideBy
        ? { adminId: Number(api.overrideBy.hrEmployeeId), adminName: api.overrideBy.fullname }
        : undefined,
      appliedScheduleType: api.appliedScheduleType === 'OFFICE_HOURS' ? 'office-hours' : 'shift',
      appliedScheduleId: api.appliedScheduleId ? String(api.appliedScheduleId) : undefined,
      appliedExpectedStart: api.appliedExpectedStart,
      appliedExpectedEnd: api.appliedExpectedEnd,
      appliedShiftName: api.appliedShiftName
    };
  }

  private toDateTime(value: any): string | null {
    if (!value) return null;

    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
      return new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1000000)).toISOString();
    }

    return value;
  }

  private toTimeOnly(value: any): string | null {
    if (!value) return null;

    if (Array.isArray(value)) {
      const [year, month, day, hour = 0, minute = 0, second = 0] = value;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
    }

    // If it's already a string, try to extract time portion
    if (typeof value === 'string') {
      // If it contains a space (datetime format), take the time part
      if (value.includes(' ')) {
        return value.split(' ')[1];
      }
      // If it contains 'T' (ISO format), extract time
      if (value.includes('T')) {
        return value.split('T')[1].split('.')[0];
      }
      // Otherwise return as-is (might already be time-only)
      return value;
    }

    return value;
  }

  private toDateOnly(value: any): Date | null {
    if (!value) return null;

    if (Array.isArray(value)) {
      const [year, month, day] = value;
      return new Date(year, month - 1, day);
    }

    if (typeof value === 'string') {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (value instanceof Date) {
      return value;
    }

    return null;
  }

  private toLocation(locStr: string | null) {
    if (!locStr) return null;
    return { address: locStr, lat: 0, lng: 0 };
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

  private mergeAndPublish(apiRecords: AttendanceTableRecord[]): void {
    const merged = [...apiRecords];

    this.localRecords.forEach((localRecord, key) => {
      const index = merged.findIndex(r => this.localKey(r.employeeId, toLocalDateString(r.date || new Date())) === key);

      if (index !== -1) {
        merged[index] = { ...merged[index], ...localRecord };
      } else {
        merged.unshift(localRecord);
      }
    });

    // Keep the schedule snapshot authoritative; use office hours only when
    // older records do not contain assigned shift times.
    merged.forEach(record => {
      if (record.appliedExpectedStart && record.appliedExpectedEnd) {
        const openingTime = this.toHHmm(record.appliedExpectedStart);
        const window: WorkingWindow = {
          scheduleType: record.appliedScheduleType ?? 'office-hours',
          openingTime,
          latenessGracePeriod: this.addMinutes(openingTime, this.getOfficeOffset('latenessGracePeriod')),
          absentTime: this.addMinutes(openingTime, this.getOfficeOffset('absentTime')),
          closingTime: this.toHHmm(record.appliedExpectedEnd),
          sourceId: String(record.appliedScheduleId ?? 'attendance-schedule'),
          shiftName: record.appliedShiftName
        };
        this.applyTrackingMetrics(record, window, record.date ? toLocalDateString(record.date) : toLocalDateString(new Date()));
      } else {
        record.status = this.calculateAttendanceStatus(record);
      }
    });

    this.attendanceSubject.next(merged);
    // Save to localStorage for admin dashboard
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(merged));
    } catch {
      // Storage error, continue
    }
  }

  private updateLocalAndPublish(employeeId: string, date: string, record: AttendanceTableRecord): void {
    this.localRecords.set(this.localKey(employeeId, date), { ...record });

    const currentApiData = this.attendanceSubject.value.filter(
      r => !this.localRecords.has(this.localKey(r.employeeId, r.date instanceof Date ? toLocalDateString(r.date) : ''))
    );

    this.mergeAndPublish(currentApiData);
  }

  private createNewRecord(
    employeeId: string,
    employeeName: string,
    department: string,
    date: string
  ): AttendanceTableRecord {
    return {
      id: 0,
      employeeId,
      employee: employeeName,
      department,
      date: new Date(date),
      checkIn: null,
      checkOut: null,
      checkInLocation: null,
      checkOutLocation: null,
      status: 'ABSENT',
      hours: 0
    };
  }

  private getCheckInStatus(now: Date, workingWindow: WorkingWindow): 'PRESENT' | 'LATE' {
    const graceTime = this.convertToDateTime(workingWindow.latenessGracePeriod);
    return now <= graceTime ? 'PRESENT' : 'LATE';
  }

  private formatLocation(location: { address: string; lat: number; lng: number } | null) {
    return location ? { address: location.address, lat: location.lat, lng: location.lng } : null;
  }

  private calculateDistanceFromOffice(
    location: { lat: number; lng: number } | null,
    officeHours: any
  ): number {
    if (!location || !officeHours.companyLatitude || !officeHours.companyLongitude) {
      return 0;
    }

    return this.calculateDistance(
      location.lat,
      location.lng,
      officeHours.companyLatitude,
      officeHours.companyLongitude
    );
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return +(R * c).toFixed(2);
  }

  private calculateHours(inTime: string, outTime: string): number {
    // Handle time strings like "09:30" and "17:30"
    const parseTime = (timeStr: string): Date => {
      const [hours, minutes] = String(timeStr).split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);
      return date;
    };

    const start = typeof inTime === 'string' && inTime.includes(':') ? parseTime(inTime) : new Date(inTime);
    const end = typeof outTime === 'string' && outTime.includes(':') ? parseTime(outTime) : new Date(outTime);

    let diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;
    const hours = diffMs / 3600000;

    return +hours.toFixed(2);
  }

  private convertToDateTime(time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  }

  private addMinutes(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}`;
  }

  private extractMinutes(timeStr: string | any[]): number {
    if (Array.isArray(timeStr)) {
      return Number(timeStr[1] ?? 0);
    }
    const match = String(timeStr).match(/(\d+)/);
    return match ? Number(match[1]) : 0;
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

    if (record.overrideOpen) return;

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
      openingTime,
      latenessGracePeriod: graceTime,
      absentTime: this.addMinutes(openingTime, 180),
      closingTime: this.toHHmm(record.appliedExpectedEnd),
      sourceId: String(record.appliedScheduleId ?? 'api-schedule'),
      shiftName: record.appliedShiftName
    };

    this.applyTrackingMetrics(record, workingWindow, record.date ? toLocalDateString(record.date) : toLocalDateString(new Date()));
    return record;
  }

  private localKey(employeeId: any, date: string): string {
    return `${employeeId}_${date}`;
  }

  private ensureRegistered(id: string, name: string, department: string): void {
    const already = this.registeredEmployees.some(e => e.id === id);
    if (!already) {
      this.registeredEmployees.push({ id, name, department });
    }
  }

  private isWorkingDay(): boolean {
    const day = new Date().getDay();
    return day !== 0 && day !== 6;
  }

  private getCurrentLocation(): Promise<{ address: string; lat: number; lng: number } | null> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ address: 'Default Office Location', lat: 6.5244, lng: 3.3792 });
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
            resolve({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
          }
        },
        () => {
          // Geolocation permission denied or timed out; fallback to default coordinates
          resolve({ address: 'Office HQ (Default Location)', lat: 6.5244, lng: 3.3792 });
        },
        { timeout: 5000, maximumAge: 0 }
      );
    });
  }

  private scheduleAbsentCheck(): void {
    if (this.absentTimeout) clearTimeout(this.absentTimeout);
    if (this.absentInterval) clearInterval(this.absentInterval);

    this.autoMarkAbsentIfNeeded();
    this.absentInterval = setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
  }

  private autoMarkAbsentIfNeeded(): void {
    const now = new Date();
    const day = now.getDay();

    if (day === 0 || day === 6) return;

    const today = toLocalDateString(now);
    const data = [...this.attendanceSubject.value];

    let changed = false;

    this.registeredEmployees.forEach(emp => {
      const recordExists = data.some(r => r.employeeId === String(emp.id) && toLocalDateString(r.date || new Date()) === today);

      let workingWindow: WorkingWindow | null = null;
      this.attendanceScheduleResolverService.resolve(String(emp.id), now).subscribe(window => {
        workingWindow = window;
      });

      // `resolve()` always emits synchronously (built on `of(...)`), so
      // `workingWindow` is already set here — the `as` cast below just stops
      // TS from (wrongly) narrowing the closure-assigned variable to `never`
      // on the next line, since a plain re-assignment keeps the same
      // control-flow-narrowed type.
      const resolvedWindow = workingWindow as WorkingWindow | null;
      if (!resolvedWindow || now < this.convertToDateTime(resolvedWindow.absentTime)) return;

      if (!recordExists) {
        const absentRecord = this.createNewRecord(emp.id, emp.name, emp.department, today);
        const key = this.localKey(emp.id, today);

        if (!this.localRecords.has(key)) {
          this.localRecords.set(key, absentRecord);
          changed = true;
        }
      }
    });

    if (changed) {
      const currentApiData = this.attendanceSubject.value.filter(
        r => !this.localRecords.has(this.localKey(r.employeeId, toLocalDateString(r.date || new Date())))
      );
      this.mergeAndPublish(currentApiData);
    }
  }

  // ────────────────────────────────────────────────────────────
  // API Calls
  // ────────────────────────────────────────────────────────────

  private clockInApi(
    employeeId: string,
    checkIn: string,
    checkInLocation: string,
    checkInDistance: number,
    remoteMetadata?: { userAgent?: string; networkType?: string; vpnDetected?: boolean; geoAddress?: string; accuracy?: number }
  ): Promise<any> {
    if (USE_MOCK_DATA_ONLY) {
      return Promise.resolve(null);
    }

    const body = {
      employeeId,
      attendanceDate: toLocalDateString(new Date()),
      checkIn,
      checkInLocation,
      checkInDistance,
      ...remoteMetadata
    };

    return firstValueFrom(this.http.post<any>(API_ENDPOINTS.CLOCK_IN(), body));
  }

  private clockOutApi(
    apiRecordId: number,
    employeeId: string,
    checkOut: string,
    checkOutLocation: string,
    checkOutDistance: number
  ): Promise<void> {
    if (USE_MOCK_DATA_ONLY) {
      this.setClockStatus('CLOCKED_OUT');
      return Promise.resolve();
    }

    const body = {
      id: apiRecordId,
      employeeId,
      checkOut,
      checkOutLocation,
      checkOutDistance
    };

    return firstValueFrom(this.http.post<any>(API_ENDPOINTS.CLOCK_OUT(), body)).then(() => {
      this.setClockStatus('CLOCKED_OUT');
    });
  }

  private overrideOpenApi(apiRecordId: number, actorUserId: number, reason: string): void {
    // Skip API calls in development mode
    if (USE_MOCK_DATA_ONLY) {
      return;
    }

    const body = { actorUserId, reason };

    this.http.post<any>(API_ENDPOINTS.OVERRIDE_OPEN(apiRecordId), body).subscribe({
      next: () => { },
      error: (err) => {
      }
    });
  }

  private calculateAvgHours(records: AttendanceTableRecord[]): number {
    if (records.length === 0) return 0;
    const total = records.reduce((sum, r) => sum + (r.hours || 0), 0);
    return +(total / records.length).toFixed(2);
  }

  private calculateTotalOvertime(records: AttendanceTableRecord[]): number {
    if (records.length === 0) return 0;
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

  calculateAttendanceStatus(record: AttendanceTableRecord): AttendanceTableRecord['status'] {
    const officeHours = this.officeHoursService.getOfficeHours();

    // No check-in = ABSENT
    if (!record.checkIn) {
      return 'ABSENT';
    }

    const checkInTime = this.extractLocalTime(record.checkIn);
    const gracePeriod = this.toMinutes(officeHours.latenessGracePeriod);

    if (this.toMinutes(checkInTime) > gracePeriod) {
      return 'LATE';
    }

    // Within grace period or before = PRESENT
    return 'PRESENT';
  }

  private extractLocalTime(value: string | null): string {
    if (!value) return '00:00';
    if (value.includes('T')) {
      const local = new Date(value);
      if (!Number.isNaN(local.getTime())) {
        return `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`;
      }
    }
    const match = value.match(/T(\d{2}:\d{2})|^(\d{2}:\d{2})/);
    return match?.[1] ?? match?.[2] ?? value.slice(0, 5);
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private getOfficeOffset(field: 'latenessGracePeriod' | 'absentTime'): number {
    const officeHours = this.officeHoursService.getOfficeHours();
    return this.toMinutes(officeHours[field]) - this.toMinutes(officeHours.openingTime);
  }

  private loadFromStorage(): AttendanceTableRecord[] {
    try {
      const stored = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (stored) {
        const records = JSON.parse(stored);
        // Convert date strings back to Date objects
        return records.map((record: any) => ({
          ...record,
          date: record.date ? new Date(record.date) : null
        }));
      }
    } catch {
      // Storage error, fall back to mock
    }
    return MOCK_ATTENDANCE_RECORDS;
  }

  private saveToStorage(records: AttendanceTableRecord[]): void {
    try {
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(records));
    } catch {
      // Storage error, continue anyway
    }
  }
}
