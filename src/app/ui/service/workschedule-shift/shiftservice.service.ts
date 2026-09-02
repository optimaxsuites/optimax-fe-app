import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WorkShiftDTO } from '../../domain/workschedule-shift/shift.dto';
import { MOCK_SHIFTS } from '../../domain/workschedule-shift/mockshifts';
import { getAppConfig } from '../../../config/app-config';

@Injectable({
  providedIn: 'root'
})
export class ShiftserviceService {

  private shiftsSubject = new BehaviorSubject<WorkShiftDTO[]>([]);
  shifts$ = this.shiftsSubject.asObservable();

  constructor() { 
    // Load mock shifts only if enabled in configuration
    const config = getAppConfig();
    if (config.features.useMockShiftData) {
      this.shiftsSubject.next(MOCK_SHIFTS);
    }
  }

  getShifts(): Observable<WorkShiftDTO[]> {
    return this.shifts$;
  }

  getShiftById(id: string): WorkShiftDTO | undefined {
    return this.shiftsSubject.value.find(s => s.id === id);
  }

  addShift(shift: WorkShiftDTO): void {
    const current = this.shiftsSubject.value;
    this.shiftsSubject.next([...current, shift]);
  }

  updateShift(updatedShift: WorkShiftDTO): void {
    const updated = this.shiftsSubject.value.map(shift =>
      shift.id === updatedShift.id ? updatedShift : shift
    );

    this.shiftsSubject.next(updated);
  }

  deleteShift(id: string): void {
    const filtered = this.shiftsSubject.value.filter(
      shift => shift.id !== id
    );

    this.shiftsSubject.next(filtered);
  }
}
