import { Component, OnInit, ViewChild, HostListener } from '@angular/core';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { CalendarOptions } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

interface DayShiftGroup {
  shift: ShiftDTO;
  schedule: ScheduleDTO;
  employees: { id: string; name: string }[];
}

@Component({
  selector: 'app-shift-calendar',
  templateUrl: './shift-calendar.component.html',
  styleUrl: './shift-calendar.component.scss'
})
export class ShiftCalendarComponent implements OnInit {

  showAssignment = false;
  schedules: ScheduleDTO[] = [];
  currentDate = new Date();
  currentPage = 1;
  pageSize = 5;
  selectedDate: string = this.formatDateLocal(new Date());

  viewMode: 'calendar' | 'table' | 'summary' | 'gantt' = 'calendar';
  batchSelected: Set<string> = new Set();

  // Filters
  selectedShiftType: string | null = null;
  selectedEmployee: string | null = null;
  searchQuery: string = '';
  shiftTypes: string[] = [];

  // FullCalendar
  calendarOptions!: CalendarOptions;

  // Gantt View
  ganttRows: any[] = [];
  ganttStartDate = new Date();
  ganttEndDate = new Date();
  pixelsPerDay = 60;
  ganttTimelineWidth = 1200;

  // Summary metrics
  totalShifts = 0;
  totalEmployees = 0;
  totalOpenSlots = 0;

  // Drag-to-select
  dragStartDate: string | null = null;
  dragEndDate: string | null = null;
  isDragging = false;
  selectedDatesRange: Set<string> = new Set();
  dateMap: Map<string, HTMLElement> = new Map();
  dragRangeStart: string | null = null;
  dragRangeEnd: string | null = null;

  selectedSummaryDate: string | null = null;
  showDateWarning = false;

  editingSchedule: ScheduleDTO | null = null;

  employees = [
    { id: 'emp-1', name: 'Afolabi Daniels' },
    { id: 'emp-2', name: 'David Okpabio' },
    { id: 'emp-3', name: 'Ngozi Ezer' }
  ];
  readonly weekdays = ['Sun', 'Mon', 'Tues', 'Wed', 'Thur', 'Fri', 'Sat'];

  constructor(
    private scheduleService: ScheduleserviceService,
    private shiftService: ShiftserviceService
  ) {}

  ngOnInit(): void {
    this.initializeCalendarOptions();
    this.scheduleService.schedules$.subscribe(data => {
      console.log('📥 Schedules received from service:', data.length, 'total');
      this.schedules = data;
      this.extractShiftTypes();

      // Log filtered data for each view
      const filtered = this.getFilteredSchedules();
      console.log('📊 After filters:', filtered.length, 'schedules');
      console.log('   Filters applied - Shift:', this.selectedShiftType, 'Employee:', this.selectedEmployee, 'Query:', this.searchQuery);

      // Update all views
      this.updateCalendarEvents();
      this.updateSummaryMetrics();
      this.buildGanttView();

      console.log('✅ All views updated');
    });

    const today = this.formatDateLocal(new Date());
    this.selectedSummaryDate = today;
    console.log('📅 Summary date initialized to:', today);

    // Add global mouse tracking for drag-to-select
    this.addGlobalMouseTracking();
  }

  private addGlobalMouseTracking(): void {
    document.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isDragging) return;

      const element = document.elementFromPoint(e.clientX, e.clientY);
      const dateCell = element?.closest('[data-date]') as HTMLElement;

      if (dateCell) {
        const dateStr = dateCell.getAttribute('data-date');
        if (dateStr) {
          this.continueDateDrag(dateStr);
        }
      }
    });

    document.addEventListener('mouseup', () => {
      if (this.isDragging) {
        this.endDateDrag();
      }
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
      eventClick: (arg: any) => this.onEventClick(arg),
      eventDisplay: 'block',
      displayEventTime: true,
      eventTimeFormat: {
        hour: '2-digit',
        minute: '2-digit',
        meridiem: 'short'
      },
      dayCellDidMount: (arg: any) => this.onDayCellDidMount(arg)
    };
  }

  updateCalendarEvents(): void {
    const filtered = this.getFilteredSchedules();
    console.log('Updating calendar events with', filtered.length, 'filtered schedules');
    const events = filtered.map(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      const emp = this.employees.find(e => e.id === schedule.employeeId);

      return {
        id: schedule.id,
        title: `${shift?.name || 'Shift'} - ${emp?.name || 'N/A'}`,
        date: schedule.date,
        backgroundColor: shift?.color || '#3b82f6',
        borderColor: this.batchSelected.has(schedule.id) ? '#fbbf24' : (shift?.color || '#3b82f6'),
        extendedProps: {
          scheduleId: schedule.id,
          shiftId: schedule.shiftId,
          employeeId: schedule.employeeId,
          schedule: schedule,
          shift: shift,
          employee: emp
        }
      };
    });

    if (this.calendarOptions.events) {
      this.calendarOptions.events = events;
    }
  }

  onDayCellDidMount(arg: any): void {
    const dateStr = this.formatDateLocal(arg.date);
    const hasSchedules = this.schedules.some(s => s.date === dateStr);

    // Store date on the element for drag selection
    arg.el.setAttribute('data-date', dateStr);
    this.dateMap.set(dateStr, arg.el);

    // Add background color for scheduled dates
    if (hasSchedules) {
      arg.el.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
      arg.el.style.borderLeft = '4px solid #3b82f6';
    }

    // Add mousedown listener for drag start
    arg.el.addEventListener('mousedown', (e: MouseEvent) => {
      // Ignore if clicking on an event
      if ((e.target as HTMLElement).closest('.fc-event')) {
        return;
      }
      this.startDateDrag(dateStr);
    });

    // Update drag range styling
    if (this.isDateInDragRange(dateStr)) {
      arg.el.style.backgroundColor = '#dbeafe';
      arg.el.style.borderLeft = '3px solid #60a5fa';
    }
  }

  onEventClick(arg: any): void {
    const scheduleId = arg.event.extendedProps['scheduleId'];
    this.toggleBatchSelect(scheduleId);
    this.updateCalendarEvents();
  }

  updateSummaryMetrics(): void {
    this.totalShifts = this.schedules.length;
    this.totalEmployees = new Set(this.schedules.map(s => s.employeeId)).size;

    // Log all schedules with their dates
    if (this.schedules.length > 0) {
      console.log('📋 All schedules:');
      this.schedules.forEach(s => {
        const emp = this.employees.find(e => e.id === s.employeeId);
        const shift = this.shiftService.getShiftById(s.shiftId);
        console.log(`   ${emp?.name || 'N/A'}: ${shift?.name || 'N/A'} on ${s.date}`);
      });
    }

    console.log('📊 Summary metrics:', this.totalShifts, 'total shifts,', this.totalEmployees, 'unique employees');
    const requiredDailySlots = 10;
    this.totalOpenSlots = Math.max(0, requiredDailySlots - this.schedules.length);
  }

  extractShiftTypes(): void {
    const types = new Set<string>();
    this.schedules.forEach(s => {
      const shift = this.shiftService.getShiftById(s.shiftId);
      if (shift) types.add(shift.name);
    });
    this.shiftTypes = Array.from(types).sort();
  }

  applyFilters(): void {
    const filtered = this.getFilteredSchedules();
    console.log('🔍 Applying filters - Visible schedules:', filtered.length, 'of', this.schedules.length);
    this.updateCalendarEvents();
    this.buildGanttView();
    this.updateSummaryMetrics();
  }

  clearFilters(): void {
    console.log('🔄 Clearing all filters');
    this.selectedShiftType = null;
    this.selectedEmployee = null;
    this.searchQuery = '';

    const filtered = this.getFilteredSchedules();
    console.log('📊 After clearing filters:', filtered.length, 'schedules visible');

    this.updateCalendarEvents();
    this.buildGanttView();
    this.updateSummaryMetrics();
  }

  getFilteredSchedules(): ScheduleDTO[] {
    let filtered = this.schedules;

    if (this.selectedShiftType) {
      filtered = filtered.filter(s => {
        const shift = this.shiftService.getShiftById(s.shiftId);
        return shift?.name === this.selectedShiftType;
      });
    }

    if (this.selectedEmployee) {
      filtered = filtered.filter(s => s.employeeId === this.selectedEmployee);
    }

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(s => {
        const emp = this.employees.find(e => e.id === s.employeeId);
        return emp?.name.toLowerCase().includes(query) || false;
      });
    }

    return filtered;
  }

  getSchedulesForDate(date: string): ScheduleDTO[] {
    return this.getFilteredSchedules().filter(s => s.date === date);
  }

  // Drag-to-select logic
  @HostListener('document:mouseup', ['$event'])
  onMouseUp(): void {
    this.endDateDrag();
  }

  startDateDrag(dateStr: string): void {
    this.isDragging = true;
    this.dragStartDate = dateStr;
    this.dragEndDate = dateStr;
    this.dragRangeStart = dateStr;
    this.dragRangeEnd = dateStr;
    this.selectDateRange(new Date(dateStr + 'T00:00:00'), new Date(dateStr + 'T00:00:00'));
    this.updateDragRangeStyling();
  }

  continueDateDrag(dateStr: string): void {
    if (!this.isDragging || !this.dragStartDate) return;
    this.dragEndDate = dateStr;
    const start = new Date(this.dragStartDate + 'T00:00:00');
    const end = new Date(dateStr + 'T00:00:00');
    const sortedStart = start > end ? end : start;
    const sortedEnd = start > end ? start : end;
    this.dragRangeStart = this.formatDateLocal(sortedStart);
    this.dragRangeEnd = this.formatDateLocal(sortedEnd);
    this.selectDateRange(sortedStart, sortedEnd);
    this.updateDragRangeStyling();
  }

  endDateDrag(): void {
    if (this.isDragging && this.selectedDatesRange.size > 0) {
      this.selectedDate = this.formatDateLocal(new Date(this.dragEndDate + 'T00:00:00'));
      this.isDragging = false;
      this.openAssignment();
    } else {
      this.isDragging = false;
    }
  }

  selectDateRange(start: Date, end: Date): void {
    this.selectedDatesRange.clear();
    const current = new Date(start);
    while (current <= end) {
      this.selectedDatesRange.add(this.formatDateLocal(current));
      current.setDate(current.getDate() + 1);
    }
  }

  isDateInDragRange(dateStr: string): boolean {
    return this.isDragging && this.selectedDatesRange.has(dateStr);
  }

  updateDragRangeStyling(): void {
    const cells = document.querySelectorAll('[data-date]');
    cells.forEach((cell: any) => {
      const dateStr = cell.getAttribute('data-date');
      const hasSchedules = this.schedules.some(s => s.date === dateStr);

      if (this.isDateInDragRange(dateStr)) {
        cell.style.backgroundColor = '#dbeafe';
        cell.style.borderLeft = '3px solid #60a5fa';
      } else if (hasSchedules) {
        cell.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        cell.style.borderLeft = '4px solid #3b82f6';
      } else {
        cell.style.backgroundColor = '';
        cell.style.borderLeft = '';
      }
    });
  }

  setView(mode: 'calendar' | 'table' | 'summary' | 'gantt') {
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

  bulkAssignShift(shiftId: string) {
    const selectedSchedules = this.schedules.filter(s => this.batchSelected.has(s.id));
    console.log('Bulk assign shift', shiftId, 'to', selectedSchedules.length, 'schedules');
    this.batchSelected.clear();
  }

  bulkDeleteSchedules() {
    if (this.batchSelected.size === 0) return;
    const confirmed = confirm(`Delete ${this.batchSelected.size} schedule(s)?`);
    if (!confirmed) return;

    this.batchSelected.forEach(scheduleId => {
      const schedule = this.schedules.find(s => s.id === scheduleId);
      if (schedule) {
        this.scheduleService.deleteSchedule(scheduleId);
      }
    });
    this.batchSelected.clear();
  }

  // Gantt view methods
  buildGanttView(): void {
    const filtered = this.getFilteredSchedules();
    console.log('Building Gantt view with', filtered.length, 'filtered schedules');

    const uniqueEmployees = new Map<string, { id: string; name: string }>();

    filtered.forEach(s => {
      const emp = this.employees.find(e => e.id === s.employeeId);
      if (emp && !uniqueEmployees.has(s.employeeId)) {
        uniqueEmployees.set(s.employeeId, emp);
      }
    });

    this.ganttRows = Array.from(uniqueEmployees.values()).map(emp => ({
      employeeName: emp.name,
      employeeId: emp.id,
      bars: this.getEmployeeGanttBars(emp.id, filtered)
    }));

    console.log('Gantt rows created:', this.ganttRows.length, 'rows');
    this.ganttRows.forEach(row => {
      console.log(`  ${row.employeeName}: ${row.bars.length} shifts`);
    });

    this.setGanttDateRange();
    console.log(`Gantt date range: ${this.formatDateLocal(this.ganttStartDate)} to ${this.formatDateLocal(this.ganttEndDate)}`);
  }

  getEmployeeGanttBars(employeeId: string, schedules: ScheduleDTO[]): any[] {
    const employeeSchedules = schedules.filter(s => s.employeeId === employeeId);
    const bars = employeeSchedules.map(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      const scheduleDate = new Date(schedule.date + 'T00:00:00');
      const daysFromStart = Math.floor((scheduleDate.getTime() - this.ganttStartDate.getTime()) / (1000 * 60 * 60 * 24));

      const bar = {
        schedule,
        shift,
        left: daysFromStart * this.pixelsPerDay,
        width: this.pixelsPerDay - 4,
        color: shift?.color || '#3b82f6',
        isSelected: this.batchSelected.has(schedule.id)
      };

      console.log(`    Bar: ${shift?.name || 'Unknown'} on ${schedule.date}, position: ${bar.left}px, days from start: ${daysFromStart}`);
      return bar;
    });

    return bars;
  }

  setGanttDateRange(): void {
    const today = new Date();
    // Set start to beginning of current month
    this.ganttStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
    // Set end to end of next month to ensure we show future shifts
    this.ganttEndDate = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    console.log(`📅 Gantt date range: ${this.formatDateLocal(this.ganttStartDate)} to ${this.formatDateLocal(this.ganttEndDate)}`);

    // Log if there are schedules outside this range
    const outsideRange = this.schedules.filter(s => {
      const d = new Date(s.date + 'T00:00:00');
      return d < this.ganttStartDate || d > this.ganttEndDate;
    });
    if (outsideRange.length > 0) {
      console.warn(`⚠️  ${outsideRange.length} schedules outside Gantt date range`);
    }
  }

  ganttPrevWeek(): void {
    this.ganttStartDate = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth(), this.ganttStartDate.getDate() - 7);
    this.ganttEndDate = new Date(this.ganttEndDate.getFullYear(), this.ganttEndDate.getMonth(), this.ganttEndDate.getDate() - 7);
    this.buildGanttView();
  }

  ganttNextWeek(): void {
    this.ganttStartDate = new Date(this.ganttStartDate.getFullYear(), this.ganttStartDate.getMonth(), this.ganttStartDate.getDate() + 7);
    this.ganttEndDate = new Date(this.ganttEndDate.getFullYear(), this.ganttEndDate.getMonth(), this.ganttEndDate.getDate() + 7);
    this.buildGanttView();
  }

  ganttResetView(): void {
    this.setGanttDateRange();
    this.buildGanttView();
  }

  ganttZoomIn(): void {
    if (this.pixelsPerDay < 120) {
      this.pixelsPerDay += 10;
      this.ganttTimelineWidth = this.pixelsPerDay * 30;
      this.buildGanttView();
    }
  }

  ganttZoomOut(): void {
    if (this.pixelsPerDay > 20) {
      this.pixelsPerDay -= 10;
      this.ganttTimelineWidth = this.pixelsPerDay * 30;
      this.buildGanttView();
    }
  }

  getGanttDayArray(): number[] {
    const days = Math.ceil((this.ganttEndDate.getTime() - this.ganttStartDate.getTime()) / (1000 * 60 * 60 * 24));
    return Array.from({ length: days + 1 }, (_, i) => i);
  }

  getGanttDateLabel(dayIndex: number): string {
    const date = new Date(this.ganttStartDate);
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  getGanttDayOfWeek(dayIndex: number): string {
    const date = new Date(this.ganttStartDate);
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }

  get selectedDateLabel(): string {
    return new Date(this.selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  getDateOfWeek(dateStr: string): string {
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
  }

  hasSchedules(date: Date): boolean {
    const d = this.formatDateLocal(date);
    return this.schedules.some(s => s.date === d);
  }

  get dayShiftGroups(): DayShiftGroup[] {
    const daySchedules = this.schedules.filter(s => s.date === this.selectedDate);
    const groups = new Map<string, DayShiftGroup>();

    daySchedules.forEach(schedule => {
      const shift = this.shiftService.getShiftById(schedule.shiftId);
      if (!shift) return;

      if (!groups.has(schedule.shiftId)) {
        groups.set(schedule.shiftId, { shift, schedule, employees: [] });
      }

      const emp = this.employees.find(e => e.id === schedule.employeeId);
      if (emp) {
        groups.get(schedule.shiftId)!.employees.push(emp);
      }
    });

    return Array.from(groups.values());
  }

  get isSelectedDateLocked(): boolean {
    const today = this.formatDateLocal(new Date());
    return this.selectedDate <= today;
  }

  isPastOrToday(date: Date): boolean {
    const today = new Date();
    const d = this.formatDateLocal(date);
    const t = this.formatDateLocal(today);
    return d <= t;
  }

  editSchedule(schedule: ScheduleDTO): void {
    this.editingSchedule = schedule;
    this.showAssignment = true;
  }

  deleteSchedule(schedule: ScheduleDTO): void {
    if (schedule.assignmentGroupId) {
      const deleteSeries = confirm('Delete entire recurring series?\n\nPress OK for entire series.\nPress Cancel for single occurrence.');
      if (deleteSeries) {
        this.scheduleService.deleteScheduleSeries(schedule.assignmentGroupId);
      } else {
        this.scheduleService.deleteSchedule(schedule.id);
      }
      return;
    }

    const confirmed = confirm('Delete this schedule?');
    if (!confirmed) return;
    this.scheduleService.deleteSchedule(schedule.id);
  }

  onTableDateChange(event: any) {
    this.selectedDate = event.target.value;
    this.currentPage = 1;
  }

  get flattenedTableData() {
    const rows: any[] = [];
    this.dayShiftGroups.forEach(group => {
      group.employees.forEach(emp => {
        rows.push({
          shiftName: group.shift.name,
          project: group.schedule.project,
          employee: emp.name,
          time: `${group.shift.startTime} – ${group.shift.endTime}`,
          status: 'Scheduled'
        });
      });
    });
    return rows;
  }

  get totalSchedules(): number {
    return this.schedules.length;
  }

  selectSummaryDate(date: string): void {
    this.selectedSummaryDate = date;
  }

  get uniqueEmployees(): number {
    return new Set(this.schedules.map(s => s.employeeId)).size;
  }

  get openSlots(): number {
    const requiredDailySlots = 10;
    return Math.max(0, requiredDailySlots - this.schedules.length);
  }

  getDayShiftColors(date: Date): string[] {
    const day = this.formatDateLocal(date);
    const daySchedules = this.schedules.filter(s => s.date === day);
    const uniqueAssignments = new Map<string, string>();

    daySchedules.forEach(schedule => {
      const key = schedule.assignmentGroupId ?? schedule.id;
      if (!uniqueAssignments.has(key)) {
        const shift = this.shiftService.getShiftById(schedule.shiftId);
        uniqueAssignments.set(key, shift?.color || '#9ca3af');
      }
    });

    return Array.from(uniqueAssignments.values()).slice(0, 10);
  }

  get employeeSummary() {
    const selectedDate = this.selectedSummaryDate;
    return this.employees.map(emp => {
      const schedules = this.schedules.filter(
        s => s.employeeId === emp.id && (!selectedDate || s.date === selectedDate)
      );
      return {
        employee: emp.name,
        shifts: schedules.length
      };
    });
  }

  get weeklySummary() {
    const result: { date: string; shifts: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      const formatted = this.formatDateLocal(date);
      result.push({
        date: formatted,
        shifts: this.schedules.filter(s => s.date === formatted).length
      });
    }
    return result;
  }

  get paginatedData() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.flattenedTableData.slice(start, start + this.pageSize);
  }

  get totalPages() {
    return Math.ceil(this.flattenedTableData.length / this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  openAssignment() {
    const selected = new Date(this.selectedDate);
    if (this.isSelectedDateLocked) {
      this.showDateWarning = true;
      setTimeout(() => {
        this.showDateWarning = false;
      }, 3000);
      return;
    }
    this.showAssignment = true;
  }

  closeAssignment() {
    this.showAssignment = false;
    this.editingSchedule = null;

    console.log('Modal closed. Selected dates range:', Array.from(this.selectedDatesRange), 'Total schedules:', this.schedules.length);

    // Handle bulk assignment for multiple selected dates
    if (this.selectedDatesRange.size > 1) {
      console.log('Initiating bulk assignment for', this.selectedDatesRange.size, 'dates');
      setTimeout(() => {
        this.bulkAssignToSelectedDates();
        this.selectedDatesRange.clear();
        // Update all views after bulk assignment
        this.updateCalendarEvents();
        this.updateSummaryMetrics();
        this.buildGanttView();
        console.log('Bulk assignment complete. Total schedules:', this.schedules.length);
      }, 500);
    } else {
      this.selectedDatesRange.clear();
      // Update all views after single assignment
      this.updateCalendarEvents();
      this.updateSummaryMetrics();
      this.buildGanttView();
      console.log('Single date assignment or no dates selected. Total schedules:', this.schedules.length);
    }
  }

  private bulkAssignToSelectedDates(): void {
    // Get all schedules created for the selected date (could be multiple employees)
    const recentSchedules = this.schedules.filter(s => s.date === this.selectedDate);
    if (recentSchedules.length === 0) {
      console.warn('No schedules found for date:', this.selectedDate);
      return;
    }

    console.log(`Found ${recentSchedules.length} schedule(s) for ${this.selectedDate}, copying to ${this.selectedDatesRange.size - 1} other date(s)`);

    // Get all other dates in the selection
    const datesArray = Array.from(this.selectedDatesRange);

    // For each recently created schedule (one per assigned employee)
    recentSchedules.forEach(recentSchedule => {
      // Copy this schedule to all other dates
      datesArray.forEach(dateStr => {
        // Skip the original date
        if (dateStr === this.selectedDate) return;

        // Create a new schedule for this date with the same shift, employee, and other details
        const newSchedule: ScheduleDTO = {
          id: crypto.randomUUID(),
          employeeId: recentSchedule.employeeId,
          shiftId: recentSchedule.shiftId,
          date: dateStr,
          project: recentSchedule.project,
          location: recentSchedule.location,
          description: recentSchedule.description,
          recurrence: recentSchedule.recurrence,
          customDays: recentSchedule.customDays,
          customInterval: recentSchedule.customInterval,
          repeatCount: recentSchedule.repeatCount,
          assignmentGroupId: recentSchedule.assignmentGroupId,
          status: recentSchedule.status
        };

        // Use the proper service method to create the schedule
        const result = this.scheduleService.assignShift(newSchedule);
        if (!result.success) {
          console.warn(`Failed to assign shift for employee ${recentSchedule.employeeId} on ${dateStr}:`, result.message);
        }
      });
    });
  }

  formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  getEmployeeNameById(employeeId: string | null): string | undefined {
    if (!employeeId) return undefined;
    return this.employees.find(e => e.id === employeeId)?.name;
  }

  get conflicts() {
    const conflicts: any[] = [];
    const daySchedules = this.schedules.filter(s => s.date === this.selectedDate);

    for (const schedule of daySchedules) {
      const result = this.scheduleService.checkConflict(schedule);
      if (result) {
        const emp = this.employees.find(e => e.id === schedule.employeeId);
        conflicts.push({
          employeeName: emp?.name,
          message: result.message
        });
      }
    }

    return conflicts;
  }
}
