import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ScheduleDTO } from '../../domain/workschedule-shift/schedule.dto';
import { ConflictDTO } from '../../domain/workschedule-shift/conflict.dto';
import { ShiftserviceService } from './shiftservice.service';

@Injectable({ providedIn: 'root' })
export class ScheduleserviceService {

  private _schedules = new BehaviorSubject<ScheduleDTO[]>([]);
  readonly schedules$ = this._schedules.asObservable();

  constructor(private shiftService: ShiftserviceService) {}

  getSchedulesByEmployee(employeeId: string): ScheduleDTO[] {
    return this._schedules.getValue().filter(s => s.employeeId === employeeId);
  }

  assignShift(schedule: ScheduleDTO): { success: boolean; message?: string } {
    const conflict = this.checkConflict(schedule);
    if (conflict) {
      return { success: false, message: conflict.message };
    }
    this._schedules.next([...this._schedules.getValue(), schedule]);
    return { success: true };
  }

  checkConflict(schedule: ScheduleDTO): ConflictDTO | null {
    const existing = this._schedules.getValue().filter(
      s => s.employeeId === schedule.employeeId && s.date === schedule.date
    );

    for (const s of existing) {
      if (s.shiftId === schedule.shiftId) {
        return {
          employeeId: schedule.employeeId,
          shiftId: schedule.shiftId,
          date: schedule.date,
          conflictType: 'DUPLICATE_ASSIGNMENT',
          message: 'Employee is already assigned to this shift on this date.'
        };
      }

      const newShift = this.shiftService.getShiftById(schedule.shiftId);
      const existingShift = this.shiftService.getShiftById(s.shiftId);

      if (newShift && existingShift && this.shiftsOverlap(newShift.startTime, newShift.endTime, existingShift.startTime, existingShift.endTime)) {
        return {
          employeeId: schedule.employeeId,
          shiftId: schedule.shiftId,
          date: schedule.date,
          conflictType: 'OVERLAPPING_SHIFT',
          message: `Overlaps with existing shift "${existingShift.name}" (${existingShift.startTime}–${existingShift.endTime}).`
        };
      }
    }

    return null;
  }

  private shiftsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const s1 = toMinutes(start1), e1 = toMinutes(end1);
    const s2 = toMinutes(start2), e2 = toMinutes(end2);
    return s1 < e2 && s2 < e1;
  }
}
