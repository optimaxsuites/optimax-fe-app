import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  ShiftScheduleDTO,
  WorkScheduleApiDTO,
  UpsertWorkScheduleRequest
} from '../../domain/workschedule-shift/schedule.dto';
import { ConflictDTO } from '../../domain/workschedule-shift/conflict.dto';
import { ShiftserviceService } from './shiftservice.service';
import { PagedResponse } from '../../domain/attendance/attendance-event.dto';
import { environment } from '../../shared-component/environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class ScheduleserviceService {
  private readonly BASE = `${environment.apiBaseUrl}/x/api/v2/hr/workSchedules`;

  private schedulesSubject = new BehaviorSubject<ShiftScheduleDTO[]>([]);
  schedules$ = this.schedulesSubject.asObservable();

  constructor(
    private shiftserviceService: ShiftserviceService,
    private http: HttpClient
  ) {
    this.refresh();
  }

  /** GET /workSchedules — refreshes the local cache from the backend. */
  refresh(): void {
    this.http.get<PagedResponse<WorkScheduleApiDTO>>(this.BASE).pipe(
      map(res => (res.content || []).flatMap(dto => this.expandToUiRows(dto))),
      catchError(error => {
        console.error('Failed to load work schedules:', error);
        return of([]);
      })
    ).subscribe(schedules => this.schedulesSubject.next(schedules));
  }

  /** GET /workSchedules/active */
  getActiveSchedules(): Observable<ShiftScheduleDTO[]> {
    return this.http.get<PagedResponse<WorkScheduleApiDTO>>(`${this.BASE}/active`).pipe(
      map(res => (res.content || []).flatMap(dto => this.expandToUiRows(dto))),
      catchError(error => {
        console.error('Failed to load active work schedules:', error);
        return of([]);
      })
    );
  }

  /** GET /workSchedules/dateRange */
  getSchedulesInDateRange(startDate?: string, endDate?: string): Observable<ShiftScheduleDTO[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<PagedResponse<WorkScheduleApiDTO>>(`${this.BASE}/dateRange`, { params }).pipe(
      map(res => (res.content || []).flatMap(dto => this.expandToUiRows(dto))),
      catchError(error => {
        console.error('Failed to load work schedules for date range:', error);
        return of([]);
      })
    );
  }

  /** GET /workSchedules/department/{departmentId} */
  getSchedulesByDepartmentApi(departmentId: number): Observable<ShiftScheduleDTO[]> {
    return this.http.get<PagedResponse<WorkScheduleApiDTO>>(`${this.BASE}/department/${departmentId}`).pipe(
      map(res => (res.content || []).flatMap(dto => this.expandToUiRows(dto))),
      catchError(error => {
        console.error(`Failed to load work schedules for department ${departmentId}:`, error);
        return of([]);
      })
    );
  }

  /** GET /workSchedules/employee/{employeeId} */
  getSchedulesByEmployeeApi(employeeId: number): Observable<ShiftScheduleDTO[]> {
    return this.http.get<PagedResponse<WorkScheduleApiDTO>>(`${this.BASE}/employee/${employeeId}`).pipe(
      map(res => (res.content || []).flatMap(dto => this.expandToUiRows(dto))),
      catchError(error => {
        console.error(`Failed to load work schedules for employee ${employeeId}:`, error);
        return of([]);
      })
    );
  }

  /**
   * The backend stores one row per employee+shift spanning startDate..endDate; the UI renders
   * one row per calendar day, so a multi-day API row is expanded into several UI rows sharing
   * a composite `${apiId}:${date}` id (not itself PUT/DELETE-able — see syncUpdate/syncDelete).
   */
  private expandToUiRows(dto: WorkScheduleApiDTO): ShiftScheduleDTO[] {
    const dates = this.enumerateDates(dto.startDate, dto.endDate);

    return dates.map(date => ({
      id: dates.length > 1 ? `${dto.id}:${date}` : String(dto.id),
      employeeId: dto.employeeId ? String(dto.employeeId.id) : '',
      shiftId: dto.shiftId ? String(dto.shiftId.id) : '',
      date,
      status: this.toUiStatus(dto.status),
      project: dto.projectId?.name,
      projectId: dto.projectId?.id,
      departmentId: dto.departmentId?.id,
      location: dto.location,
      recurrence: this.toUiRecurrence(dto.recurrence),
      description: dto.description
    }));
  }

  private enumerateDates(startDate: string, endDate: string): string[] {
    if (!startDate) return [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : start;
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return [startDate];

    const dates: string[] = [];
    const current = new Date(start);
    while (current <= end) {
      dates.push(this.formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  private toApiWriteBody(schedule: ShiftScheduleDTO, id?: number): UpsertWorkScheduleRequest {
    return {
      id,
      employeeId: Number(schedule.employeeId) || 0,
      departmentId: schedule.departmentId ?? 0,
      shiftId: Number(schedule.shiftId) || 0,
      startDate: schedule.date,
      endDate: schedule.date,
      status: (schedule.status || 'scheduled').toUpperCase(),
      projectId: schedule.projectId ?? 0,
      location: schedule.location ?? '',
      recurrence: (schedule.recurrence || 'none').toUpperCase(),
      description: schedule.description ?? ''
    };
  }

  private toUiStatus(status: string): ShiftScheduleDTO['status'] {
    const lower = (status || '').toLowerCase();
    return lower === 'completed' || lower === 'cancelled' ? lower : 'scheduled';
  }

  private toUiRecurrence(recurrence: string): ShiftScheduleDTO['recurrence'] {
    const lower = (recurrence || '').toLowerCase();
    return lower === 'daily' || lower === 'weekly' || lower === 'custom' ? lower : 'none';
  }

  /** A row is a single persisted API record only when its id is a bare number (not a composite `id:date`). */
  private serverId(schedule: ShiftScheduleDTO): number | null {
    return /^\d+$/.test(schedule.id) ? Number(schedule.id) : null;
  }

  /** Fire-and-forget POST /workSchedules — the UI already updated optimistically via local cache. */
  private syncCreate(schedule: ShiftScheduleDTO): void {
    this.http.post<WorkScheduleApiDTO>(this.BASE, this.toApiWriteBody(schedule)).subscribe({
      error: err => console.error('Failed to persist work schedule assignment:', err)
    });
  }

  /** Fire-and-forget PUT /workSchedules/{id} — no-op for rows not yet backed by a single server id. */
  private syncUpdate(schedule: ShiftScheduleDTO): void {
    const id = this.serverId(schedule);
    if (id === null) return;

    this.http.put<WorkScheduleApiDTO>(`${this.BASE}/${id}`, this.toApiWriteBody(schedule, id)).subscribe({
      error: err => console.error('Failed to persist work schedule update:', err)
    });
  }

  /** Fire-and-forget DELETE /workSchedules/{id} — no-op for rows not yet backed by a single server id. */
  private syncDelete(schedule: ShiftScheduleDTO | undefined): void {
    const id = schedule ? this.serverId(schedule) : null;
    if (id === null) return;

    this.http.delete<void>(`${this.BASE}/${id}`).subscribe({
      error: err => console.error('Failed to persist work schedule deletion:', err)
    });
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
  getSchedules(): Observable<ShiftScheduleDTO[]> {
    return this.schedules$;
  }


  /* GET SCHEDULES BY DATE */
  getSchedulesByDate(date: string): ShiftScheduleDTO[] {

    return this.schedulesSubject.value.filter(
      s => s.date === date
    );

  }


  /* GET EMPLOYEE SCHEDULES */
  getSchedulesByEmployee(employeeId: string): ShiftScheduleDTO[] {

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
  assignShift(schedule: ShiftScheduleDTO)
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

    this.syncCreate(schedule);

    return { success: true };

  }

  deleteSchedule(id: string): void {
    const removed = this.schedulesSubject.value.find(s => s.id === id);
    const updated =
      this.schedulesSubject.value.filter(
        s => s.id !== id
      );
    this.schedulesSubject.next(updated);
    this.syncDelete(removed);
  }

  updateSchedule(schedule: ShiftScheduleDTO): void {
    const updated =
      this.schedulesSubject.value.map(s =>
        s.id === schedule.id
          ? schedule
          : s
      );
    this.schedulesSubject.next(updated);
    this.syncUpdate(schedule);
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
    changes: Partial<ShiftScheduleDTO>
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
    changes: Partial<ShiftScheduleDTO>
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
    changes: Partial<ShiftScheduleDTO>
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

    const removed = this.schedulesSubject.value.find(s => s.id === scheduleId);
    const filtered = this.schedulesSubject.value.filter(
      s => s.id !== scheduleId
    );

    this.schedulesSubject.next(filtered);
    this.syncDelete(removed);

  }

  /* CONFLICT DETECTION */
  detectConflict(schedule: ShiftScheduleDTO, ignoreScheduleId?: string): ConflictDTO | null {
    const schedules = this.schedulesSubject.value;
    const employeeSchedules = schedules.filter(
      s =>
        s.employeeId === schedule.employeeId &&
        s.date === schedule.date &&
        s.id !== ignoreScheduleId
    );

    const newShift = this.shiftserviceService.getShiftById(schedule.shiftId);
    if (!newShift) return null;

    // 1) Duplicate assignment (same shift id on same date)
    const duplicate = employeeSchedules.find(s => s.shiftId === schedule.shiftId);
    if (duplicate) {
      return {
        employeeId: schedule.employeeId,
        shiftId: schedule.shiftId,
        date: schedule.date,
        conflictType: 'DUPLICATE_ASSIGNMENT',
        message: `Employee already assigned to ${newShift.name}`
      };
    }

    // 2) Max hours per day (standard work practice)
    //    Current “standard” is 12 hours/day (same as earlier logic).
    const maxHoursPerDay = 12;

    const totalHoursToday = employeeSchedules.reduce((total, existingSchedule) => {
      const shift = this.shiftserviceService.getShiftById(existingSchedule.shiftId);
      if (!shift) return total;
      return total + this.calculateHoursForShiftOnDate(existingSchedule.date, shift.startTime, shift.endTime);
    }, 0);

    const newShiftHours = this.calculateHoursForShiftOnDate(schedule.date, newShift.startTime, newShift.endTime);

    if (totalHoursToday + newShiftHours > maxHoursPerDay) {
      return {
        employeeId: schedule.employeeId,
        shiftId: schedule.shiftId,
        date: schedule.date,
        conflictType: 'EXCEEDS_MAX_HOURS',
        message: `Maximum allowed is ${maxHoursPerDay} hours/day (would be ${(totalHoursToday + newShiftHours).toFixed(2)} hours)`
      };
    }

    // 3) Overlapping shifts (supports overnight shifts)
    const newRange = this.shiftToDateTimeRange(schedule.date, newShift.startTime, newShift.endTime);
    for (const existing of employeeSchedules) {
      const existingShift = this.shiftserviceService.getShiftById(existing.shiftId);
      if (!existingShift) continue;

      const existingRange = this.shiftToDateTimeRange(existing.date, existingShift.startTime, existingShift.endTime);
      const overlap = this.rangesOverlap(newRange, existingRange);
      if (overlap) {
        return {
          employeeId: schedule.employeeId,
          shiftId: schedule.shiftId,
          date: schedule.date,
          conflictType: 'OVERLAPPING_SHIFT',
          message: `Overlaps with ${existingShift.name} (${existingShift.startTime}-${existingShift.endTime})`
        };
      }
    }

    return null;
  }

  private shiftToDateTimeRange(dateIso: string, startTime: string, endTime: string): { start: Date; end: Date } {
    const start = this.combineDateAndTime(dateIso, startTime);
    const end = this.combineDateAndTime(dateIso, endTime);

    // If shift crosses midnight, roll end to next day.
    if (end.getTime() <= start.getTime()) {
      end.setDate(end.getDate() + 1);
    }

    return { start, end };
  }

  private combineDateAndTime(dateIso: string, hhmm: string): Date {
    const [hours, minutes] = hhmm.split(':').map(Number);
    const d = new Date(dateIso);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  private rangesOverlap(a: { start: Date; end: Date }, b: { start: Date; end: Date }): boolean {
    return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
  }

  private calculateHoursForShiftOnDate(dateIso: string, startTime: string, endTime: string): number {
    const range = this.shiftToDateTimeRange(dateIso, startTime, endTime);
    const ms = range.end.getTime() - range.start.getTime();
    return ms > 0 ? ms / 3600000 : 0;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private calculateHours(
    start: string,
    end: string
  ): number {
    // legacy helper (kept for other methods). Uses 24h wrap logic.
    const startMin = this.toMinutes(start);
    const endMin = this.toMinutes(end);
    let diff = endMin - startMin;
    if (diff < 0) diff += 24 * 60;
    return diff / 60;
  }


  checkConflict(schedule: ShiftScheduleDTO, ignoreScheduleId?: string) {
    const previousSchedules = this.schedulesSubject.value.filter(
      s =>
        s.employeeId === schedule.employeeId &&
        new Date(s.date).getTime() < new Date(schedule.date).getTime() &&
        s.id !== ignoreScheduleId
    );

    const latestSchedule = previousSchedules.sort(
      (a, b) =>
        new Date(b.date).getTime() -
        new Date(a.date).getTime()
    )[0];

    if (latestSchedule) {
      const previousShift = this.shiftserviceService.getShiftById(
        latestSchedule.shiftId
      );

      const currentShift = this.shiftserviceService.getShiftById(
        schedule.shiftId
      );

      if (previousShift && currentShift) {
        const restHours = this.getHoursBetween(
          previousShift.endTime,
          currentShift.startTime
        );

        if (restHours < 8) {
          return {
            conflictType: 'INSUFFICIENT_REST',
            scheduleId: schedule.id,
            message: `Only ${restHours} hours between shifts`
          };
        }
      }
    }

    return this.detectConflict(schedule, ignoreScheduleId);
  }

}

