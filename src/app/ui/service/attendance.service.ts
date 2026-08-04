import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../shared-component/environments/environment.prod';

export interface AttendanceRecord {
  date: string;
  clockIn: string | null;
  clockOut: string | null;
  duration?: string;
  status: 'On Time' | 'Late' | 'Absent' | 'Present';
}

@Injectable({ providedIn: 'root' })
export class AttendanceService {
  private readonly STORAGE_KEY = 'attendance_history';
  private readonly CURRENT_KEY = 'attendance_current';
  private readonly BASE = environment.apiBaseUrl;

  private records: AttendanceRecord[] = this.loadHistory();
  private currentRecord = new BehaviorSubject<AttendanceRecord | null>(this.loadCurrent());
  private employeeId: number | null = null;
  private employeeName: string = '';

  currentRecord$ = this.currentRecord.asObservable();

  constructor(private http: HttpClient) {}

  setEmployeeInfo(employeeId: number, employeeName: string): void {
    this.employeeId = employeeId;
    this.employeeName = employeeName;
  }

  // ── Self-service clock-in/out (localStorage) ────────────────────────────────

  private loadHistory(): AttendanceRecord[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private loadCurrent(): AttendanceRecord | null {
    const data = localStorage.getItem(this.CURRENT_KEY);
    return data ? JSON.parse(data) : null;
  }

  private saveHistory() {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.records));
  }

  private saveCurrent(record: AttendanceRecord | null) {
    if (record) {
      localStorage.setItem(this.CURRENT_KEY, JSON.stringify(record));
    } else {
      localStorage.removeItem(this.CURRENT_KEY);
    }
  }

  getHistory(): AttendanceRecord[] {
    return this.records;
  }

  clockIn() {
    const now = new Date();
    const record: AttendanceRecord = {
      date: now.toISOString().split('T')[0],
      clockIn: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clockOut: null,
      status: this.getStatus(now),
    };
    this.currentRecord.next(record);
    this.saveCurrent(record);
  }

  clockOut() {
    const now = new Date();
    const record = this.currentRecord.value;
    if (!record) return;
    record.clockOut = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    record.duration = this.calcDuration(record.clockIn, record.clockOut);
    this.records.unshift(record);
    this.saveHistory();
    this.currentRecord.next(null);
    this.saveCurrent(null);
  }

  private getStatus(now: Date): 'On Time' | 'Late' | 'Present' {
    const h = now.getHours(), m = now.getMinutes();
    return h > 8 || (h === 8 && m > 15) ? 'Late' : 'On Time';
  }

  private calcDuration(clockIn: string | null, clockOut: string | null): string {
    if (!clockIn || !clockOut) return '-';
    const [ih, im] = clockIn.split(':').map(Number);
    const [oh, om] = clockOut.split(':').map(Number);
    let total = (oh * 60 + om) - (ih * 60 + im);
    if (total < 0) total += 1440;
    return `${Math.floor(total / 60)}h ${total % 60}m`;
  }

  // ── Real API methods ─────────────────────────────────────────────────────────

  /** Fetch all attendance records for a given date (defaults to today). */
  fetchDailyRecords(): Observable<any[]> {
    return this.http
      .get<any>(`${this.BASE}/x/api/v2/hr/attendanceRecords?size=200`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.content ?? [])),
        catchError(() => of([])),
      );
  }

  /** Fetch all attendance records for a specific employee. */
  fetchEmployeeRecords(employeeId: number): Observable<any[]> {
    return this.http
      .get<any>(`${this.BASE}/x/api/v2/hr/attendanceRecords/employee/${employeeId}`)
      .pipe(
        map(res => Array.isArray(res) ? res : (res?.content ?? [])),
        catchError(() => of([])),
      );
  }

  /** Convert a backend date array [y,m,d] or ISO string to YYYY-MM-DD. */
  dateArrayToStr(arr: any): string {
    if (!arr) return '';
    if (typeof arr === 'string') return arr.substring(0, 10);
    if (Array.isArray(arr) && arr.length >= 3) {
      const [y, m, d] = arr;
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
    return '';
  }
}
