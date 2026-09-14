import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { UserSessionService } from '../../../service/attendance/user-session.service';
import { ShiftScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
import { WorkShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';

type MyScheduleViewMode = 'calendar' | 'table' | 'list';

/** Flat row for the shared <app-table>, so it can sort by field name. */
interface MyShiftTableRow {
  shiftName: string;
  time: string;
  project: string;
  location: string;
  status: string;
  color: string;
  /** Kept so the row's info button can open the full record. */
  schedule: ShiftScheduleDTO;
}

type ScheduledShift = ShiftScheduleDTO & { shift: WorkShiftDTO | undefined };

/** Fallback when a shift carries no colour of its own. Mirrors $accent. */
const DEFAULT_SHIFT_COLOR = '#2E6276';

@Component({
  selector: 'app-my-schedule',
  templateUrl: './my-schedule.component.html',
  styleUrl: './my-schedule.component.scss'
})
export class MyScheduleComponent implements OnInit, OnDestroy {

  @ViewChild(FullCalendarComponent) private calendarRef?: FullCalendarComponent;

  currentEmployeeId = '';
  schedules: ShiftScheduleDTO[] = [];
  selectedDate: string = this.formatDateLocal(new Date());

  viewMode: MyScheduleViewMode = 'calendar';
  batchSelected = new Set<string>();

  calendarOptions!: CalendarOptions;

  // Day table
  readonly tableColumns: TableColumn<MyShiftTableRow>[] = [
    { header: 'Shift', field: 'shiftName', sortable: true },
    { header: 'Time', field: 'time' },
    { header: 'Project', field: 'project', sortable: true },
    { header: 'Location', field: 'location' },
    { header: 'Status', field: 'status' },
    { header: '', align: 'right' }
  ];
  tableRows: MyShiftTableRow[] = [];

  /** The shift whose full record is open in the details modal. */
  detailShift: ScheduledShift | null = null;

  private scheduleSub?: Subscription;
  private scheduledDates = new Set<string>();

  constructor(
    private scheduleService: ScheduleserviceService,
    public shiftService: ShiftserviceService,
    private host: ElementRef<HTMLElement>,
    private userSession: UserSessionService
  ) {}

  ngOnInit(): void {
    const currentUser = this.userSession.getCurrentUser();
    this.currentEmployeeId = currentUser ? String(currentUser.id) : '';
    this.initializeCalendarOptions();

    this.scheduleSub = this.scheduleService.schedules$.subscribe(data => {
      this.schedules = data
        .filter(s => this.sameEmployee(s.employeeId, this.currentEmployeeId))
        .sort((a, b) => a.date.localeCompare(b.date));

      this.scheduledDates = new Set(this.schedules.map(s => s.date));
      this.renderCalendarEvents();
      this.rebuildTableRows();
    });
  }

  ngOnDestroy(): void {
    this.scheduleSub?.unsubscribe();
  }

  private sameEmployee(scheduleEmployeeId: string, employeeId: string): boolean {
    if (!employeeId) return false;
    return scheduleEmployeeId === employeeId
      || scheduleEmployeeId.replace(/\D/g, '') === employeeId.replace(/\D/g, '');
  }

  // ============================================================
  // Calendar
  // ============================================================

  private initializeCalendarOptions(): void {
    this.calendarOptions = {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
      },
      buttonText: { today: 'Today', month: 'Month', week: 'Week' },
      titleFormat: { year: 'numeric', month: 'long' },
      fixedWeekCount: false,
      showNonCurrentDates: true,
      dayMaxEventRows: 3,
      height: 'auto',
      events: [],
      eventDisplay: 'block',
      displayEventTime: true,
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', meridiem: 'short' },
      dateClick: arg => this.onDateClick(arg),
      eventClick: arg => this.onEventClick(arg),
      eventDidMount: arg => {
        arg.el.style.setProperty('--shift-colour', arg.event.extendedProps['color'] || DEFAULT_SHIFT_COLOR);
        // The chip ellipses at cell width, so keep the full label on hover.
        arg.el.setAttribute('title', arg.event.title);
      },
      dayCellClassNames: arg => {
        const date = this.formatDateLocal(arg.date);
        const classes: string[] = [];

        if (this.scheduledDates.has(date)) classes.push('day--scheduled');
        if (this.hasConflict(date)) classes.push('day--conflict');

        return classes;
      }
    };
  }

  /**
   * See the note in ShiftCalendarComponent: mutating calendarOptions.events
   * keeps the *ngIf recreation path correct, and the API call is what actually
   * refreshes a calendar that is already on screen.
   */
  private renderCalendarEvents(): void {
    const events = this.buildCalendarEvents();
    this.calendarOptions.events = events;

    const api = this.calendarRef?.getApi();
    if (!api) return;

    api.removeAllEvents();
    events.forEach(event => api.addEvent(event));
    this.applyDayCellStates();
  }

  private buildCalendarEvents(): EventInput[] {
    return this.schedules.map(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);

      return {
        id: schedule.id,
        title: shift?.name || 'Shift',
        date: schedule.date,
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: 'inherit',
        classNames: this.batchSelected.has(schedule.id) ? ['is-selected'] : [],
        extendedProps: {
          scheduleId: schedule.id,
          color: shift?.color || DEFAULT_SHIFT_COLOR,
          schedule,
          shift
        }
      };
    });
  }

  onDateClick(arg: any): void {
    this.selectedDate = this.formatDateLocal(arg.date);
    this.applyDayCellStates();
    this.rebuildTableRows();
  }

  onEventClick(arg: any): void {
    this.toggleBatchSelect(arg.event.extendedProps['scheduleId']);
    this.renderCalendarEvents();
  }

  /**
   * Day-cell state is applied imperatively because FullCalendar recomputes
   * dayCellClassNames only on a grid re-render — not on a date click, and not
   * when events are pushed through the API.
   */
  private applyDayCellStates(): void {
    const cells = this.host.nativeElement.querySelectorAll<HTMLElement>('.fc-daygrid-day[data-date]');

    cells.forEach(cell => {
      const date = cell.getAttribute('data-date') ?? '';
      cell.classList.toggle('day--picked', date === this.selectedDate);
      cell.classList.toggle('day--scheduled', this.scheduledDates.has(date));
      cell.classList.toggle('day--conflict', this.scheduledDates.has(date) && this.hasConflict(date));
    });
  }

  /** Colour key for the calendar — one entry per shift type on screen. */
  get shiftLegend(): { name: string; color: string }[] {
    const byName = new Map<string, string>();

    for (const schedule of this.schedules) {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      if (shift && !byName.has(shift.name)) {
        byName.set(shift.name, shift.color || DEFAULT_SHIFT_COLOR);
      }
    }

    return Array.from(byName, ([name, color]) => ({ name, color }));
  }

  // ============================================================
  // Selection
  // ============================================================

  setView(mode: MyScheduleViewMode): void {
    this.viewMode = mode;
  }

  toggleBatchSelect(scheduleId: string): void {
    if (this.batchSelected.has(scheduleId)) {
      this.batchSelected.delete(scheduleId);
    } else {
      this.batchSelected.add(scheduleId);
    }
  }

  isBatchSelected(scheduleId: string): boolean {
    return this.batchSelected.has(scheduleId);
  }

  clearBatchSelection(): void {
    this.batchSelected.clear();
    this.renderCalendarEvents();
  }

  // ============================================================
  // Selected day
  // ============================================================

  onDateChange(event: Event): void {
    this.selectedDate = (event.target as HTMLInputElement).value;
    this.rebuildTableRows();
  }

  /**
   * Held in a field rather than a getter — <app-table>'s [rows] is an @Input,
   * and a new array each change-detection pass would make PrimeNG re-run its
   * own change handling every cycle.
   */
  private rebuildTableRows(): void {
    this.tableRows = this.shiftsForSelectedDate.map(item => ({
      shiftName: item.shift?.name ?? '—',
      time: item.shift ? `${item.shift.startTime}–${item.shift.endTime}` : '—',
      project: item.project || '—',
      location: item.location || '—',
      status: 'Scheduled',
      color: item.shift?.color || DEFAULT_SHIFT_COLOR,
      schedule: item
    }));
  }

  // ============================================================
  // Details
  // ============================================================

  openDetails(schedule: ShiftScheduleDTO): void {
    this.detailShift = { ...schedule, shift: this.shiftFor(schedule) };
  }

  closeDetails(): void {
    this.detailShift = null;
  }

  /** Long-form date for a schedule, e.g. "Tuesday, August 25, 2026". */
  dateLabel(date: string): string {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  shiftDuration(shift: WorkShiftDTO | undefined): string {
    if (!shift) return '—';

    let span = this.toMinutes(shift.endTime) - this.toMinutes(shift.startTime);
    if (span <= 0) span += 24 * 60; // overnight shift

    const hours = Math.floor(span / 60);
    const minutes = span % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  /** Spells out the repeat rule, including the custom-days detail. */
  recurrenceLabel(schedule: ShiftScheduleDTO): string {
    const recurrence = schedule.recurrence;
    if (!recurrence || recurrence === 'none') return 'Does not repeat';

    if (recurrence === 'custom') {
      const days = schedule.customDays?.length ? schedule.customDays.join(', ') : 'selected days';
      return `Custom · ${days}`;
    }

    const count = schedule.repeatCount;
    const label = recurrence === 'daily' ? 'Daily' : 'Weekly';
    return count && count > 1 ? `${label} · ${count} occurrences` : label;
  }

  get selectedDateLabel(): string {
    return new Date(this.selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  get shiftsForSelectedDate(): (ShiftScheduleDTO & { shift: WorkShiftDTO | undefined })[] {
    return this.schedules
      .filter(s => s.date === this.selectedDate)
      .map(s => ({ ...s, shift: this.shiftService.getShiftById(s.shiftId) }));
  }

  shiftFor(schedule: ShiftScheduleDTO): WorkShiftDTO | undefined {
    return this.shiftService.getShiftById(schedule.shiftId);
  }

  shiftColor(schedule: ShiftScheduleDTO): string {
    return this.shiftFor(schedule)?.color || DEFAULT_SHIFT_COLOR;
  }

  // ============================================================
  // Conflict detection — overlapping shifts on the same day
  // ============================================================

  hasConflict(date: string): boolean {
    return this.overlappingPairsOn(date).length > 0;
  }

  get conflictingShiftPairs(): { a: WorkShiftDTO; b: WorkShiftDTO }[] {
    return this.overlappingPairsOn(this.selectedDate);
  }

  private overlappingPairsOn(date: string): { a: WorkShiftDTO; b: WorkShiftDTO }[] {
    const shifts = this.schedules
      .filter(s => s.date === date)
      .map(s => this.shiftService.getShiftById(s.shiftId))
      .filter((shift): shift is WorkShiftDTO => !!shift);

    const pairs: { a: WorkShiftDTO; b: WorkShiftDTO }[] = [];

    for (let i = 0; i < shifts.length; i++) {
      for (let j = i + 1; j < shifts.length; j++) {
        if (this.isOverlapping(shifts[i], shifts[j])) {
          pairs.push({ a: shifts[i], b: shifts[j] });
        }
      }
    }

    return pairs;
  }

  private toMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isOverlapping(a: WorkShiftDTO, b: WorkShiftDTO): boolean {
    return this.toMinutes(a.startTime) < this.toMinutes(b.endTime)
        && this.toMinutes(a.endTime) > this.toMinutes(b.startTime);
  }

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
