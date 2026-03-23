import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfficeHours } from '../../domain/attendance/office-hours.dto';

const DEFAULT_OFFICE_HOURS: OfficeHours = {
  openingTime: '09:00',
  closingTime: '17:00',
  absentTime: '10:00',
  latenessGracePeriod: '09:15'
};

/*export type ScheduleMode = 'office-hours' | 'shift' | 'mixed';*/

@Injectable({ providedIn: 'root' })
export class OfficeHoursService {
  private officeHoursSubject = new BehaviorSubject<OfficeHours>(
    this.loadOfficeHours()
  );

  officeHours$ = this.officeHoursSubject.asObservable();

  getOfficeHours(): OfficeHours {
    return this.officeHoursSubject.value;
  }

  updateOfficeHours(hours: OfficeHours) {
    localStorage.setItem('officeHours', JSON.stringify(hours));
    this.officeHoursSubject.next(hours);
  }

  private loadOfficeHours(): OfficeHours {
    const saved = localStorage.getItem('officeHours');
    //return saved ? JSON.parse(saved) : DEFAULT_OFFICE_HOURS;
    if (!saved) return DEFAULT_OFFICE_HOURS;

  const parsed = JSON.parse(saved);

  return {
    openingTime: parsed.openingTime ?? DEFAULT_OFFICE_HOURS.openingTime,
    closingTime: parsed.closingTime ?? DEFAULT_OFFICE_HOURS.closingTime,
    absentTime: parsed.absentTime ?? DEFAULT_OFFICE_HOURS.absentTime,
    latenessGracePeriod: parsed.latenessGracePeriod ?? DEFAULT_OFFICE_HOURS.latenessGracePeriod
  };
  }

  isWithinOfficeHours(current: Date): boolean {
  const { openingTime, closingTime } = this.getOfficeHours();

  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);

  const openDate = new Date(current);
  openDate.setHours(openHour, openMin, 0, 0);

  const closeDate = new Date(current);
  closeDate.setHours(closeHour, closeMin, 0, 0);

  return current >= openDate && current <= closeDate;
}
 
 isAfterOpeningTime(current: Date): boolean {
  const { openingTime } = this.getOfficeHours();

  const [openHour, openMin] = openingTime.split(':').map(Number);

  const openDate = new Date(current);
  openDate.setHours(openHour, openMin, 0, 0);

  return current >= openDate;
}

// Inside the class:
/*private scheduleMode: ScheduleMode = 'office-hours'; // default

getScheduleMode(): ScheduleMode {
  return 'mixed'; 
}*/

getScheduleMode() {
  return 'mixed' as const; //fixed at mixed scheduleMode
}

/*setScheduleMode(mode: ScheduleMode): void {
  this.scheduleMode = mode;
}*/

}
