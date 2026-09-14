import { Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Subscription } from 'rxjs';
import { CalendarOptions, EventInput } from '@fullcalendar/core';
import { FullCalendarComponent } from '@fullcalendar/angular';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ShiftScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
import { WorkShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';

interface DayShiftGroup {
  shift: WorkShiftDTO;
  schedule: ShiftScheduleDTO;
  employees: { id: string; name: string }[];
}

interface GanttBar {
  schedule: ShiftScheduleDTO;
  shift: WorkShiftDTO | undefined;
  left: number;
  width: number;
  color: string;
  isSelected: boolean;
}

interface GanttRow {
  employeeId: string;
  employeeName: string;
  bars: GanttBar[];
}

interface ScheduleConflict {
  employeeName: string | undefined;
  message: string;
}

/**
 * Flat row for the shared <app-table>. Projecting the joins up front lets the
 * table sort on any column by field name without reaching back into the
 * services.
 */
interface ShiftTableRow {
  employee: string;
  shiftName: string;
  time: string;
  project: string;
  status: string;
  color: string;
}

type ShiftViewMode = 'calendar' | 'table' | 'gantt';

/** Fallback when a shift carries no colour of its own. Mirrors $accent. */
const DEFAULT_SHIFT_COLOR = '#2E6276';

@Component({
  selector: 'app-shift-calendar',
  templateUrl: './shift-calendar.component.html',
  styleUrl: './shift-calendar.component.scss'
})
export class ShiftCalendarComponent implements OnInit, OnDestroy {

  @ViewChild(FullCalendarComponent) private calendarRef?: FullCalendarComponent;

  showAssignment = false;
  schedules: ShiftScheduleDTO[] = [];
  selectedDate: string = this.formatDateLocal(new Date());
  isAdmin = false;

  viewMode: ShiftViewMode = 'calendar';
  batchSelected = new Set<string>();

  // Filters
  selectedShiftType: string | null = null;
  selectedEmployee: string | null = null;
  searchQuery = '';
  shiftTypes: string[] = [];

  // FullCalendar
  calendarOptions!: CalendarOptions;

  // Table view
  readonly tableColumns: TableColumn<ShiftTableRow>[] = [
    { header: 'Employee', field: 'employee', sortable: true },
    { header: 'Shift', field: 'shiftName', sortable: true },
    { header: 'Time', field: 'time' },
    { header: 'Project', field: 'project', sortable: true },
    { header: 'Status', field: 'status' }
  ];
  tableRows: ShiftTableRow[] = [];

  // Timeline (gantt) view
  ganttRows: GanttRow[] = [];
  ganttStartDate = new Date();
  ganttEndDate = new Date();
  pixelsPerDay = 60;
  ganttTimelineWidth = 1200;

  // Drag-to-select
  isDragging = false;
  dragRangeStart: string | null = null;
  dragRangeEnd: string | null = null;
  private dragAnchor: string | null = null;
  private lastDragHover: string | null = null;
  private selectedDatesRange = new Set<string>();

  showDateWarning = false;
  editingSchedule: ShiftScheduleDTO | null = null;

  /**
   * The shift catalogue opens in a side drawer rather than taking a view slot
   * of its own — it is reference data you dip into, not a place you work, so it
   * should cost no permanent layout space.
   */
  showShiftList = false;

  employees = [
    { id: 'emp-1', name: 'Afolabi Daniels' },
    { id: 'emp-2', name: 'David Okpabio' },
    { id: 'emp-3', name: 'Ngozi Ezer' }
  ];

  private scheduleSub?: Subscription;
  /** Dates that carry at least one schedule — drives the day-cell marker. */
  private scheduledDates = new Set<string>();
  private conflictCache: { source: ShiftScheduleDTO[]; date: string; value: ScheduleConflict[] } | null = null;

  constructor(
    private scheduleService: ScheduleserviceService,
    public shiftService: ShiftserviceService,
    private host: ElementRef<HTMLElement>
  ) {}

  ngOnInit(): void {
    this.isAdmin = sessionStorage.getItem('role') === 'ADMIN';

    this.initializeCalendarOptions();
    this.setGanttDateRange();

    this.scheduleSub = this.scheduleService.schedules$.subscribe(data => {
      this.schedules = data;
      this.scheduledDates = new Set(data.map(s => s.date));
      this.extractShiftTypes();
      this.refreshViews();
    });
  }

  ngOnDestroy(): void {
    this.scheduleSub?.unsubscribe();
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
      eventClick: arg => this.onEventClick(arg),
      // The event chip is drawn entirely in SCSS off --shift-colour. Setting it
      // here rather than binding in the template keeps it a real DOM property
      // call, which Angular's [style.--x] binding does not reliably produce.
      eventDidMount: arg => {
        arg.el.style.setProperty('--shift-colour', arg.event.extendedProps['color'] || DEFAULT_SHIFT_COLOR);
        // The chip ellipses at cell width, so keep the full label on hover.
        arg.el.setAttribute('title', arg.event.title);
      },
      // Static per-day state. Live drag feedback is applied imperatively in
      // applyDayCellStates() because FullCalendar does not re-render on
      // mousemove.
      dayCellClassNames: arg => {
        const date = this.formatDateLocal(arg.date);
        return this.scheduledDates.has(date) ? ['day--scheduled'] : [];
      }
    };
  }

  /**
   * Rebuilds the event list and pushes it into the live calendar.
   *
   * `calendarOptions.events` is also kept current: the <full-calendar> element
   * sits inside an *ngIf, so it is destroyed and recreated whenever the user
   * leaves and re-enters the calendar view, and reads the options fresh on
   * construction. Mutating the options alone is not enough while the calendar
   * is already alive — [options] is an @Input, so a nested mutation raises no
   * ngOnChanges and nothing re-renders. Hence the API call as well.
   */
  private renderCalendarEvents(): void {
    const events = this.buildCalendarEvents();
    this.calendarOptions.events = events;

    const api = this.calendarRef?.getApi();
    if (!api) return;

    api.removeAllEvents();
    events.forEach(event => api.addEvent(event));
  }

  private buildCalendarEvents(): EventInput[] {
    return this.getFilteredSchedules().map(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      const employee = this.employees.find(e => e.id === schedule.employeeId);
      const color = shift?.color || DEFAULT_SHIFT_COLOR;

      return {
        id: schedule.id,
        title: `${shift?.name || 'Shift'} · ${employee?.name || 'Unassigned'}`,
        date: schedule.date,
        // The chip is drawn in SCSS off --shift-colour so the palette stays in
        // the stylesheet; FullCalendar's own fills are switched off.
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        textColor: 'inherit',
        classNames: this.batchSelected.has(schedule.id) ? ['is-selected'] : [],
        extendedProps: {
          scheduleId: schedule.id,
          color,
          schedule,
          shift,
          employee
        }
      };
    });
  }

  onEventClick(arg: any): void {
    this.toggleBatchSelect(arg.event.extendedProps['scheduleId']);
    this.renderCalendarEvents();
  }

  /** Colour key for the calendar — one entry per shift type actually on screen. */
  get shiftLegend(): { name: string; color: string }[] {
    const byName = new Map<string, string>();

    for (const schedule of this.getFilteredSchedules()) {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      if (shift && !byName.has(shift.name)) {
        byName.set(shift.name, shift.color || DEFAULT_SHIFT_COLOR);
      }
    }

    return Array.from(byName, ([name, color]) => ({ name, color }));
  }

  // ============================================================
  // Drag-to-select
  // ============================================================

  /**
   * One delegated listener on the calendar surface, rather than a listener per
   * day cell — day cells are recreated on every month change.
   */
  onSurfaceMouseDown(event: MouseEvent): void {
    if (!this.isAdmin) return;

    const target = event.target as HTMLElement;
    if (target.closest('.fc-event')) return;

    // Scoped to day cells — in week view the column headers also carry
    // data-date, and pressing one should not start a selection.
    const date = target.closest('.fc-daygrid-day[data-date]')?.getAttribute('data-date');
    if (date) this.startDateDrag(date);
  }

  // document: listeners registered through @HostListener are torn down with the
  // component, so navigating away from the tab cannot leak them.
  @HostListener('document:mousemove', ['$event'])
  onDocumentMouseMove(event: MouseEvent): void {
    if (!this.isDragging) return;

    const element = document.elementFromPoint(event.clientX, event.clientY);
    const date = element?.closest('[data-date]')?.getAttribute('data-date');
    if (date) this.continueDateDrag(date);
  }

  @HostListener('document:mouseup')
  onDocumentMouseUp(): void {
    this.endDateDrag();
  }

  private startDateDrag(date: string): void {
    this.isDragging = true;
    this.dragAnchor = date;
    this.lastDragHover = date;
    this.dragRangeStart = date;
    this.dragRangeEnd = date;
    this.selectedDatesRange = new Set([date]);
    this.applyDayCellStates();
  }

  private continueDateDrag(date: string): void {
    if (!this.isDragging || !this.dragAnchor) return;
    // mousemove fires far more often than the pointer changes cell.
    if (date === this.lastDragHover) return;
    this.lastDragHover = date;

    const [start, end] = this.dragAnchor <= date
      ? [this.dragAnchor, date]
      : [date, this.dragAnchor];

    this.dragRangeStart = start;
    this.dragRangeEnd = end;
    this.selectDateRange(start, end);
    this.applyDayCellStates();
  }

  private endDateDrag(): void {
    if (!this.isDragging) return;

    this.isDragging = false;
    this.applyDayCellStates();

    if (this.selectedDatesRange.size === 0) return;

    this.selectedDate = this.dragRangeEnd ?? this.selectedDate;
    this.openAssignment();
  }

  private selectDateRange(startDate: string, endDate: string): void {
    const range = new Set<string>();
    const cursor = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');

    while (cursor <= end) {
      range.add(this.formatDateLocal(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }

    this.selectedDatesRange = range;
  }

  private isDateInDragRange(date: string): boolean {
    return this.isDragging && this.selectedDatesRange.has(date);
  }

  /**
   * Toggles classes on the day cells so all colour lives in SCSS. Scoped to
   * this component's own element — a document-wide query would also restyle any
   * other calendar on the page.
   */
  private applyDayCellStates(): void {
    const cells = this.host.nativeElement.querySelectorAll<HTMLElement>('.fc-daygrid-day[data-date]');

    cells.forEach(cell => {
      const date = cell.getAttribute('data-date') ?? '';
      cell.classList.toggle('day--in-range', this.isDateInDragRange(date));
      cell.classList.toggle('day--scheduled', this.scheduledDates.has(date));
    });
  }

  private clearDragSelection(): void {
    this.selectedDatesRange.clear();
    this.dragAnchor = null;
    this.lastDragHover = null;
    this.dragRangeStart = null;
    this.dragRangeEnd = null;
    this.applyDayCellStates();
  }

  // ============================================================
  // Filters
  // ============================================================

  private extractShiftTypes(): void {
    const types = new Set<string>();

    this.schedules.forEach(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      if (shift) types.add(shift.name);
    });

    this.shiftTypes = Array.from(types).sort();
  }

  applyFilters(): void {
    this.refreshViews();
  }

  clearFilters(): void {
    this.selectedShiftType = null;
    this.selectedEmployee = null;
    this.searchQuery = '';
    this.refreshViews();
  }

  get hasActiveFilters(): boolean {
    return !!(this.selectedShiftType || this.selectedEmployee || this.searchQuery);
  }

  getFilteredSchedules(): ShiftScheduleDTO[] {
    let filtered = this.schedules;

    if (this.selectedShiftType) {
      filtered = filtered.filter(s => this.shiftService.getShiftById(s.shiftId)?.name === this.selectedShiftType);
    }

    if (this.selectedEmployee) {
      filtered = filtered.filter(s => s.employeeId === this.selectedEmployee);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        this.employees.find(e => e.id === s.employeeId)?.name.toLowerCase().includes(query) ?? false
      );
    }

    return filtered;
  }

  getSchedulesForDate(date: string): ShiftScheduleDTO[] {
    return this.getFilteredSchedules().filter(s => s.date === date);
  }

  private refreshViews(): void {
    this.renderCalendarEvents();
    // dayCellClassNames only runs on a grid re-render, which pushing events
    // through the API deliberately avoids — so re-apply the markers by hand.
    this.applyDayCellStates();
    this.buildGanttView();
    this.rebuildTableRows();
  }

  /**
   * Held in a field rather than a getter: <app-table>'s [rows] is an @Input, so
   * handing it a freshly-built array on every change-detection pass would make
   * PrimeNG re-run its own change handling each cycle.
   */
  private rebuildTableRows(): void {
    this.tableRows = this.getSchedulesForDate(this.selectedDate).map(schedule => {
      const shift = this.shiftFor(schedule);

      return {
        employee: this.getEmployeeNameById(schedule.employeeId) ?? '—',
        shiftName: shift?.name ?? '—',
        time: shift ? `${shift.startTime}–${shift.endTime}` : '—',
        project: schedule.project || '—',
        status: 'Scheduled',
        color: this.shiftColor(schedule)
      };
    });
  }

  // ============================================================
  // Batch selection
  // ============================================================

  setView(mode: ShiftViewMode): void {
    this.viewMode = mode;
  }

  toggleBatchSelect(scheduleId: string): void {
    if (this.batchSelected.has(scheduleId)) {
      this.batchSelected.delete(scheduleId);
    } else {
      this.batchSelected.add(scheduleId);
    }
    this.buildGanttView();
  }

  isBatchSelected(scheduleId: string): boolean {
    return this.batchSelected.has(scheduleId);
  }

  clearBatchSelection(): void {
    this.batchSelected.clear();
    this.refreshViews();
  }

  bulkDeleteSchedules(): void {
    if (this.batchSelected.size === 0) return;
    if (!confirm(`Delete ${this.batchSelected.size} schedule(s)?`)) return;

    this.batchSelected.forEach(id => this.scheduleService.deleteSchedule(id));
    this.batchSelected.clear();
  }

  // ============================================================
  // Timeline (gantt)
  // ============================================================

  buildGanttView(): void {
    const filtered = this.getFilteredSchedules();
    const seen = new Map<string, { id: string; name: string }>();

    filtered.forEach(schedule => {
      if (seen.has(schedule.employeeId)) return;
      const employee = this.employees.find(e => e.id === schedule.employeeId);
      if (employee) seen.set(schedule.employeeId, employee);
    });

    this.ganttRows = Array.from(seen.values()).map(employee => ({
      employeeId: employee.id,
      employeeName: employee.name,
      bars: this.getEmployeeGanttBars(employee.id, filtered)
    }));
  }

  private getEmployeeGanttBars(employeeId: string, schedules: ShiftScheduleDTO[]): GanttBar[] {
    return schedules
      .filter(s => s.employeeId === employeeId)
      .map(schedule => {
        const shift = this.shiftService.getShiftById(schedule.shiftId);
        const date = new Date(schedule.date + 'T00:00:00');
        const daysFromStart = Math.floor((date.getTime() - this.ganttStartDate.getTime()) / 86_400_000);

        return {
          schedule,
          shift,
          left: daysFromStart * this.pixelsPerDay,
          width: this.pixelsPerDay - 4,
          color: shift?.color || DEFAULT_SHIFT_COLOR,
          isSelected: this.batchSelected.has(schedule.id)
        };
      });
  }

  private setGanttDateRange(): void {
    const today = new Date();
    this.ganttStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    this.ganttEndDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);
  }

  ganttPrevWeek(): void {
    this.shiftGanttRange(-7);
  }

  ganttNextWeek(): void {
    this.shiftGanttRange(7);
  }

  private shiftGanttRange(days: number): void {
    this.ganttStartDate = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth(), this.ganttStartDate.getDate() + days);
    this.ganttEndDate = new Date(this.ganttEndDate.getFullYear(), this.ganttEndDate.getMonth(), this.ganttEndDate.getDate() + days);
    this.buildGanttView();
  }

  ganttResetView(): void {
    this.setGanttDateRange();
    this.buildGanttView();
  }

  ganttZoomIn(): void {
    if (this.pixelsPerDay >= 120) return;
    this.setPixelsPerDay(this.pixelsPerDay + 10);
  }

  ganttZoomOut(): void {
    if (this.pixelsPerDay <= 20) return;
    this.setPixelsPerDay(this.pixelsPerDay - 10);
  }

  private setPixelsPerDay(value: number): void {
    this.pixelsPerDay = value;
    this.ganttTimelineWidth = value * 30;
    this.buildGanttView();
  }

  getGanttDayArray(): number[] {
    const days = Math.ceil((this.ganttEndDate.getTime() - this.ganttStartDate.getTime()) / 86_400_000);
    return Array.from({ length: days + 1 }, (_, i) => i);
  }

  private ganttDate(dayIndex: number): Date {
    const date = new Date(this.ganttStartDate);
    date.setDate(date.getDate() + dayIndex);
    return date;
  }

  getGanttDateLabel(dayIndex: number): string {
    return this.ganttDate(dayIndex).toLocaleDateString('en-US', { day: 'numeric' });
  }

  getGanttDayOfWeek(dayIndex: number): string {
    return this.ganttDate(dayIndex).toLocaleDateString('en-US', { weekday: 'narrow' });
  }

  isGanttWeekend(dayIndex: number): boolean {
    const day = this.ganttDate(dayIndex).getDay();
    return day === 0 || day === 6;
  }

  // ============================================================
  // Selected day
  // ============================================================

  get selectedDateLabel(): string {
    return new Date(this.selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  get totalSchedules(): number {
    return this.schedules.length;
  }

  get dayShiftGroups(): DayShiftGroup[] {
    const groups = new Map<string, DayShiftGroup>();

    this.schedules
      .filter(s => s.date === this.selectedDate)
      .forEach(schedule => {
        const shift = this.shiftService.getShiftById(schedule.shiftId);
        if (!shift) return;

        if (!groups.has(schedule.shiftId)) {
          groups.set(schedule.shiftId, { shift, schedule, employees: [] });
        }

        const employee = this.employees.find(e => e.id === schedule.employeeId);
        if (employee) groups.get(schedule.shiftId)!.employees.push(employee);
      });

    return Array.from(groups.values());
  }

  /** Shifts cannot be assigned in the past, so today counts as locked. */
  get isSelectedDateLocked(): boolean {
    return this.selectedDate <= this.formatDateLocal(new Date());
  }

  /**
   * Read from the template several times per change-detection pass, and each
   * miss walks every schedule on the date through the conflict engine. Cached
   * against the schedule array's identity — the service hands out a new array
   * on every change — so a repeat read is free and the same reference comes
   * back, which keeps *ngFor from re-rendering the list.
   */
  get conflicts(): ScheduleConflict[] {
    if (this.conflictCache?.source === this.schedules && this.conflictCache.date === this.selectedDate) {
      return this.conflictCache.value;
    }

    const value = this.schedules
      .filter(s => s.date === this.selectedDate)
      .flatMap(schedule => {
        const result = this.scheduleService.checkConflict(schedule);
        if (!result) return [];

        return [{
          employeeName: this.employees.find(e => e.id === schedule.employeeId)?.name,
          message: result.message
        }];
      });

    this.conflictCache = { source: this.schedules, date: this.selectedDate, value };
    return value;
  }

  shiftFor(schedule: ShiftScheduleDTO): WorkShiftDTO | undefined {
    return this.shiftService.getShiftById(schedule.shiftId);
  }

  shiftColor(schedule: ShiftScheduleDTO): string {
    return this.shiftFor(schedule)?.color || DEFAULT_SHIFT_COLOR;
  }

  getEmployeeNameById(employeeId: string | null): string | undefined {
    if (!employeeId) return undefined;
    return this.employees.find(e => e.id === employeeId)?.name;
  }

  onTableDateChange(event: Event): void {
    this.selectedDate = (event.target as HTMLInputElement).value;
    this.rebuildTableRows();
  }

  // ============================================================
  // Assignment
  // ============================================================

  editSchedule(schedule: ShiftScheduleDTO): void {
    this.editingSchedule = schedule;
    this.showAssignment = true;
  }

  deleteSchedule(schedule: ShiftScheduleDTO): void {
    if (schedule.assignmentGroupId) {
      const deleteSeries = confirm(
        'Delete entire recurring series?\n\nPress OK for the entire series.\nPress Cancel for this occurrence only.'
      );

      if (deleteSeries) {
        this.scheduleService.deleteScheduleSeries(schedule.assignmentGroupId);
      } else {
        this.scheduleService.deleteSchedule(schedule.id);
      }
      return;
    }

    if (!confirm('Delete this schedule?')) return;
    this.scheduleService.deleteSchedule(schedule.id);
  }

  openAssignment(): void {
    if (this.isSelectedDateLocked) {
      this.showDateWarning = true;
      setTimeout(() => (this.showDateWarning = false), 3000);
      this.clearDragSelection();
      return;
    }

    this.showAssignment = true;
  }

  /**
   * The modal already fans the assignment across [preselectedDate,
   * preselectedEndDate] itself, so there is nothing to copy here — the old
   * bulk-copy pass re-submitted every row a second time and relied on the
   * service's duplicate check to swallow them. It also fired on cancel.
   */
  closeAssignment(): void {
    this.showAssignment = false;
    this.editingSchedule = null;
    this.clearDragSelection();
    this.refreshViews();
  }

  /**
   * A non-empty endDate makes the modal treat the assignment as a literal
   * day-by-day range and ignore the recurrence fields. Only hand it one when
   * the user actually dragged across more than a single day, so recurrence
   * still works for a plain click.
   */
  get assignmentEndDate(): string | null {
    return this.dragRangeEnd && this.dragRangeEnd !== this.dragRangeStart
      ? this.dragRangeEnd
      : null;
  }

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
