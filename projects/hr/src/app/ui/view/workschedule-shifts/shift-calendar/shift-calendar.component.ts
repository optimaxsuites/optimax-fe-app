import { Component, OnInit } from '@angular/core';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';

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

  calendarDays: { date: Date; inMonth: boolean }[] = [];

  viewMode: 'calendar' | 'table' = 'calendar';

  setView(mode: 'calendar' | 'table') {
    this.viewMode = mode;
  }
  
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
    this.buildCalendar();
    this.scheduleService.schedules$.subscribe(data => {
      this.schedules = data;
    });
  }

  formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

  buildCalendar() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    this.calendarDays = [];

    // Pad start with previous month days
    for (let i = 0; i < firstDay.getDay(); i++) {
      const d = new Date(year, month, -firstDay.getDay() + i + 1);
      this.calendarDays.push({ date: d, inMonth: false });
    }

    // Current month days
    for (let d = 1; d <= lastDay.getDate(); d++) {
      this.calendarDays.push({ date: new Date(year, month, d), inMonth: true });
    }

    // Pad end to fill 6 rows (42 cells total)
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

  selectDate(day: { date: Date; inMonth: boolean }) {
    this.selectedDate = this.formatDateLocal(day.date);
  }

  get selectedDateLabel(): string {
    return new Date(this.selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }

  get monthLabel(): string {
    return this.currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  isToday(date: Date): boolean {
    return this.formatDateLocal(date) === this.formatDateLocal(new Date());
  }

  isSelected(date: Date): boolean {
    return this.formatDateLocal(date) === this.selectedDate;
  }

  hasSchedules(date: Date): boolean {
    const d = this.formatDateLocal(date);
    return this.schedules.some(s => s.date === d);
  }

  // Group schedules for selected date by shift
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

  // Normalize both to local YYYY-MM-DD
  const d = this.formatDateLocal(date);
  const t = this.formatDateLocal(today);

  return d <= t; // includes today
}

onTableDateChange(event: any) {
  this.selectedDate = event.target.value;
  this.currentPage = 1; // reset pagination
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

    if(this.isSelectedDateLocked) {
      alert('You can only assign shifts for future dates.');
      return;
    }

    this.showAssignment = true; }
  closeAssignment() { this.showAssignment = false; }
}