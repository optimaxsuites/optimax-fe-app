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

  private getHoursBetween(
    endTime: string,
    nextStart: string
  ): number {

    const end =
      new Date(`2000-01-01 ${endTime}`);

    const start =
      new Date(`2000-01-02 ${nextStart}`);

    return (
      start.getTime() - end.getTime()
    ) / (1000 * 60 * 60);
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

  private generateRecurringDates(
    startDate: string,
    recurrence: string,
    endDate?: string,
    customDays: string[] = [],
    repeatCount: number = 1
  ): string[] {

    const dates: string[] = [];
    const start = new Date(startDate);

    if (recurrence === 'none') {
      return [startDate];
    }

    if (recurrence === 'daily') {

      for (let i = 0; i < repeatCount; i++) {

        const d = new Date(start);
        d.setDate(start.getDate() + i);

        dates.push(this.formatDateLocal(d));
      }

      return dates;
    }

    if (recurrence === 'weekly') {

      for (let i = 0; i < repeatCount; i++) {

        const d = new Date(start);
        d.setDate(start.getDate() + i * 7);

        dates.push(this.formatDateLocal(d));
      }
      return dates;
    }

    // CUSTOM DAYS
    if (recurrence === 'custom') {

      if (!customDays.length) {
        return [startDate];
      }

      const dayMap: Record<string, number> = {
        Sun: 0,
        Mon: 1,
        Tue: 2,
        Wed: 3,
        Thu: 4,
        Fri: 5,
        Sat: 6
      };

      for (
        let week = 0;
        week < repeatCount;
        week++
      ) {

        const weekStart =
          new Date(start);

        weekStart.setDate(
          start.getDate() +
          (week * 7)
        );

        customDays.forEach(dayName => {

          const targetDay =
            dayMap[dayName];

          const d =
            new Date(weekStart);

          while (
            d.getDay() !== targetDay
          ) {
            d.setDate(
              d.getDate() + 1
            );
          }

          dates.push(
            this.formatDateLocal(d)
          );
        });
      }

      return dates.sort();
    }

    return [startDate];
  }

private formatDateLocal(date: Date): string {

  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}


  /* ASSIGN SHIFT */
  assignShift(schedule: ScheduleDTO)
  /*: { success: boolean; message?: string }*/ 
  {
    console.log('ASSIGNING', schedule);
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

      console.log('ALL SCHEDULES', this.schedulesSubject.value);

    return { success: true };

  }

  deleteSchedule(id: string): void {
    const updated =
      this.schedulesSubject.value.filter(
        s => s.id !== id
      );
    this.schedulesSubject.next(updated);
  }

  updateSchedule(schedule: ScheduleDTO): void {
    const updated =
      this.schedulesSubject.value.map(s =>
        s.id === schedule.id
          ? schedule
          : s
      );
    this.schedulesSubject.next(updated);
  }

  deleteScheduleSeries(
    assignmentGroupId: string
  ): void {

    const updated =
      this.schedulesSubject.value.filter(
        s => s.assignmentGroupId !== assignmentGroupId
      );

    this.schedulesSubject.next(updated);
  }

  /*updateScheduleSeries(
    assignmentGroupId: string,
    changes: Partial<ScheduleDTO>
  ): void {

    const updated =
      this.schedulesSubject.value.map(schedule => {

        if (
          schedule.assignmentGroupId ===
          assignmentGroupId
        ) {
          return {
            ...schedule,
            ...changes
          };
        }

        return schedule;
      });

    this.schedulesSubject.next(updated);
  }*/


  /*updateScheduleSeries(
    assignmentGroupId: string,
    changes: Partial<ScheduleDTO>
  ): void {

    const schedules =
      this.schedulesSubject.value;

    const series =
      schedules.filter(
        s =>
          s.assignmentGroupId ===
          assignmentGroupId
      );

    if (!series.length) {
      return;
    }

    const template = series[0];

    const startDate =
      changes.date ??
      template.date;

    const recurrence =
      changes.recurrence ??
      template.recurrence ??
      'none';

    const newDates =
      this.generateRecurringDates(
        startDate,
        recurrence
      );

    const remainingSchedules =
      schedules.filter(
        s =>
          s.assignmentGroupId !==
          assignmentGroupId
      );

    const regeneratedSeries =
      newDates.map(date => ({
        ...template,

        ...changes,

        id: crypto.randomUUID(),

        date,

        assignmentGroupId
      }));

    this.schedulesSubject.next([
      ...remainingSchedules,
      ...regeneratedSeries
    ]);
  }*/

  updateScheduleSeries(
    assignmentGroupId: string,
    changes: Partial<ScheduleDTO>
  ): void {

    const schedules = this.schedulesSubject.value;

    const series = schedules.filter(
      s => s.assignmentGroupId === assignmentGroupId
    );

    if (!series.length) return;

    const template = series[0];

    const recurrenceChanged =
      changes.recurrence !== undefined &&
      changes.recurrence !== template.recurrence;

    const startDateChanged =
      changes.date !== undefined &&
      changes.date !== template.date;

    // SIMPLE UPDATE
    if (!recurrenceChanged && !startDateChanged) {

      const updated = schedules.map(schedule => {

        if (
          schedule.assignmentGroupId ===
          assignmentGroupId
        ) {
          return {
            ...schedule,
            ...changes
          };
        }

        return schedule;
      });

      this.schedulesSubject.next(updated);
      return;
    }

    // REGENERATE SERIES
    const startDate =
      changes.date ?? template.date;

    const recurrence =
      changes.recurrence ??
      template.recurrence ??
      'none';

    const repeatCount =
      changes.repeatCount ??
      template.repeatCount ??
      1;

    const newDates =
      this.generateRecurringDates(
        startDate,
        recurrence,
        undefined,
        changes.customDays ??
        template.customDays ??
        [],
        repeatCount
      );

    const remainingSchedules =
      schedules.filter(
        s =>
          s.assignmentGroupId !==
          assignmentGroupId
      );

    const regeneratedSeries =
      newDates.map(date => ({
        ...template,
        ...changes,
        id: crypto.randomUUID(),
        date,
        assignmentGroupId
      }));

    this.schedulesSubject.next([
      ...remainingSchedules,
      ...regeneratedSeries
    ]);
  }

  /* REMOVE ASSIGNMENT */
  removeAssignment(scheduleId: string): void {

    const filtered = this.schedulesSubject.value.filter(
      s => s.id !== scheduleId
    );

    this.schedulesSubject.next(filtered);

  }

  /* CONFLICT DETECTION */
    detectConflict(schedule: ScheduleDTO, ignoreScheduleId?: string): ConflictDTO | null {

    const schedules = this.schedulesSubject.value;

    const employeeSchedules = schedules.filter(
      s => s.employeeId === schedule.employeeId && s.date === schedule.date && s.id !== ignoreScheduleId
    );

    if (employeeSchedules.length === 0) return null;

    const newShift = this.shiftserviceService.getShiftById(schedule.shiftId);

    if (!newShift) return null;

    for (const existing of employeeSchedules) {

      const totalHoursToday = employeeSchedules.reduce(
        (total, existingSchedule) => {

          const shift = this.shiftserviceService.getShiftById(
            existingSchedule.shiftId
          );

          if (!shift) return total;

          return total + this.calculateHours(
            shift.startTime,
            shift.endTime
          );

        },
        0
      );

const newShiftHours = this.calculateHours(
  newShift.startTime,
  newShift.endTime
);

if (totalHoursToday + newShiftHours > 12) {
  return {
    employeeId: schedule.employeeId,
    shiftId: schedule.shiftId,
    date: schedule.date,
    conflictType: 'EXCEEDS_MAX_HOURS',
    message: 'Employee exceeds maximum daily hours'
  };
}

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

  private calculateHours(
    start: string,
    end: string
  ): number {

    const startMin = this.toMinutes(start);
    const endMin = this.toMinutes(end);

    let diff = endMin - startMin;

    if (diff < 0) {
      diff += 24 * 60;
    }

    return diff / 60;
  }

  checkConflict(schedule: ScheduleDTO, ignoreScheduleId?: string) {
    const previousSchedules =
    this.schedulesSubject.value.filter(
      s =>
        s.employeeId === schedule.employeeId &&
        new Date(s.date) <
        new Date(schedule.date)
    );
    const latestSchedule =
    previousSchedules.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )[0];
    if (latestSchedule) {

  const previousShift =
    this.shiftserviceService.getShiftById(
      latestSchedule.shiftId
    );

  const currentShift =
    this.shiftserviceService.getShiftById(
      schedule.shiftId
    );

  if (previousShift && currentShift) {

    const restHours =
      this.getHoursBetween(
        previousShift.endTime,
        currentShift.startTime
      );

    if (restHours < 8) {

      return {
        conflictType: 'INSUFFICIENT_REST',
        scheduleId: schedule.id,
        message:
          `Only ${restHours} hours between shifts`
      };
    }
  }
}
  return this.detectConflict(schedule, ignoreScheduleId);

  
}


  
}
