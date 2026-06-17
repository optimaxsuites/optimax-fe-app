import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ShiftDTO } from '../../domain/workschedule-shift/shift.dto';
import { MOCK_SHIFTS } from '../../domain/workschedule-shift/mockshifts';

@Injectable({
  providedIn: 'root'
})
export class ShiftserviceService {

  private shiftsSubject = new BehaviorSubject<ShiftDTO[]>([]);
  shifts$ = this.shiftsSubject.asObservable();

  constructor() { 
    //mockshiftsfornow
    this.shiftsSubject.next(MOCK_SHIFTS);
  }

  getShifts(): Observable<ShiftDTO[]> {
    return this.shifts$;
  }

  getShiftById(id: string): ShiftDTO | undefined {
    return this.shiftsSubject.value.find(s => s.id === id);
  }

  addShift(shift: ShiftDTO): void {
    const current = this.shiftsSubject.value;
    this.shiftsSubject.next([...current, shift]);
  }

  updateShift(updatedShift: ShiftDTO): void {
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
