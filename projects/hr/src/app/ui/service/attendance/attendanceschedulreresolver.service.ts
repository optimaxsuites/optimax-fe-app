import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkingWindow } from '../../domain/attendance/working-window.dto';
import { OfficeHoursService } from './office-hours.service';
import { ScheduleserviceService } from '../workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../workschedule-shift/shiftservice.service';
import { ShiftDTO } from '../../domain/workschedule-shift/shift.dto';

@Injectable({ providedIn: 'root' })
export class AttendanceScheduleResolverService {

  constructor(
    private officeHoursService: OfficeHoursService,
    private scheduleserviceService: ScheduleserviceService,
    private shiftserviceService: ShiftserviceService
  ) {}

  resolve(employeeId: string, date: Date): Observable<WorkingWindow> {
    const mode = this.officeHoursService.getScheduleMode();

    // Strict office-hours mode: skip shift lookup entirely
    if (mode === 'office-hours') {
      return of(this.buildOfficeHoursWindow());
    }

    // For 'shift' or 'mixed': use ScheduleserviceService to find
    // if this employee has a shift assigned on this date
    const dateString = date.toISOString().split('T')[0];

    // Step 1: get all schedules for this employee
    const employeeSchedules = this.scheduleserviceService.getSchedulesByEmployee(employeeId);

    // Step 2: find one that matches today's date
    const todaySchedule = employeeSchedules.find(s => s.date === dateString);

    if (todaySchedule) {
      // Step 3: get the actual shift definition by its ID
      const shift = this.shiftserviceService.getShiftById(todaySchedule.shiftId);

      if (shift) {
        return of(this.buildShiftWindow(shift, todaySchedule.id));
      }
    }

    // No shift assigned for this employee today:
    // - 'mixed' mode → fall back to office hours (intended behaviour)
    // - 'shift' mode → also fall back, but flag it so you can surface a warning if needed
    if (mode === 'shift') {
      console.warn(
        `[AttendanceResolver] Employee ${employeeId} has no shift assigned on ${dateString}. ` +
        `Falling back to office hours. Consider assigning a shift in Work Schedules.`
      );
    }

    return of(this.buildOfficeHoursWindow());
  }

  // --- Private builders ---

  private buildOfficeHoursWindow(): WorkingWindow {
    const oh = this.officeHoursService.getOfficeHours();
    return {
      scheduleType: 'office-hours',
      openingTime: oh.openingTime,
      latenessGracePeriod: oh.latenessGracePeriod,
      absentTime: oh.absentTime,
      closingTime: oh.closingTime,
      sourceId: 'office-hours-global'
    };
  }

  private buildShiftWindow(shift: ShiftDTO, scheduleId: string): WorkingWindow {
    const oh = this.officeHoursService.getOfficeHours();

    // ShiftDTO has startTime and endTime but no grace/absent fields —
    // so we derive sensible defaults relative to the shift's own start time,
    // using the same offsets that are configured in office hours.
    const graceOffsetMinutes = this.getOffsetMinutes(
      oh.openingTime,
      oh.latenessGracePeriod
    );
    const absentOffsetMinutes = this.getOffsetMinutes(
      oh.openingTime,
      oh.absentTime
    );

    return {
      scheduleType: 'shift',
      shiftName: shift.name,
      openingTime: shift.startTime,
      latenessGracePeriod: this.addMinutes(shift.startTime, graceOffsetMinutes),
      absentTime: this.addMinutes(shift.startTime, absentOffsetMinutes),
      closingTime: shift.endTime,
      sourceId: scheduleId
    };
  }

  // How many minutes after openingTime is the grace/absent threshold?
  // e.g. opening=09:00, grace=09:15 → 15 minutes
  // This same offset is then applied relative to a shift's own start time.
  private getOffsetMinutes(base: string, target: string): number {
    return this.toMinutes(target) - this.toMinutes(base);
  }

  private addMinutes(time: string, minutes: number): string {
    const total = this.toMinutes(time) + minutes;
    const h = Math.floor(total / 60) % 24;
    const m = total % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  private toMinutes(time: string): number {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  }
}