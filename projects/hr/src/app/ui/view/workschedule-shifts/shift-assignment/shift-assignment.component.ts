import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { debounceTime } from 'rxjs';
import { HostListener } from '@angular/core';

@Component({
  selector: 'app-shift-assignment',
  templateUrl: './shift-assignment.component.html',
  styleUrl: './shift-assignment.component.scss'
})
export class ShiftAssignmentComponent implements OnInit {
  assignmentForm!: FormGroup;
  shifts: ShiftDTO[] = [];
  conflictMessage: string[] = [];
  existingAssignments: any[] = [];

  /* MOCK EMPLOYEES and RECURRENECE (replace later with employee service) */
  projects = [
    'HR System Upgrade',
    'Client Onboarding',
    'Internal Audit',
    'Remote Support',
    'Field Work'
  ];  
  employees = [
      { id: 'emp-1', name: 'Afolabi Daniels' },
      { id: 'emp-2', name: 'David Okpabio' },
      { id: 'emp-3', name: 'Ngozi Ezer' }
    ];

    recurrenceOptions = [
      { value: 'none', label: 'None' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'custom', label: 'Custom' }
    ];

  @Output() close = new EventEmitter<void>();
  isEmployeeDropdownOpen = false; 

  constructor(
    private fb: FormBuilder,
    private shiftserviceService: ShiftserviceService,
    private scheduleserviceService: ScheduleserviceService
  ) {}

  ngOnInit(): void {
  // 1. Form first, always
  this.assignmentForm = this.fb.group({
    employeeIds: [[], Validators.required], //array
    shiftId: ['', Validators.required],
    date: ['', Validators.required],
    project: [''],
    location: [''],
    recurrence: ['none'],
    customDays: [[]], //for example, Mon, Wed
    customInterval: [1] //every X days
  });

  // 2. Shifts
  this.shiftserviceService.shifts$.subscribe(shifts => {
    this.shifts = shifts;
  });

  // 3. Single valueChanges subscription (removed the duplicate)
  this.assignmentForm.valueChanges
    .pipe(debounceTime(200))
    .subscribe(values => {
      this.conflictMessage = [];
      this.existingAssignments = [];

      if (!values.employeeIds || !values.date) return;

      //show exisitng assignments for selected employee
      const primaryEmployee = values.employeeIds[0];
      const schedules = this.scheduleserviceService
        .getSchedulesByEmployee(primaryEmployee)
        .filter(s => s.date === values.date);

      this.existingAssignments = schedules.map(s => {
        const shift = this.shiftserviceService.getShiftById(s.shiftId);
        return {
          name: shift?.name,
          startTime: shift?.startTime,
          endTime: shift?.endTime,
          color: shift?.color
        };
      });

      if (!values.shiftId) return;

      //check conflict for selected employee
      values.employeeIds.forEach((empId: string) => {
        const conflict = this.scheduleserviceService.checkConflict({
        id: 'temp',
        employeeId: empId,
        shiftId: values.shiftId,
        date: values.date
      });

      if (conflict) {
        const emp = this.employees.find(e => e.id === empId);
        this.conflictMessage.push(`${emp?.name}: ${conflict.message}`);
      }
      });
    });

  }

    get selectedShift(): ShiftDTO | undefined {
  return this.shifts.find(s => s.id === this.assignmentForm.value.shiftId);
}

     toggleEmployee(empId: string) {
    const current: string[] = this.assignmentForm.value.employeeIds || [];
    const updated = current.includes(empId)
      ? current.filter(id => id !== empId)
      : [...current, empId];
    this.assignmentForm.patchValue({ employeeIds: updated });
  }

  toggleDay(day: string) {
  const current = this.assignmentForm.value.customDays || [];
  const updated = current.includes(day)
    ? current.filter((d: string) => d !== day)
    : [...current, day];

  this.assignmentForm.patchValue({ customDays: updated });
}

  isEmployeeSelected(empId: string): boolean {
    return (this.assignmentForm.value.employeeIds || []).includes(empId);
  }

  toggleEmployeeDropdown(event: MouseEvent) {
    event.stopPropagation();
    console.log('clicked');
    this.isEmployeeDropdownOpen = !this.isEmployeeDropdownOpen;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: any) {
    const clickedInside = event.target.closest('.employee-dropdown');
    if (!clickedInside) {
      this.isEmployeeDropdownOpen = false;
    }
  }

  getSelectedEmployeeNames(): string {
    const ids = this.assignmentForm.value.employeeIds || [];

    const names = this.employees
      .filter(e => ids.includes(e.id))
      .map(e => e.name);

    return names.length ? names.join(', ') : 'Select employees';
  }
  

   assignShift() {
    if (this.assignmentForm.invalid || this.conflictMessage.length) return;

    const { employeeIds, shiftId, date, project, location, recurrence } = this.assignmentForm.value;

    const datesToAssign = this.resolveDates(date, recurrence);

    // Create one ScheduleDTO per employee per date
    employeeIds.forEach((empId: string) => {
      datesToAssign.forEach((d: string) => {
        this.scheduleserviceService.assignShift({
          id: crypto.randomUUID(),
          employeeId: empId,
          shiftId,
          date: d,
          status: 'scheduled',
          project,
          location,
          recurrence
        });
      });
    });

    this.assignmentForm.reset({ recurrence: 'none', employeeIds: [] });
    this.close.emit();
  }

  formatDateLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

   // Expand recurrence into actual dates (up to 30 days out)
   private resolveDates(startDate: string, recurrence: string): string[] {
  const dates: string[] = [startDate];
  const start = new Date(startDate);

  if (recurrence === 'none') return dates;

  if (recurrence === 'daily') {
    for (let i = 1; i <= 30; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(this.formatDateLocal(d));
    }
  }

  if (recurrence === 'weekly') {
    for (let i = 1; i <= 4; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i * 7);
      dates.push(this.formatDateLocal(d));
    }
  }

  if (recurrence === 'custom') {
    const interval = this.assignmentForm.value.customInterval || 1;

    for (let i = 1; i <= 10; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i * interval);
      dates.push(this.formatDateLocal(d));
    }
  }

  return dates;
}
  /*private resolveDates(startDate: string, recurrence: string): string[] {
    const dates: string[] = [startDate];
    if (recurrence === 'none') return dates;

    const start = new Date(startDate);
    const limit = 30;
    const stepDays = recurrence === 'daily' ? 1 : recurrence === 'weekly' ? 7 : 1;
    const iterations = recurrence === 'daily' ? limit : recurrence === 'weekly' ? 4 : 1;

    for (let i = 1; i <= iterations; i++) {
      const next = new Date(start);
      next.setDate(start.getDate() + i * stepDays);
      dates.push(next.toISOString().split('T')[0]);
    }

    return dates;
  }*/

  cancel() {
    this.close.emit();
  }
}
