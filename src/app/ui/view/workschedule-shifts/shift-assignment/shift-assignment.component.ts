import { Component, OnInit, Output, EventEmitter, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { debounceTime } from 'rxjs';

export interface Department {
  id: string;
  name: string;
  employeeIds: string[];
}

export interface Employee {
  id: string;
  name: string;
  department: string;
}

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

   // Selection state
  selectionMode: 'individual' | 'department' = 'individual';
  selectedEmployeeIds: string[] = [];
  selectedDepartmentIds: string[] = [];
  employeeSearchQuery = '';

  /* MOCK EMPLOYEES and RECURRENECE (replace later with employee service) */
  projects = [
    'HR System Upgrade',
    'Client Onboarding',
    'Internal Audit',
    'Remote Support',
    'Field Work'
  ];  

    recurrenceOptions = [
      { value: 'none', label: 'None' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'custom', label: 'Custom' } 
  ];

  // ── Mock data (replace with real service later) ────────
  employees: Employee[] = [
    { id: 'emp-1', name: 'Afolabi Daniels', department: 'Engineering'  },
    { id: 'emp-2', name: 'David Okpabio',   department: 'Engineering'  },
    { id: 'emp-3', name: 'Ngozi Ezer',      department: 'HR'           },
    { id: 'emp-4', name: 'Amaka Okafor',    department: 'HR'           },
    { id: 'emp-5', name: 'Tunde Bello',     department: 'Operations'   },
    { id: 'emp-6', name: 'Chisom Eze',      department: 'Operations'   },
  ];

  departments: Department[] = [
    { id: 'dept-1', name: 'Engineering', employeeIds: ['emp-1', 'emp-2'] },
    { id: 'dept-2', name: 'HR',          employeeIds: ['emp-3', 'emp-4'] },
    { id: 'dept-3', name: 'Operations',  employeeIds: ['emp-5', 'emp-6'] },
  ];

  @Output() closeModal = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private shiftserviceService: ShiftserviceService,
    private scheduleserviceService: ScheduleserviceService
  ) {}

  ngOnInit(): void {
  // 1. Form first, always
  this.assignmentForm = this.fb.group({
    shiftId: ['', Validators.required],
    date: ['', Validators.required],
    endDate: [''],
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

      if (!this.selectedEmployeeIds.length || !values.date) return;

      //show exisitng assignments for selected employee
      const primaryEmployee = this.selectedEmployeeIds[0];
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
      this.selectedEmployeeIds.forEach(empId => {
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

  //getter to check if end date is set
  get hasEndDate(): boolean {
    return !!this.assignmentForm.value.endDate;
  }

  // ── Selection mode ────────
  setSelectionMode(mode: 'individual' | 'department') {
    this.selectionMode = mode;
    this.clearEmployees();
  }

    // ── Individual selection ───────────
  get filteredEmployees(): Employee[] {
    const q = this.employeeSearchQuery.toLowerCase().trim();
    if (!q) return this.employees;
    return this.employees.filter(e =>
      e.name.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
    );
  }

  onEmployeeSearch(event: Event) {
    this.employeeSearchQuery = (event.target as HTMLInputElement).value;
  }

  isEmployeeSelected(empId: string): boolean {
    return this.selectedEmployeeIds.includes(empId);
  }

  toggleEmployee(empId: string) {
    if (this.isEmployeeSelected(empId)) {
      this.selectedEmployeeIds = this.selectedEmployeeIds.filter(id => id !== empId);
    } else {
      this.selectedEmployeeIds = [...this.selectedEmployeeIds, empId];
    }
  }

  // ── Department selection ──────────────────────────────────────────────────

  isDepartmentSelected(deptId: string): boolean {
    return this.selectedDepartmentIds.includes(deptId);
  }

  toggleDepartment(deptId: string) {
    const dept = this.departments.find(d => d.id === deptId);
    if (!dept) return;

    if (this.isDepartmentSelected(deptId)) {
      // Deselect department and remove its employees
      this.selectedDepartmentIds = this.selectedDepartmentIds.filter(id => id !== deptId);
      this.selectedEmployeeIds   = this.selectedEmployeeIds.filter(
        id => !dept.employeeIds.includes(id)
      );
    } else {
      // Select department and add all its employees (avoid duplicates)
      this.selectedDepartmentIds = [...this.selectedDepartmentIds, deptId];
      const newEmpIds = dept.employeeIds.filter(id => !this.selectedEmployeeIds.includes(id));
      this.selectedEmployeeIds = [...this.selectedEmployeeIds, ...newEmpIds];
    }
  }

  clearEmployees() {
    this.selectedEmployeeIds   = [];
    this.selectedDepartmentIds = [];
    this.employeeSearchQuery   = '';
  }

   // ── Form helpers ───────────────
  get selectedShift(): ShiftDTO | undefined {
    return this.shifts.find(s => s.id === this.assignmentForm.value.shiftId);
  }

  toggleDay(day: string) {
  const current = this.assignmentForm.value.customDays || [];
  const updated = current.includes(day)
    ? current.filter((d: string) => d !== day)
    : [...current, day];

  this.assignmentForm.patchValue({ customDays: updated });
}

 // ── Submit ────────────────────────────────────────────────────────────────

  assignShift() {
    if (this.assignmentForm.invalid || !this.selectedEmployeeIds.length || this.conflictMessage.length) return;

    const { shiftId, date, endDate, project, location, recurrence } = this.assignmentForm.value;
    const datesToAssign = this.resolveDates(date, recurrence);
    const serviceConflicts: string[] = []; 

    this.selectedEmployeeIds.forEach(empId => {
      datesToAssign.forEach(d => {
        const result = this.scheduleserviceService.assignShift({
          id: crypto.randomUUID(),
          employeeId: empId,
          shiftId,
          date: d,
          status: 'scheduled',
          project,
          location,
          recurrence
        });
        // Catch any conflict the service detected that the pre-flight missed
        if (!result.success && result.message) {
          const emp = this.employees.find(e => e.id === empId);
          serviceConflicts.push(`${emp?.name} on ${d}: ${result.message}`);
        }        
      });
    });

     if (serviceConflicts.length) {
      this.conflictMessage = serviceConflicts;
      return; // Don't close — show the user what failed
    }

    this.assignmentForm.reset({ recurrence: 'none' });
    this.clearEmployees();
    this.closeModal.emit();
  }

  cancel() { 
    this.closeModal.emit(); }

  // ── Utilities ─────────────────────────────────────────────────────────────

  formatDateLocal(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private resolveDates(startDate: string, recurrence: string): string[] {
    const endDate = this.assignmentForm.value.endDate;

    // If end date is set, generate every day in the range
    if (endDate) {
      const dates: string[] = [];
      const current = new Date(startDate);
      const end = new Date(endDate);

      while (current <= end) {
        dates.push(this.formatDateLocal(new Date(current)));
        current.setDate(current.getDate() + 1);
      }
      return dates;
    }

     // Otherwise fall through to existing recurrence logic
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
}