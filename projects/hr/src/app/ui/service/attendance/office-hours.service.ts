import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { OfficeHours, OfficeHoursRequest } from '../../domain/attendance/office-hours.dto';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../shared-component/environments/environment';

const DEFAULT_OFFICE_HOURS: OfficeHours = {
  openingTime: '09:00',
  closingTime: '17:00',
  absentTime: '10:00',
  latenessGracePeriod: '09:15'
};

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
      id: this.toNumber(data?.id),
      openingTime: this.normalizeTime(data?.openingTime ?? data?.opening_time, DEFAULT_OFFICE_HOURS.openingTime),
      closingTime: this.normalizeTime(data?.closingTime ?? data?.closing_time, DEFAULT_OFFICE_HOURS.closingTime),
      absentTime: this.normalizeTime(data?.absentTime ?? data?.absent_time, DEFAULT_OFFICE_HOURS.absentTime),
      latenessGracePeriod: this.normalizeTime(data?.latenessGracePeriod ?? data?.lateness_grace_period, DEFAULT_OFFICE_HOURS.latenessGracePeriod),
      companyLatitude: this.toNumber(data?.companyLatitude),
      companyLongitude: this.toNumber(data?.companyLongitude),
      companyName: data?.companyName
    };
  }

  private normalizeTime(value: unknown, fallback: string): string {
    if (Array.isArray(value)) {
      const hours = Number(value[0]);
      const minutes = Number(value[1] ?? 0);
      if (Number.isFinite(hours) && Number.isFinite(minutes)) {
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      }
    }

    if (value && typeof value === 'object') {
      const time = value as { hour?: number; minute?: number };
      if (time.hour !== undefined || time.minute !== undefined) {
        return `${String(Number(time.hour ?? 0)).padStart(2, '0')}:${String(Number(time.minute ?? 0)).padStart(2, '0')}`;
      }
    }

    const text = String(value ?? '').trim();
    const match = text.match(/(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : fallback;
  }

  private toNumber(value: unknown): number | undefined {
    const number = Number(value);
    return Number.isFinite(number) ? number : undefined;
  }

  getOfficeHours(): OfficeHours {
    return this.officeHoursSubject.value;
  }

  updateOfficeHours(hours: OfficeHours) {

  const body: OfficeHoursRequest = {
    id: this.officeHoursId ?? 0,

    openingTime: hours.openingTime,

    closingTime: hours.closingTime,

    absentTime: hours.absentTime,

    latenessGracePeriod: hours.latenessGracePeriod,

    companyLatitude: hours.companyLatitude?.toString() ?? '',

    companyLongitude: hours.companyLongitude?.toString() ?? ''
  };// UPDATE existing
  if (this.officeHoursId) {this.http.put<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/office-hours/${this.officeHoursId}`,
      body
    ).subscribe({
      next: (res) => {localStorage.setItem('officeHours', JSON.stringify(hours));

        this.officeHoursSubject.next(hours);
      },
      error: (err) => { }
    });

  }

  // CREATE new
  else {this.http.post<any>(
      `${environment.apiBaseUrl}/x/api/v2/hr/office-hours`,
      body
    ).subscribe({
      next: (res) => {this.officeHoursId = res.id;

        localStorage.setItem('officeHours', JSON.stringify(hours));

        this.officeHoursSubject.next(hours);
      },
      error: (err) => { }
    });

  }
}

  private loadOfficeHours(): OfficeHours {
    const saved = localStorage.getItem('officeHours');
    if (!saved) return DEFAULT_OFFICE_HOURS;

    return this.normalizeOfficeHours(JSON.parse(saved));
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

getScheduleMode() {
  return 'mixed' as const;
}

createOfficeHours(payload: any) {
  return this.http.post(
    `${environment.apiBaseUrl}/x/api/v2/hr/office-hours`,
    payload
  );
}

updateOfficeHoursApi(id: number, payload: any) {
  return this.http.put(
    `${environment.apiBaseUrl}/x/api/v2/hr/office-hours/${id}`,
    payload
  );
}

fetchCurrentOfficeHours() {
  return this.http.get<any>(
    `${environment.apiBaseUrl}/x/api/v2/hr/office-hours/current`
  );
}

}

