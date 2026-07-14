import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { firstValueFrom } from 'rxjs';
import { AttendanceTableRecord } from '../../domain/attendance/attendancetable.dto';
import { OfficeHoursService } from './office-hours.service';
import { AttendanceScheduleResolverService } from './attendanceschedulreresolver.service';
import { WorkingWindow } from '../../domain/attendance/working-window.dto';
import { computeShiftTrackingMetrics } from '../workschedule-shift/shift-based-tracking.util';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared-component/environments/environment.prod';
import { map } from 'rxjs/operators';

type ClockStatus = 'CLOCKED_IN' | 'CLOCKED_OUT';

// Constants
const STORAGE_KEYS = {
  OFFICE_HOURS: 'officeHours'
};

const API_ENDPOINTS = {
  ALL_RECORDS: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords`,
  RECORDS_BY_RANGE: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/dateRange`,
  RECORD_BY_ID: (id: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${id}`,
  RECORD_BY_EMPLOYEE: (id: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/employee/${id}`,
  CLOCK_IN: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockIn`,
  CLOCK_OUT: () => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/clockOut`,
  OVERRIDE_OPEN: (id: number) => `${environment.apiBaseUrl}/x/api/v2/hr/attendanceRecords/${id}/override/open`,
  EMPLOYEES: () => `${environment.apiBaseUrl}/x/api/v2/hr/employees?page=1&size=100`
};

interface RegisteredEmployee {
  id: number;
  name: string;
  department: string;
}

interface ParsedEmployeeResponse {
  id: number;
  fullName: string;
  department: string;
}

@Injectable({ providedIn: 'root' })
export class AttendancetableService {
  private attendanceSubject = new BehaviorSubject<AttendanceTableRecord[]>([]);
  private clockStatusSubject = new BehaviorSubject<ClockStatus>('CLOCKED_OUT');

  private localRecords = new Map<string, AttendanceTableRecord>();
  private registeredEmployees: RegisteredEmployee[] = [];
  private lastAbsentRunDate: string | null = null;

  private absentTimeout: any;
  private absentInterval: any;

  attendance$ = this.attendanceSubject.asObservable();
  clockStatus$ = this.clockStatusSubject.asObservable();

  constructor(
    private officeHoursService: OfficeHoursService,
    private http: HttpClient,
    private attendanceScheduleResolverService: AttendanceScheduleResolverService
  ) {
    this.scheduleAbsentCheck();
    this.officeHoursService.officeHours$.subscribe(() => {
      this.scheduleAbsentCheck();
    });
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
    return record.status === 'ABSENT' && !record.overrideOpen;
  }

  hasCompletedToday(employeeId: number): boolean {
    const today = new Date().toDateString();
    const todayRecord = this.attendanceSubject.value.find(record => {
      if (!record.date) return false;
      return (
        record.employeeId === employeeId &&
        new Date(record.date).toDateString() === today
      );
    });

    return !!(todayRecord?.checkIn && todayRecord?.checkOut);
  }

  // ────────────────────────────────────────────────────────────
  // Fetch Methods
  // ────────────────────────────────────────────────────────────

  fetchAllRecords(page: number = 1, size: number = 100): void {
    this.http.get<any>(API_ENDPOINTS.ALL_RECORDS() + `?page=${page}&size=${size}`).subscribe({
      next: (res) => this.handleFetchSuccess(res),
      error: (err) => this.handleFetchError('fetchAllRecords', err)
    });
  }

  fetchByDateRange(from: string, to: string, page: number = 1, size: number = 100): void {
    const url = `${API_ENDPOINTS.RECORDS_BY_RANGE()}?from=${from}&to=${to}&page=${page}&size=${size}`;
    this.http.get<any>(url).subscribe({
      next: (res) => this.handleFetchSuccess(res),
      error: (err) => this.handleFetchError('fetchByDateRange', err)
    });
  }

  fetchByEmployee(employeeId: number, page: number = 1, size: number = 100): void {
    this.http.get<any>(API_ENDPOINTS.RECORD_BY_EMPLOYEE(employeeId) + `?page=${page}&size=${size}`).subscribe({
      next: (res) => this.handleFetchSuccess(res),
      error: (err) => this.handleFetchError('fetchByEmployee', err)
    });
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
    employeeId: number,
    employeeName: string,
    department: string,
    action: 'IN' | 'OUT'
  ): Promise<void> {
    if (!this.isWorkingDay()) {
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

    let record = data.find(r => r.employeeId === employeeId && r.date === today);
    this.ensureRegistered(employeeId, employeeName, department);

    if (!record) {
      record = this.createNewRecord(employeeId, employeeName, department, today);
      data.unshift(record);
    }

    record.appliedScheduleType = workingWindow.scheduleType;
    record.appliedScheduleId = Number(workingWindow.sourceId) || record.appliedScheduleId;
    record.appliedExpectedStart = workingWindow.openingTime;
    record.appliedExpectedEnd = workingWindow.closingTime;
    record.appliedShiftName = workingWindow.shiftName;

    const location = await this.getCurrentLocation();
    const distanceFromOffice = this.calculateDistanceFromOffice(location, officeHours);

    if (action === 'IN') {
      record.checkIn = now.toISOString();
      record.checkInLocation = this.formatLocation(location);
      record.status = record.overrideOpen ? 'PRESENT' : this.getCheckInStatus(now, workingWindow);
    } else if (action === 'OUT') {
      record.checkOut = now.toISOString();
      record.checkOutLocation = this.formatLocation(location);
      record.hours = this.calculateHours(record.checkIn!, record.checkOut);
    }

    this.applyTrackingMetrics(record, workingWindow, today);
    this.updateLocalAndPublish(employeeId, today, record);

    if (action === 'IN') {
      this.clockInApi(employeeId, now.toISOString(), location?.address ?? '', distanceFromOffice);
    } else if (record.apiRecordId) {
      this.clockOutApi(record.apiRecordId, employeeId, now.toISOString(), location?.address ?? '', distanceFromOffice);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Remote Check-in
  // ────────────────────────────────────────────────────────────

  async recordRemoteCheckIn(
    employeeId: number,
    employeeName: string,
    department: string,
    metadata: any,
    fraudResult: any
  ): Promise<void> {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const data = [...this.attendanceSubject.value];
    const officeHours = this.officeHoursService.getOfficeHours();
    const workingWindow = await firstValueFrom(
      this.attendanceScheduleResolverService.resolve(String(employeeId), now)
    );

    let record = data.find(r => r.employeeId === employeeId && r.date === today);
    this.ensureRegistered(employeeId, employeeName, department);

    if (!record) {
      record = this.createNewRecord(employeeId, employeeName, department, today);
      record.checkIn = now.toISOString();
      data.unshift(record);
    } else {
      record.checkIn = now.toISOString();
    }

    record.checkInLocation = metadata?.geoAddress ? {
      address: metadata.geoAddress,
      lat: metadata.gpsCoordinates?.lat || 0,
      lng: metadata.gpsCoordinates?.lng || 0
    } : null;

    record.appliedScheduleType = workingWindow.scheduleType;
    record.appliedScheduleId = Number(workingWindow.sourceId) || record.appliedScheduleId;
    record.appliedExpectedStart = workingWindow.openingTime;
    record.appliedExpectedEnd = workingWindow.closingTime;
    record.appliedShiftName = workingWindow.shiftName;
    record.checkInSource = 'WEB';

    record.remoteMetadata = metadata;
    record.fraudFlags = fraudResult?.flags || [];
    record.hasFraudFlags = fraudResult?.hasFraudIndicators || false;
    record.riskScore = fraudResult?.riskScore || 0;

    const graceTime = this.convertToDateTime(workingWindow.latenessGracePeriod);
    if (!record.overrideOpen) {
      record.status = now <= graceTime ? 'PRESENT' : 'LATE';
    }

    this.applyTrackingMetrics(record, workingWindow, today);
    this.updateLocalAndPublish(employeeId, today, record);

    const distanceFromOffice = metadata?.gpsCoordinates
      ? this.calculateDistance(
        metadata.gpsCoordinates.lat,
        metadata.gpsCoordinates.lng,
        officeHours.companyLatitude || 0,
        officeHours.companyLongitude || 0
      )
      : 0;

    // TODO: Uncomment when backend is ready
    // this.clockInApi(employeeId, now.toISOString(), metadata?.geoAddress || 'Remote', distanceFromOffice);
  }

  // ────────────────────────────────────────────────────────────
  // Override & Status Updates
  // ────────────────────────────────────────────────────────────

  openAttendanceForToday(employeeId: number, actorUserId: number, reason: string): void {
    const today = new Date().toISOString().split('T')[0];
    const records = [...this.attendanceSubject.value];
    const record = records.find(r => r.employeeId === employeeId && r.date === today);

    if (!record) return;

    record.overrideOpen = true;
    this.attendanceSubject.next(records);

    if (record.apiRecordId) {
      this.overrideOpenApi(record.apiRecordId, actorUserId, reason);
    }
  }

  overrideAttendance(
    employeeId: number,
    date: string,
    newStatus: AttendanceTableRecord['status'],
    newCheckIn: string | null,
    reason: string,
    admin: { adminId: number; adminName: string }
  ): void {
    const data = [...this.attendanceSubject.value];
    const record = data.find(r => r.employeeId === employeeId && r.date === date);

    if (!record) return;

    record.status = newStatus;
    record.checkIn = newCheckIn;
    record.overrideReason = reason;
    record.overriddenBy = admin;

    this.attendanceSubject.next(data);
  }

  updateAttendanceStatus(
    employeeId: number,
    employeeName: string,
    department: string,
    date: string,
    newStatus: AttendanceTableRecord['status']
  ): void {
    const data = [...this.attendanceSubject.value];
    const recordIndex = data.findIndex(r => r.employeeId === employeeId && r.date === date);

    if (recordIndex !== -1) {
      data[recordIndex] = { ...data[recordIndex], status: newStatus };
    } else {
      data.unshift({
        id: 0,
        employeeId,
        employee: employeeName,
        department,
        date,
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
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = records.filter(r => {
      if (!r.date) return false;
      const rDate = new Date(r.date);
      return rDate >= start && rDate <= end;
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
    trendMap.forEach((value) => {
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

  // ────────────────────────────────────────────────────────────
  // Private Helper Methods
  // ────────────────────────────────────────────────────────────

  private handleFetchSuccess(res: any): void {
    const mapped = (res.content ?? [])
      .map((r: any) => this.enrichRecordMetrics(this.mapApiRecord(r)))
      .filter((r: AttendanceTableRecord) => this.shouldIncludeRecord(r));
    this.mergeAndPublish(mapped);
  }

  private handleFetchError(method: string, err: any): void {
    console.error(`[${method}]`, err?.error?.message ?? err);
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
      employeeId: Number(emp?.id),
      employee: fullName,
      department,
      date: this.toDateOnly(api.attendanceDate),
      checkIn: this.toDateTime(api.checkIn),
      checkOut: this.toDateTime(api.checkOut),
      checkInLocation: this.toLocation(api.checkInLocation),
      checkOutLocation: this.toLocation(api.checkOutLocation),
      status: api.status ?? 'ABSENT',
      hours: api.hours ?? 0,
      overrideOpen: api.overrideOpen ?? false,
      overrideReason: api.overrideReason ?? '',
      overriddenBy: api.overrideBy
        ? { adminId: Number(api.overrideBy.hrEmployeeId), adminName: api.overrideBy.fullname }
        : undefined,
      appliedScheduleType: api.appliedScheduleType === 'OFFICE_HOURS' ? 'office-hours' : 'shift',
      appliedScheduleId: api.appliedScheduleId ? Number(api.appliedScheduleId) : undefined,
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

  private toDateOnly(value: any): string | null {
    if (!value) return null;

    if (Array.isArray(value)) {
      const [year, month, day] = value;
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    return value;
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
      const index = merged.findIndex(r => this.localKey(r.employeeId, r.date ?? '') === key);

      if (index !== -1) {
        merged[index] = { ...merged[index], ...localRecord };
      } else {
        merged.unshift(localRecord);
      }
    });

    this.attendanceSubject.next(merged);
  }

  private updateLocalAndPublish(employeeId: number, date: string, record: AttendanceTableRecord): void {
    this.localRecords.set(this.localKey(employeeId, date), { ...record });

    const currentApiData = this.attendanceSubject.value.filter(
      r => !this.localRecords.has(this.localKey(r.employeeId, r.date ?? ''))
    );

    this.mergeAndPublish(currentApiData);
  }

  private createNewRecord(
    employeeId: number,
    employeeName: string,
    department: string,
    date: string
  ): AttendanceTableRecord {
    return {
      id: 0,
      employeeId,
      employee: employeeName,
      department,
      date,
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
    const start = new Date(inTime);
    const end = new Date(outTime);
    return +((end.getTime() - start.getTime()) / 3600000).toFixed(2);
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

    this.applyTrackingMetrics(record, workingWindow, record.date);
    return record;
  }

  private localKey(employeeId: any, date: string): string {
    return `${employeeId}_${date}`;
  }

  private ensureRegistered(id: number, name: string, department: string): void {
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
            resolve({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng });
          }
        },
        () => resolve(null),
        { timeout: 8000, maximumAge: 0 }
      );
    });
  }

  private scheduleAbsentCheck(): void {
    if (this.absentTimeout) clearTimeout(this.absentTimeout);
    if (this.absentInterval) clearInterval(this.absentInterval);

    const now = new Date();
    const officeHours = this.officeHoursService.getOfficeHours();
    const [hour, minute] = officeHours.absentTime.split(':').map(Number);

    const absentTimeToday = new Date();
    absentTimeToday.setHours(hour, minute, 0, 0);

    const msUntilAbsentTime = absentTimeToday.getTime() - now.getTime();

    if (msUntilAbsentTime > 0) {
      this.absentTimeout = setTimeout(() => {
        this.autoMarkAbsentIfNeeded();
        this.absentInterval = setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
      }, msUntilAbsentTime);
    } else {
      this.autoMarkAbsentIfNeeded();
      this.absentInterval = setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
    }
  }

  private autoMarkAbsentIfNeeded(): void {
    const now = new Date();
    const day = now.getDay();

    if (day === 0 || day === 6) return;

    const officeHours = this.officeHoursService.getOfficeHours();
    const [hour, minute] = officeHours.absentTime.split(':').map(Number);

    const absentTimeToday = new Date();
    absentTimeToday.setHours(hour, minute, 0, 0);

    if (now < absentTimeToday) return;

    const today = now.toISOString().split('T')[0];
    const data = [...this.attendanceSubject.value];

    let changed = false;

    this.registeredEmployees.forEach(emp => {
      const recordExists = data.some(r => r.employeeId === emp.id && r.date === today);

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
        r => !this.localRecords.has(this.localKey(r.employeeId, r.date ?? ''))
      );
      this.mergeAndPublish(currentApiData);
    }
  }

  // ────────────────────────────────────────────────────────────
  // API Calls
  // ────────────────────────────────────────────────────────────

  private clockInApi(
    employeeId: number,
    checkIn: string,
    checkInLocation: string,
    checkInDistance: number
  ): void {
    const body = {
      employeeId,
      attendanceDate: new Date().toISOString().split('T')[0],
      checkIn,
      checkInLocation,
      checkInDistance
    };

    this.http.post<any>(API_ENDPOINTS.CLOCK_IN(), body).subscribe({
      next: (res) => this.handleClockInSuccess(res, employeeId),
      error: (err) => console.error('Clock-in failed:', err?.error?.message ?? err)
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

    this.http.post<any>(API_ENDPOINTS.CLOCK_OUT(), body).subscribe({
      next: () => this.setClockStatus('CLOCKED_OUT'),
      error: (err) => console.error('Clock-out failed:', err?.error?.message ?? err)
    });
  }

  private overrideOpenApi(apiRecordId: number, actorUserId: number, reason: string): void {
    const body = { actorUserId, reason };

    this.http.post<any>(API_ENDPOINTS.OVERRIDE_OPEN(apiRecordId), body).subscribe({
      next: () => { },
      error: (err) => console.error('Override failed:', err?.error?.message ?? err)
    });
  }

  private handleClockInSuccess(res: any, employeeId: number): void {
    const returnedId = res?.id ?? res?.attendanceId ?? res?.recordId ?? null;

    if (returnedId) {
      const today = new Date().toISOString().split('T')[0];
      const records = [...this.attendanceSubject.value];
      const record = records.find(r => r.employeeId === employeeId && r.date === today);

      if (record) {
        record.apiRecordId = returnedId;
        this.localRecords.set(this.localKey(employeeId, today), { ...record });
        this.attendanceSubject.next(records);
      }
    }

    this.setClockStatus('CLOCKED_IN');
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
}
