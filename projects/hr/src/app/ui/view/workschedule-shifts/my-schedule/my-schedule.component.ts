import { Component, OnInit } from '@angular/core';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';

@Component({
  selector: 'app-my-schedule',
  templateUrl: './my-schedule.component.html',
  styleUrl: './my-schedule.component.scss'
})
export class MyScheduleComponent implements OnInit{
  currentEmployeeId = 'emp-1'; // later filter from auth service
  schedules: ScheduleDTO[] = [];
  currentDate = new Date();
  selectedDate: string = this.formatDateLocal(new Date());

  viewMode: 'calendar' | 'table' = 'calendar';

  calendarDays: { date: Date; inMonth: boolean }[] = [];

  constructor(
    private scheduleService: ScheduleserviceService,
    private shiftService: ShiftserviceService
  ) {}

  ngOnInit(): void {
    this.buildCalendar();

    //for real data
    /*this.scheduleService.schedules$.subscribe(data => {
      this.schedules = data.filter(
        s => s.employeeId === this.currentEmployeeId
      );
    }); */
    this.scheduleService.schedules$
        .subscribe(data => {

          this.schedules =
            data.filter(
              s =>
                s.employeeId ===
                this.currentEmployeeId
            );

        });
  }

  onDateChange(event: Event) {
  const target = event.target as HTMLInputElement;
  this.selectedDate = target.value;
}

  setView(mode: 'calendar' | 'table') {
    this.viewMode = mode;
  }

  formatDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  buildCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    this.calendarDays = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -firstDay.getDay() + i + 1);
      this.calendarDays.push({ date: d, inMonth: false });
    }

    for (let d = 1; d <= lastDay.getDate(); d++) {
      this.calendarDays.push({ date: new Date(year, month, d), inMonth: true });
    }

    const remaining = 42 - this.calendarDays.length;
    for (let i = 1; i <= remaining; i++) {
      this.calendarDays.push({ date: new Date(year, month + 1, i), inMonth: false });
    }
  }

  prevMonth() {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() - 1,
      1
    );
    this.buildCalendar();
  }

  nextMonth() {
    this.currentDate = new Date(
      this.currentDate.getFullYear(),
      this.currentDate.getMonth() + 1,
      1
    );
    this.buildCalendar();
  }

  selectDate(day: any) {
    this.selectedDate = this.formatDateLocal(day.date);
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  get selectedDateLabel(): string {
    return new Date(this.selectedDate + 'T00:00:00')
      .toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
  }

  get shiftsForSelectedDate() {
    return this.schedules.map(s => {
      const shift = this.shiftService.getShiftById(s.shiftId);
      return {
        ...s,
        shift
      };
    }).filter(s => s.date === this.selectedDate);
  }

  get conflictingShiftPairs(): { a: ShiftDTO; b: ShiftDTO }[] {
    const pairs: { a: ShiftDTO; b: ShiftDTO }[] = [];
    const daySchedules = this.schedules.filter(s => s.date === this.selectedDate);

    for (let i = 0; i < daySchedules.length; i++) {
      for (let j = i + 1; j < daySchedules.length; j++) {
        const a = this.shiftService.getShiftById(daySchedules[i].shiftId);
        const b = this.shiftService.getShiftById(daySchedules[j].shiftId);
        if (!a || !b) continue;
        if (this.isOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
          pairs.push({ a, b });
        }
      }
    }
    return pairs;
  }

  hasSchedule(date: Date): boolean {
    const d = this.formatDateLocal(date);
    return this.schedules.some(s => s.date === d);
  }

  //  Conflict detection
  hasConflict(date: string): boolean {
    const daySchedules = this.schedules.filter(s => s.date === date);

    for (let i = 0; i < daySchedules.length; i++) {
      for (let j = i + 1; j < daySchedules.length; j++) {

        const a = this.shiftService.getShiftById(daySchedules[i].shiftId);
        const b = this.shiftService.getShiftById(daySchedules[j].shiftId);

        if (!a || !b) continue;

        if (this.isOverlapping(a.startTime, a.endTime, b.startTime, b.endTime)) {
          return true;
        }
      }
    }

    return false;
  }

getDayShiftColors(date: Date): string[] {

  const day = this.formatDateLocal(date);

  const uniqueSchedules = Array.from(
    new Map(
      this.schedules
        .filter(s => s.date === day)
        .map(s => [s.assignmentGroupId, s])
    ).values()
  );

  return uniqueSchedules
    .slice(0, 10)
    .map(schedule => {

      const shift = this.shiftService.getShiftById(
        schedule.shiftId
      );

      return shift?.color || '#9ca3af';
    });
}

  private isOverlapping(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
    const toMin = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };

    return toMin(aStart) < toMin(bEnd) && toMin(aEnd) > toMin(bStart);
  }

}
