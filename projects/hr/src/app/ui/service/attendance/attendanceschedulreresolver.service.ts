import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { WorkingWindow } from '../../domain/attendance/working-window.dto';
import { OfficeHoursService } from './office-hours.service';
import { ScheduleserviceService } from '../workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../workschedule-shift/shiftservice.service';
import { WorkShiftDTO } from '../../domain/workschedule-shift/shift.dto';

@Injectable({ providedIn: 'root' })
export class AttendanceScheduleResolverService {

  constructor(
    private officeHoursService: OfficeHoursService,
    private scheduleserviceService: ScheduleserviceService,
    private shiftserviceService: ShiftserviceService
  ) {}

  resolve(employeeId: string, date: Date): Observable<WorkingWindow> {
    /*const mode = this.officeHoursService.getScheduleMode();

    // Strict office-hours mode: skip shift lookup entirely
    if (mode === 'office-hours') {
      return of(this.buildOfficeHoursWindow());
    }*/

    // For 'shift' or 'mixed': use ScheduleserviceService to find
    // if this employee has a shift assigned on this date.
    //
    // The date must be local. ScheduleDTO.date is a plain local YYYY-MM-DD
    // written by the shift calendar, so deriving this from toISOString() —
    // which converts to UTC first — resolved the wrong day either side of
    // midnight and silently fell back to office hours.
    const dateString = this.toLocalDateString(date);

    // Filter by date first, then match the employee on either id scheme —
    // see employeeMatches for why an exact comparison is not enough yet.
    const todaySchedule = this.scheduleserviceService
      .getSchedulesByDate(dateString)
      .find(s => this.employeeMatches(s.employeeId, employeeId));

    if (todaySchedule) {
      const shift = this.shiftserviceService.getShiftById(todaySchedule.shiftId);

      if (shift) {
        return of(this.buildShiftWindow(shift, todaySchedule.id));
      }
    }

    // No shift assigned for this employee today:
    // - 'mixed' mode → fall back to office hours (intended behaviour)
    // - 'shift' mode → also fall back, but flag it so you can surface a warning if needed
    /*if (mode === 'shift') {
      console.warn(
        `[AttendanceResolver] Employee ${employeeId} has no shift assigned on ${dateString}. ` +
        `Falling back to office hours. Consider assigning a shift in Work Schedules.`
      );
    }*/

    return of(this.buildOfficeHoursWindow());
  }

  // --- Identity ---

  /**
   * Bridges the two employee-id schemes either side of this boundary.
   *
   * Attendance identifies an employee by their numeric database id, while the
   * shift module still stores the mock `emp-1` keys from its hardcoded roster.
   * A plain `===` therefore never matched, so every clock-in fell through to
   * office hours no matter what shift was assigned.
   *
   * Matching on the digits is the bridge, not the destination: once the shift
   * module stores real employee ids, delete this and compare directly.
   */
  private employeeMatches(scheduleEmployeeId: string, employeeId: string): boolean {
    if (scheduleEmployeeId === employeeId) return true;

    const digitsOf = (value: string) => (value ?? '').replace(/\D/g, '');
    const scheduleDigits = digitsOf(scheduleEmployeeId);
    const employeeDigits = digitsOf(employeeId);

    return !!scheduleDigits && scheduleDigits === employeeDigits;
  }

  /** Local calendar date — never toISOString(), which shifts to UTC first. */
  private toLocalDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  private buildShiftWindow(shift: WorkShiftDTO, scheduleId: string): WorkingWindow {
    const oh = this.officeHoursService.getOfficeHours();

    // WorkShiftDTO has startTime and endTime but no grace/absent fields —
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