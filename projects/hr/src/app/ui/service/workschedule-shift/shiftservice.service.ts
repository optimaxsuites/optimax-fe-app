import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { WorkShiftDTO, ShiftApiDTO } from '../../domain/workschedule-shift/shift.dto';
import { LocalTimeDTO, PagedResponse } from '../../domain/attendance/attendance-event.dto';
import { MOCK_SHIFTS } from '../../domain/workschedule-shift/mockshifts';
import { getAppConfig } from '../../../config/app-config';
import { environment } from '../../shared-component/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ShiftserviceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/shifts`;

  private shiftsSubject = new BehaviorSubject<WorkShiftDTO[]>([]);
  shifts$ = this.shiftsSubject.asObservable();

  constructor(private http: HttpClient) {
    const config = getAppConfig();
    if (config.features.useMockShiftData) {
      this.shiftsSubject.next(MOCK_SHIFTS);
    } else {
      this.refresh();
    }
  }

  /** GET /shifts — refreshes the local cache from the backend. */
  refresh(): void {
    this.http.get<PagedResponse<ShiftApiDTO>>(this.BASE).pipe(
      map(res => (res.content || []).map(dto => this.toUiModel(dto))),
      catchError(error => {
        console.error('Failed to load shifts:', error);
        return of([]);
      })
    ).subscribe(shifts => this.shiftsSubject.next(shifts));
  }

  getShifts(): Observable<WorkShiftDTO[]> {
    return this.shifts$;
  }

  getShiftById(id: string): WorkShiftDTO | undefined {
    return this.shiftsSubject.value.find(s => s.id === id);
  }

  /** POST /shifts */
  addShift(shift: WorkShiftDTO): void {
    this.http.post<ShiftApiDTO>(this.BASE, this.toApiBody(shift, 0)).pipe(
      map(dto => this.toUiModel(dto)),
      catchError(error => {
        console.error('Failed to create shift:', error);
        throw error;
      })
    ).subscribe(created => {
      this.shiftsSubject.next([...this.shiftsSubject.value, created]);
    });
  }

  /** PUT /shifts/{id} */
  updateShift(updatedShift: WorkShiftDTO): void {
    const id = Number(updatedShift.id);
    this.http.put<ShiftApiDTO>(`${this.BASE}/${id}`, this.toApiBody(updatedShift, id)).pipe(
      map(dto => this.toUiModel(dto)),
      catchError(error => {
        console.error('Failed to update shift:', error);
        throw error;
      })
    ).subscribe(saved => {
      const updated = this.shiftsSubject.value.map(shift =>
        shift.id === updatedShift.id ? saved : shift
      );
      this.shiftsSubject.next(updated);
    });
  }

  /** DELETE /shifts/{id} */
  deleteShift(id: string): void {
    this.http.delete<void>(`${this.BASE}/${id}`).pipe(
      catchError(error => {
        console.error('Failed to delete shift:', error);
        throw error;
      })
    ).subscribe(() => {
      const filtered = this.shiftsSubject.value.filter(shift => shift.id !== id);
      this.shiftsSubject.next(filtered);
    });
  }

  private toUiModel(dto: ShiftApiDTO): WorkShiftDTO {
    return {
      id: String(dto.id),
      name: dto.name,
      type: this.toUiType(dto.type),
      startTime: this.fromLocalTime(dto.startTime),
      endTime: this.fromLocalTime(dto.endTime),
      description: dto.description,
      color: dto.color
    };
  }

  private toApiBody(shift: WorkShiftDTO, id: number): ShiftApiDTO {
    return {
      id,
      name: shift.name,
      type: shift.type.toUpperCase(),
      startTime: this.toLocalTime(shift.startTime),
      endTime: this.toLocalTime(shift.endTime),
      description: shift.description ?? '',
      color: shift.color ?? ''
    };
  }

  private toUiType(type: string): WorkShiftDTO['type'] {
    const lower = (type || '').toLowerCase();
    return lower === 'morning' || lower === 'evening' || lower === 'night'
      ? lower
      : 'custom';
  }

  private toLocalTime(hhmm: string): LocalTimeDTO {
    const [hour = 0, minute = 0] = (hhmm ?? '').split(':').map(Number);
    return { hour, minute, second: 0, nano: 0 };
  }

  private fromLocalTime(value: LocalTimeDTO): string {
    if (!value) return '00:00';
    return `${String(value.hour ?? 0).padStart(2, '0')}:${String(value.minute ?? 0).padStart(2, '0')}`;
  }
}
