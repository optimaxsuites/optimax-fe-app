import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfficeHours } from '../../domain/attendance/office-hours.dto';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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
    this.loadOfficeHours()
  );

  officeHours$ = this.officeHoursSubject.asObservable();

  public officeHoursId: number | null = null;

  constructor(private http: HttpClient) {}

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

    openingTime: this.toBackendTime(hours.openingTime),

    closingTime: this.toBackendTime(hours.closingTime),

    absentTime: this.toBackendTime(hours.absentTime),

    latenessGracePeriod: this.toBackendTime(hours.latenessGracePeriod),

    companyLatitude: hours.companyLatitude?.toString() ?? '',

    companyLongitude: hours.companyLongitude?.toString() ?? ''
  };

  console.log('OFFICE HOURS BODY:', body);

  // UPDATE existing
  if (this.officeHoursId) {

    this.http.put<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/officeHours/${this.officeHoursId}`,
      body,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (res) => {
        console.log('Office hours updated:', res);

        localStorage.setItem('officeHours', JSON.stringify(hours));

        this.officeHoursSubject.next(hours);
      },
      error: (err) => console.error('Update failed:', err)
    });

  }

  // CREATE new
  else {

    this.http.post<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/officeHours`,
      body,
      { headers: this.getAuthHeaders() }
    ).subscribe({
      next: (res) => {

        console.log('Office hours created:', res);

        this.officeHoursId = res.id;

        localStorage.setItem('officeHours', JSON.stringify(hours));

        this.officeHoursSubject.next(hours);
      },
      error: (err) => console.error('Create failed:', err)
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

private getAuthHeaders(): HttpHeaders {
  return new HttpHeaders({
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'X-Tenant-ID': localStorage.getItem('tenantId') || ''
  });
}

private toBackendTime(time: string) {
  const [hour, minute] = time.split(':').map(Number);

  return {
    hour,
    minute,
    second: 0,
    nano: 0
  };
}

fetchCurrentOfficeHours() {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/officeHours/current`,
    { headers: this.getAuthHeaders() }
  );
}

}
