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

  private absentTimeout: any;
private absentInterval: any;

constructor(private officeHoursService: OfficeHoursService) {
  this.scheduleAbsentCheck();

  // Re-schedule if admin changes office hours
  this.officeHoursService.officeHours$.subscribe(() => {
    this.scheduleAbsentCheck();
  });
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

  /*constructor(private officeHoursService: OfficeHoursService) {
  this.scheduleAbsentCheck();
}

private scheduleAbsentCheck() {
  const now = new Date();
  const officeHours = this.officeHoursService.getOfficeHours();
  const [hour, minute] = officeHours.absentTime.split(':').map(Number);

  const absentTimeToday = new Date();
  absentTimeToday.setHours(hour, minute, 0, 0);

  const msUntilAbsentTime = absentTimeToday.getTime() - now.getTime();

  if (msUntilAbsentTime > 0) {
    // Fire exactly when absentTime hits
    setTimeout(() => {
      this.autoMarkAbsentIfNeeded();

      // Then keep checking every minute as a safety net
      setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
    }, msUntilAbsentTime);

  } else {
    // absentTime already passed (e.g. page refreshed after absentTime)
    this.autoMarkAbsentIfNeeded();
    setInterval(() => this.autoMarkAbsentIfNeeded(), 60000);
  }
}*/
  /*constructor(private officeHoursService: OfficeHoursService) {
    setInterval(() => {
    this.autoMarkAbsentIfNeeded();
  }, 60000); // every minute
  }*/

async clockAction(employeeid: string, employeeName: string, department: string, action: 'IN' | 'OUT') {
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

  const now = new Date();
  const officeHours = this.officeHoursService.getOfficeHours();

  const opening = this.convertToDateTime(officeHours.openingTime);
  const closing = this.convertToDateTime(officeHours.closingTime);
  const graceTime = this.convertToDateTime(officeHours.latenessGracePeriod)

  if (action === 'IN') {

  record.checkIn = now.toLocaleTimeString();
  record.checkInLocation = location;  // to store location

  // If admin opened attendance, never mark late
  if (record.overrideOpen) {
    record.status = 'PRESENT';

    // Optional cleanup: remove override after successful clock-in
    record.overrideOpen = false;

  } else {

    const graceTime = this.convertToDateTime(officeHours.latenessGracePeriod);
     record.status = now <= graceTime ? 'PRESENT' : 'LATE';
    // Normal Late / Present logic
    /*if (now > opening) {
      record.status = 'LATE';
    } else {
      record.status = 'PRESENT';
    }*/

  }
}

  if (action === 'OUT') {
    record.checkOut = now.toLocaleTimeString();
    record.checkOutLocation = location; 
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
      checkInLocation: null,
      checkOutLocation: null,
      status: newStatus,
      hours: 0
    });

  }

  this.attendanceSubject.next(data);
}

private registeredEmployees = [
  { id: '001', name: 'Chrisha Okorocha', department: 'Engineering' }
  //{ id: '002', name: 'John Doe', department: 'HR' }
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
        checkInLocation: null,
        checkOutLocation: null,
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

overrideAttendance(
  employeeId: string,
  date: string,
  newStatus: AttendanceTableRecord['status'],
  newCheckIn: string | null,
  reason: string,
  admin: { adminId: string; adminName: string }
) {

  const data = [...this.attendanceSubject.value];

  const record = data.find(
    r => r.id === employeeId && r.date === date
  );

  if (!record) return;

  record.status = newStatus;
  record.checkIn = newCheckIn;

  record.overrideReason = reason;

  record.overriddenBy = admin;

  this.attendanceSubject.next(data);
}

private getCurrentLocation(): Promise<string> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve('Location unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        /*resolve(`${lat}, ${lng}`);*/
        // --- REVERSE GEOCODING GOES HERE ---
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'User-Agent': 'YourAppName/1.0' } }
          );
          const json = await response.json();
          resolve(json.display_name ?? `${lat}, ${lng}`);         // human-readable address, falls back to coords
        } catch {
          resolve(`${lat}, ${lng}`);                              // if API fails, fall back to raw coords
        }
      },
      (error) => {
        // Gracefully handle denial or timeout
        switch (error.code) {
          case error.PERMISSION_DENIED:
            resolve('Location denied');
            break;
          case error.POSITION_UNAVAILABLE:
            resolve('Location unavailable');
            break;
          case error.TIMEOUT:
            resolve('Location timeout');
            break;
          default:
            resolve('Location error');
        }
      },
      { timeout: 8000, maximumAge: 0 }
    );
  });
}


}
