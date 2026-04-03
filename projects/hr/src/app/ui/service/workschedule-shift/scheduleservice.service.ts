import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ScheduleDTO } from '../../domain/workschedule-shift/schedule.dto';
import { ConflictDTO } from '../../domain/workschedule-shift/conflict.dto';
import { ShiftserviceService } from './shiftservice.service';

@Injectable({
  providedIn: 'root'
})
export class ScheduleserviceService {

  private schedulesSubject = new BehaviorSubject<ScheduleDTO[]>([]);
  schedules$ = this.schedulesSubject.asObservable();

  constructor(private shiftserviceService: ShiftserviceService) { 
    const mockSchedules: ScheduleDTO[] = [
    {
      id: 'sch-1',
      employeeId: 'emp-1',
      shiftId: 'shift-1',
      date: '2026-04-03',
      project: 'CivicLens Dashboard'
    },
    {
      id: 'sch-2',
      employeeId: 'emp-2',
      shiftId: 'shift-1',
      date: '2026-04-03',
      project: 'CivicLens Dashboard'
    },
    {
      id: 'sch-3',
      employeeId: 'emp-3',
      shiftId: 'shift-2',
      date: '2026-04-03',
      project: 'ERP Revamp'
    },

    // extra days (for pagination testing)
    {
      id: 'sch-4',
      employeeId: 'emp-1',
      shiftId: 'shift-2',
      date: '2026-04-04',
      project: 'ERP Revamp'
    },
    {
      id: 'sch-5',
      employeeId: 'emp-2',
      shiftId: 'shift-3',
      date: '2026-04-05',
      project: 'Mobile App'
    }
  ];

  this.schedulesSubject.next(mockSchedules);
    
  }

  /* GET ALL SCHEDULES */
  getSchedules(): Observable<ScheduleDTO[]> {
    return this.schedules$;
  }


  /* GET SCHEDULES BY DATE */
  getSchedulesByDate(date: string): ScheduleDTO[] {

    return this.schedulesSubject.value.filter(
      s => s.date === date
    );

  }


  /* GET EMPLOYEE SCHEDULES */
  getSchedulesByEmployee(employeeId: string): ScheduleDTO[] {

    return this.schedulesSubject.value.filter(
      s => s.employeeId === employeeId
    );

  }


  /* ASSIGN SHIFT */
  assignShift(schedule: ScheduleDTO)
  /*: { success: boolean; message?: string }*/ 
  {
    const conflict = this.detectConflict(schedule);

    if (conflict) {
      return {
        success: false,
        //message: 'Employee already has a shift assigned on this date'
        message: conflict.message
      };
    }

    const current = this.schedulesSubject.value;
    this.schedulesSubject.next([
      ...current,
      schedule
    ]);

    return { success: true };

  }

  /* REMOVE ASSIGNMENT */
  removeAssignment(scheduleId: string): void {

    const filtered = this.schedulesSubject.value.filter(
      s => s.id !== scheduleId
    );

    this.schedulesSubject.next(filtered);

  }

  /* CONFLICT DETECTION */
    detectConflict(schedule: ScheduleDTO): ConflictDTO | null {

    const schedules = this.schedulesSubject.value;

    const employeeSchedules = schedules.filter(
      s => s.employeeId === schedule.employeeId && s.date === schedule.date
    );

    if (employeeSchedules.length === 0) return null;

    const newShift = this.shiftserviceService.getShiftById(schedule.shiftId);

    if (!newShift) return null;

    for (const existing of employeeSchedules) {

      const existingShift = this.shiftserviceService.getShiftById(existing.shiftId);

      if (!existingShift) continue;

      /* DUPLICATE SHIFT */

      if (existing.shiftId === schedule.shiftId) {
        return {
          employeeId: schedule.employeeId,
          shiftId: schedule.shiftId,
          date: schedule.date,
          conflictType: 'DUPLICATE_ASSIGNMENT',
          message: `Employee already assigned to ${existingShift.name}`
        };
      }

      /* OVERLAPPING SHIFTS */

      const overlap = this.isOverlapping(
        newShift.startTime,
        newShift.endTime,
        existingShift.startTime,
        existingShift.endTime
      );

      if (overlap) {

        return {
          employeeId: schedule.employeeId,
          shiftId: schedule.shiftId,
          date: schedule.date,
          conflictType: 'OVERLAPPING_SHIFT',
          message: `Conflict with ${existingShift.name} (${existingShift.startTime}-${existingShift.endTime})`
        };

      }

    }

    return null;

  }

    /* TIME OVERLAP CHECK */

  private isOverlapping(
    startA: string,
    endA: string,
    startB: string,
    endB: string
  ): boolean {

    const aStart = this.toMinutes(startA);
    const aEnd = this.toMinutes(endA);
    const bStart = this.toMinutes(startB);
    const bEnd = this.toMinutes(endB);

    return aStart < bEnd && aEnd > bStart;

  }

  private toMinutes(time: string): number {

    const [hours, minutes] = time.split(':').map(Number);

    return hours * 60 + minutes;

  }

  checkConflict(schedule: ScheduleDTO) {
  return this.detectConflict(schedule);
}
  
}
