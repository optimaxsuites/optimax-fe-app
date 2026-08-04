import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfficeHours } from '../../domain/attendance/office-hours.dto';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared-component/environments/environment';

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
    DEFAULT_OFFICE_HOURS
  );

  officeHours$ = this.officeHoursSubject.asObservable();

  public officeHoursId: number | null = null;

  constructor(private http: HttpClient) {
    this.initializeOfficeHours();
  }

  private initializeOfficeHours(): void {
    this.fetchCurrentOfficeHours().subscribe({
      next: (hours) => {
        const normalized = this.normalizeOfficeHours(hours);
        this.officeHoursSubject.next(normalized);
        localStorage.setItem('officeHours', JSON.stringify(normalized));
      },
      error: () => {
        const saved = localStorage.getItem('officeHours');
        if (saved) {
          const normalized = this.normalizeOfficeHours(JSON.parse(saved));
          this.officeHoursSubject.next(normalized);
        }
      }
    });
  }

  private normalizeOfficeHours(data: any): OfficeHours {
    return {
      openingTime: data?.openingTime ?? data?.opening_time ?? DEFAULT_OFFICE_HOURS.openingTime,
      closingTime: data?.closingTime ?? data?.closing_time ?? DEFAULT_OFFICE_HOURS.closingTime,
      absentTime: data?.absentTime ?? data?.absent_time ?? DEFAULT_OFFICE_HOURS.absentTime,
      latenessGracePeriod: data?.latenessGracePeriod ?? data?.lateness_grace_period ?? DEFAULT_OFFICE_HOURS.latenessGracePeriod
    };
  }

  getOfficeHours(): OfficeHours {
    return this.officeHoursSubject.value;
  }

  /*updateOfficeHours(hours: OfficeHours) {
    localStorage.setItem('officeHours', JSON.stringify(hours));
    this.officeHoursSubject.next(hours);
  }*/

  updateOfficeHours(hours: OfficeHours) {

  const body = {
    id: this.officeHoursId ?? 0,

    openingTime: hours.openingTime,

    closingTime: hours.closingTime,

    absentTime: hours.absentTime,

    latenessGracePeriod: hours.latenessGracePeriod,

    companyLatitude: hours.companyLatitude?.toString() ?? '',

    companyLongitude: hours.companyLongitude?.toString() ?? ''
  };// UPDATE existing
  if (this.officeHoursId) {this.http.put<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/officeHours/${this.officeHoursId}`,
      body
    ).subscribe({
      next: (res) => {localStorage.setItem('officeHours', JSON.stringify(hours));

        this.officeHoursSubject.next(hours);
      },
      error: (err) => { /* Error updating office hours */ }
    });

  }

  // CREATE new
  else {this.http.post<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/officeHours`,
      body
    ).subscribe({
      next: (res) => {this.officeHoursId = res.id;

        localStorage.setItem('officeHours', JSON.stringify(hours));

        this.officeHoursSubject.next(hours);
      },
      error: (err) => { /* Error updating office hours */ }
    });

  }
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
  const hours = this.getOfficeHours();
  const openingTime = hours?.openingTime ?? DEFAULT_OFFICE_HOURS.openingTime;
  const closingTime = hours?.closingTime ?? DEFAULT_OFFICE_HOURS.closingTime;

  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);

  const openDate = new Date(current);
  openDate.setHours(openHour, openMin, 0, 0);

  const closeDate = new Date(current);
  closeDate.setHours(closeHour, closeMin, 0, 0);

  return current >= openDate && current <= closeDate;
}
 
 isAfterOpeningTime(current: Date): boolean {
  const hours = this.getOfficeHours();
  const openingTime = hours?.openingTime ?? DEFAULT_OFFICE_HOURS.openingTime;

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


/*private toBackendTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);

  return {
    hour,
    minute,
    second: 0,
    nano: 0
  };
}*/

createOfficeHours(payload: any) {
  return this.http.post(
    `${environment.apiBaseUrl}/x/api/v2/hr/officeHours`,
    payload
  );
}

updateOfficeHoursApi(id: number, payload: any) {
  return this.http.put(
    `${environment.apiBaseUrl}/x/api/v2/hr/officeHours/${id}`,
    payload
  );
}

fetchCurrentOfficeHours() {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/officeHours/current`
  );
}

}

