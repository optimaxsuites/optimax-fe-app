import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ShiftDTO } from '../../domain/workschedule-shift/shift.dto';
import { MOCK_SHIFTS } from './mockshifts';

@Injectable({ providedIn: 'root' })
export class ShiftserviceService {

  private _shifts = new BehaviorSubject<ShiftDTO[]>([...MOCK_SHIFTS]);
  readonly shifts$ = this._shifts.asObservable();

  getShiftById(id: string): ShiftDTO | undefined {
    return this._shifts.getValue().find(s => s.id === id);
  }

  addShift(shift: ShiftDTO): void {
    this._shifts.next([...this._shifts.getValue(), shift]);
  }

  updateShift(shift: ShiftDTO): void {
    this._shifts.next(
      this._shifts.getValue().map(s => s.id === shift.id ? shift : s)
    );
  }

  deleteShift(id: string): void {
    this._shifts.next(this._shifts.getValue().filter(s => s.id !== id));
  }
}
