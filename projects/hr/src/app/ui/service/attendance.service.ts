import { Injectable, OnInit } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

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
  private employees = [
    { id: 1, name: 'John Doe', department: 'Engineering' },
    { id: 2, name: 'Mary Smith', department: 'HR' },
    { id: 3, name: 'Michael Johnson', department: 'Finance' },
    { id: 4, name: 'Sarah Williams', department: 'Marketing' },
    { id: 5, name: 'Tunde Ola', department: 'Marketing' },

  ];

  private attendanceRecords = [
    // 🧑‍💻 John Doe
    { userId: 1, date: '2025-10-23', clockIn: '08:35', clockOut: '17:01', status: 'Present' },
    { userId: 1, date: '2025-10-24', clockIn: '09:02', clockOut: '17:15', status: 'Late' },
    { userId: 1, date: '2025-10-25', clockIn: '', clockOut: '', status: 'Absent' },
    { userId: 1, date: '2025-10-26', clockIn: '08:40', clockOut: '16:55', status: 'Present' },
    { userId: 1, date: '2025-10-27', clockIn: '08:30', clockOut: '', status: 'Present' },

    // 👩‍💼 Jane Smith
    { userId: 2, date: '2025-10-23', clockIn: '08:50', clockOut: '17:02', status: 'Present' },
    { userId: 2, date: '2025-10-24', clockIn: '09:15', clockOut: '17:00', status: 'Late' },
    { userId: 2, date: '2025-10-25', clockIn: '', clockOut: '', status: 'Absent' },
    { userId: 2, date: '2025-10-26', clockIn: '08:40', clockOut: '17:05', status: 'Present' },
    { userId: 2, date: '2025-10-27', clockIn: '08:45', clockOut: '', status: 'Present' },

    // 🧔 Michael Johnson
    { userId: 3, date: '2025-10-23', clockIn: '09:00', clockOut: '17:20', status: 'Late' },
    { userId: 3, date: '2025-10-24', clockIn: '08:50', clockOut: '17:00', status: 'Present' },
    { userId: 3, date: '2025-10-25', clockIn: '', clockOut: '', status: 'Absent' },
    { userId: 3, date: '2025-10-26', clockIn: '09:10', clockOut: '17:10', status: 'Late' },
    { userId: 3, date: '2025-10-27', clockIn: '08:55', clockOut: '', status: 'Present' },

    // 👩 Sarah Williams
    { userId: 4, date: '2025-10-23', clockIn: '08:45', clockOut: '17:10', status: 'Present' },
    { userId: 4, date: '2025-10-24', clockIn: '08:35', clockOut: '17:05', status: 'Present' },
    { userId: 4, date: '2025-10-25', clockIn: '', clockOut: '', status: 'Absent' },
    { userId: 4, date: '2025-10-26', clockIn: '08:50', clockOut: '17:00', status: 'Present' },
    { userId: 4, date: '2025-10-27', clockIn: '', clockOut: '', status: 'Absent' },

    // 👨‍💼 Daniel Brown
    { userId: 5, date: '2025-10-23', clockIn: '08:30', clockOut: '16:50', status: 'Present' },
    { userId: 5, date: '2025-10-24', clockIn: '09:20', clockOut: '17:30', status: 'Late' },
    { userId: 5, date: '2025-10-25', clockIn: '', clockOut: '', status: 'Absent' },
    { userId: 5, date: '2025-10-26', clockIn: '08:55', clockOut: '17:00', status: 'Present' },
    { userId: 5, date: '2025-10-27', clockIn: '08:42', clockOut: '', status: 'Present' },
  ];



  private records: AttendanceRecord[] = this.loadHistory();
  private currentRecord = new BehaviorSubject<AttendanceRecord | null>(this.loadCurrent());

  currentRecord$ = this.currentRecord.asObservable();

  filteredEmployees: any[] = [];
  searchTerm = '';
  selectedDate: string = new Date().toISOString().split('T')[0];
  viewDetails: boolean = false


  constructor() {}



  /** Load saved attendance history from localStorage */
  private loadHistory(): AttendanceRecord[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  /** Load current (active) record if user has clocked in but not out */
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

  /** User clocks in */
  clockIn() {
    const now = new Date();
    const record: AttendanceRecord = {
      date: now.toISOString().split('T')[0],
      clockIn: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      clockOut: null,
      status: this.getStatus(now)
    };

    this.currentRecord.next(record);
    this.saveCurrent(record);
  }

  /** User clocks out */
  clockOut() {
    const now = new Date();
    const record = this.currentRecord.value;
    if (!record) return;

    record.clockOut = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    record.duration = this.calculateDuration(record.clockIn, record.clockOut);

    this.records.unshift(record);
    this.saveHistory();

    this.currentRecord.next(null);
    this.saveCurrent(null);
  }

  /** Simple time-based logic to mark 'Late' or 'On Time' */
  private getStatus(now: Date): 'On Time' | 'Late' | 'Present' {
    const hour = now.getHours();
    const minute = now.getMinutes();
    return hour > 8 || (hour === 8 && minute > 15) ? 'Late' : 'On Time';
  }

  /** Duration calculator (roughly in hours and minutes) */
  private calculateDuration(clockIn: string | null, clockOut: string | null): string {
    if (!clockIn || !clockOut) return '-';

    const [inHour, inMin] = clockIn.split(':').map(v => parseInt(v));
    const [outHour, outMin] = clockOut.split(':').map(v => parseInt(v));

    let totalMins = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    if (totalMins < 0) totalMins += 24 * 60;

    const hours = Math.floor(totalMins / 60);
    const mins = totalMins % 60;

    return `${hours}h ${mins}m`;
  }


 
  getEmployees() {
    return this.employees;
  }

  getEmployee(id: number) {
    return this.employees.find(e => e.id === id);
  }


  getAttendanceForDate(date: string) {
    return this.attendanceRecords.filter(r => r.date === date);
  }

  getEmployeeAttendance(userId: number) {
    return this.attendanceRecords.filter(r => r.userId === userId);
  }


}
