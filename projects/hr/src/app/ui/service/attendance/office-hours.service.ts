import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient, HttpParams } from '@angular/common/http';
import { OfficeHours, OfficeHoursApiDTO, PagedResponse } from '../../domain/attendance/office-hours.dto';
import { LocalTimeDTO } from '../../domain/attendance/attendance-event.dto';
import { environment } from '../../shared-component/environments/environment';

const DEFAULT_OFFICE_HOURS: OfficeHours = {
  openingTime: '09:00',
  closingTime: '17:00',
  absentTime: '10:00',
  latenessGracePeriod: '09:15'
};

const EMPTY_PAGE: PagedResponse<OfficeHoursApiDTO> = { content: [], totalSize: 0, page: 0, size: 0 };

@Injectable({ providedIn: 'root' })
export class OfficeHoursService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/officeHours`;

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
        this.officeHoursId = hours.id ?? null;
        this.officeHoursSubject.next(hours);
        localStorage.setItem('officeHours', JSON.stringify(hours));
      },
      error: () => {
        const saved = localStorage.getItem('officeHours');
        if (saved) {
          this.officeHoursSubject.next(JSON.parse(saved));
        }
      }
    });
  }

  getOfficeHours(): OfficeHours {
    return this.officeHoursSubject.value;
  }

  /** GET /officeHours */
  getAllOfficeHours(page?: number, size?: number): Observable<OfficeHours[]> {
    let params = new HttpParams();
    if (page !== undefined) params = params.set('page', page);
    if (size !== undefined) params = params.set('size', size);

    return this.http.get<PagedResponse<OfficeHoursApiDTO>>(this.BASE, { params }).pipe(
      map(res => (res.content || []).map(dto => this.toUiModel(dto))),
      catchError(error => {
        console.error('Failed to get office hours list:', error);
        return of([]);
      })
    );
  }

  /** GET /officeHours/{id} */
  getOfficeHoursById(id: number): Observable<OfficeHours | null> {
    return this.http.get<OfficeHoursApiDTO>(`${this.BASE}/${id}`).pipe(
      map(dto => this.toUiModel(dto)),
      catchError(error => {
        console.error(`Failed to get office hours ${id}:`, error);
        return of(null);
      })
    );
  }

  /** GET /officeHours/current */
  fetchCurrentOfficeHours(): Observable<OfficeHours> {
    return this.http.get<OfficeHoursApiDTO>(`${this.BASE}/current`).pipe(
      map(dto => this.toUiModel(dto))
    );
  }

  /** POST /officeHours */
  createOfficeHours(hours: OfficeHours): Observable<OfficeHours> {
    return this.http.post<OfficeHoursApiDTO>(this.BASE, this.toApiBody(hours)).pipe(
      map(dto => this.toUiModel(dto))
    );
  }

  /** PUT /officeHours/{id} */
  updateOfficeHoursApi(id: number, hours: OfficeHours): Observable<OfficeHours> {
    return this.http.put<OfficeHoursApiDTO>(`${this.BASE}/${id}`, this.toApiBody(hours, id)).pipe(
      map(dto => this.toUiModel(dto))
    );
  }

  /** DELETE /officeHours/{id} */
  deleteOfficeHours(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }

  updateOfficeHours(hours: OfficeHours): void {
    const request$ = this.officeHoursId
      ? this.updateOfficeHoursApi(this.officeHoursId, hours)
      : this.createOfficeHours(hours);

    request$.subscribe({
      next: (saved) => {
        this.officeHoursId = saved.id ?? this.officeHoursId;
        localStorage.setItem('officeHours', JSON.stringify(saved));
        this.officeHoursSubject.next(saved);
      },
      error: (err) => console.error('Failed to save office hours:', err)
    });
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

  private toUiModel(dto: OfficeHoursApiDTO): OfficeHours {
    return {
      id: dto.id,
      openingTime: this.fromLocalTime(dto.openingTime, DEFAULT_OFFICE_HOURS.openingTime),
      closingTime: this.fromLocalTime(dto.closingTime, DEFAULT_OFFICE_HOURS.closingTime),
      absentTime: this.fromLocalTime(dto.absentTime, DEFAULT_OFFICE_HOURS.absentTime),
      latenessGracePeriod: this.fromLocalTime(dto.latenessGracePeriod, DEFAULT_OFFICE_HOURS.latenessGracePeriod),
      companyLatitude: dto.companyLatitude !== undefined ? Number(dto.companyLatitude) : undefined,
      companyLongitude: dto.companyLongitude !== undefined ? Number(dto.companyLongitude) : undefined,
      companyName: dto.companyName
    };
  }

  private toApiBody(hours: OfficeHours, id?: number): OfficeHoursApiDTO {
    return {
      id: id ?? hours.id ?? 0,
      openingTime: this.toLocalTime(hours.openingTime),
      closingTime: this.toLocalTime(hours.closingTime),
      absentTime: this.toLocalTime(hours.absentTime),
      latenessGracePeriod: this.toLocalTime(hours.latenessGracePeriod),
      companyLatitude: hours.companyLatitude?.toString() ?? '',
      companyLongitude: hours.companyLongitude?.toString() ?? '',
      companyName: hours.companyName ?? ''
    };
  }

  private toLocalTime(hhmm: string): LocalTimeDTO {
    const [hour = 0, minute = 0] = (hhmm ?? '').split(':').map(Number);
    return { hour, minute, second: 0, nano: 0 };
  }

  private fromLocalTime(value: LocalTimeDTO | undefined, fallback: string): string {
    if (!value || (value.hour === undefined && value.minute === undefined)) {
      return fallback;
    }
    return `${String(value.hour ?? 0).padStart(2, '0')}:${String(value.minute ?? 0).padStart(2, '0')}`;
  }
}
