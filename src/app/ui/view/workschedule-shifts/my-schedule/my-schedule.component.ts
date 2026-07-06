import { Component, OnInit } from '@angular/core';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

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
  batchSelected: Set<string> = new Set();

  // FullCalendar
  calendarOptions!: CalendarOptions;

  // Drag-to-select
  dragStartDate: string | null = null;
  dragEndDate: string | null = null;
  isDragging = false;
  selectedDates: Set<string> = new Set();

  constructor(
    private scheduleService: ScheduleserviceService,
    public shiftService: ShiftserviceService
  ) {}

  ngOnInit(): void {
    this.initializeCalendarOptions();

    this.scheduleService.schedules$
        .subscribe(data => {

          this.schedules =
            data.filter(
              s =>
                s.employeeId ===
                this.currentEmployeeId
            );

          this.updateCalendarEvents();
        });
  }

  initializeCalendarOptions(): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
      },
      height: 'auto',
      events: [],
      dateClick: (arg: any) => this.onDateClick(arg),
      eventClick: (arg: any) => this.onEventClick(arg),
      eventDisplay: 'block',
      displayEventTime: true,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: 'short'
      }
    };
  }

  updateCalendarEvents(): void {
    const events = this.schedules.map(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);

      return {
        id: schedule.id,
        title: shift?.name || 'Shift',
        date: schedule.date,
        backgroundColor: shift?.color || '#3b82f6',
        borderColor: this.batchSelected.has(schedule.id) ? '#fbbf24' : (shift?.color || '#3b82f6'),
        extendedProps: {
          scheduleId: schedule.id,
          shiftId: schedule.shiftId,
          schedule: schedule,
          shift: shift
        }
      };
    });

    if (this.calendarOptions.events) {
      this.calendarOptions.events = events;
    }
  }

  onDateClick(arg: any): void {
    this.selectedDate = this.formatDateLocal(arg.date);
    this.selectedDates.clear();
    this.selectedDates.add(this.selectedDate);
  }

  onEventClick(arg: any): void {
    const scheduleId = arg.event.extendedProps['scheduleId'];
    this.toggleBatchSelect(scheduleId);
    this.updateCalendarEvents();
  }

  // Drag-to-select logic
  startDateDrag(dateStr: string): void {
    this.isDragging = true;
    this.dragStartDate = dateStr;
    this.dragEndDate = dateStr;
    this.selectDateRange(new Date(dateStr + 'T00:00:00'), new Date(dateStr + 'T00:00:00'));
  }

  continueDateDrag(dateStr: string): void {
    if (!this.isDragging || !this.dragStartDate) return;
    this.dragEndDate = dateStr;
    const start = new Date(this.dragStartDate + 'T00:00:00');
    const end = new Date(this.dragEndDate + 'T00:00:00');
    this.selectDateRange(
      start > end ? end : start,
      start > end ? start : end
    );
  }

  endDateDrag(): void {
    if (this.isDragging && this.selectedDates.size > 0) {
      // Selection persists, user can see what they selected
      this.isDragging = false;
    } else {
      this.isDragging = false;
    }
  }

  selectDateRange(start: Date, end: Date): void {
    this.selectedDates.clear();
    const current = new Date(start);
    while (current <= end) {
      this.selectedDates.add(this.formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }
  }

  isDateInSelection(dateStr: string): boolean {
    return this.selectedDates.has(dateStr);
  }

  onDateChange(event: Event) {
  const target = event.target as HTMLInputElement;
  this.selectedDate = target.value;
}

  setView(mode: 'calendar' | 'table') {
    this.viewMode = mode;
  }

  toggleBatchSelect(scheduleId: string) {
    if (this.batchSelected.has(scheduleId)) {
      this.batchSelected.delete(scheduleId);
    } else {
      this.batchSelected.add(scheduleId);
    }
  }

  isBatchSelected(scheduleId: string): boolean {
    return this.batchSelected.has(scheduleId);
  }

  clearBatchSelection() {
    this.batchSelected.clear();
  }

  formatDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
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
