import { Component, OnInit, Output, EventEmitter, HostListener, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { EmployeeService } from '../../../service/employee.service';
import { WorkShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { ShiftScheduleDTO } from '../../../domain/workschedule-shift/schedule.dto';
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
  shifts: WorkShiftDTO[] = [];
  conflictMessage: string[] = [];
  existingAssignments: any[] = [];

   // Selection state
  selectionMode: 'individual' | 'department' = 'individual';
  selectedEmployeeIds: string[] = [];
  selectedDepartmentIds: string[] = [];
  employeeSearchQuery = '';
  editMode: 'single' | 'series' = 'single';

  // Modal state
  showAddShiftModal = false;
  newShiftName = '';
  newShiftStart = '';
  newShiftEnd = '';

  /* MOCK EMPLOYEES and RECURRENECE (replace later with employee service) */
  projects: { id: number; name: string }[] = [];

    recurrenceOptions = [
      { value: 'none', label: 'None' },
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'custom', label: 'Custom' } 
  ];

  employees: Employee[] = [];
  departments: Department[] = [];

  @Input() preselectedDate!: string;
  @Input() preselectedEndDate!: string;
  @Input() scheduleToEdit: ShiftScheduleDTO | null = null;
  @Output() closeModal = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private shiftserviceService: ShiftserviceService,
    private scheduleserviceService: ScheduleserviceService,
    private employeeService: EmployeeService
  ) {}

  ngOnInit(): void {
  // 1. Form first, always
  this.assignmentForm = this.fb.group({
    shiftId: ['', Validators.required],
    date: ['', Validators.required],
    endDate: [''],
    project: ['', Validators.required],
    description: ['', Validators.required],
    location: [''],
    recurrence: ['none'],
    customDays: [[]], //for example, Mon, Wed
    customInterval: [1], //every X days
    repeatCount: [1]
  });

  if (this.scheduleToEdit) {
    this.selectionMode = 'individual';
    this.selectedEmployeeIds = [
      this.scheduleToEdit.employeeId
    ];
    this.assignmentForm.patchValue({
      shiftId: this.scheduleToEdit.shiftId,
      date: this.scheduleToEdit.date,
      project: this.scheduleToEdit.project,
      location: this.scheduleToEdit.location,
      recurrence: this.scheduleToEdit.recurrence,
      customDays: this.scheduleToEdit.customDays ?? [],
      customInterval: this.scheduleToEdit.customInterval ?? 1,
      repeatCount: this.scheduleToEdit.repeatCount ?? 1,
      description: this.scheduleToEdit.description
    });
  }

  if (!this.scheduleToEdit && this.preselectedDate) {
    this.assignmentForm.patchValue({
      date: this.preselectedDate,
      endDate: this.preselectedEndDate || ''
    });
  }

  // 2. Shifts
  this.shiftserviceService.shifts$.subscribe(shifts => {
    this.shifts = shifts;
  });

  this.scheduleserviceService.schedules$.subscribe(schedules => {
    const projects = new Map<number, string>();
    schedules.forEach(schedule => {
      if (schedule.projectId && schedule.project) {
        projects.set(schedule.projectId, schedule.project);
      }
    });
    this.projects = Array.from(projects, ([id, name]) => ({ id, name }));
  });

  this.employeeService.getActiveEmployees().subscribe(employees => {
    this.employees = employees.map(employee => {
      const department = employee.department;
      const departmentName = typeof department === 'string'
        ? department
        : department?.name ?? employee.departmentName ?? '';

      return {
        id: String(employee.id ?? employee.employeeId ?? ''),
        name: employee.fullName
          ?? employee.name
          ?? `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim(),
        department: departmentName
      };
    }).filter(employee => employee.id && employee.name);

    const departments = new Map<string, Department>();
    this.employees.forEach(employee => {
      if (!employee.department) return;
      const departmentId = String(
        employees.find(item => String(item.id ?? item.employeeId ?? '') === employee.id)?.department?.id
        ?? employee.department
      );
      const department = departments.get(departmentId) ?? {
        id: departmentId,
        name: employee.department,
        employeeIds: []
      };
      department.employeeIds.push(employee.id);
      departments.set(departmentId, department);
    });
    this.departments = Array.from(departments.values());
  });

  // 3. Single valueChanges subscription (removed the duplicate)
  this.assignmentForm.valueChanges
    .pipe(debounceTime(200))
    .subscribe(values => {
      this.conflictMessage = [];
      this.existingAssignments = [];

      if (!this.selectedEmployeeIds.length || !values.date) return;

      //show exisitng assignments for selected employee
      /*const primaryEmployee = this.selectedEmployeeIds[0];
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
      });*/

      // show existing assignments for ALL selected employees
      this.existingAssignments = [];

      this.selectedEmployeeIds.forEach(empId => {

        const employee = this.employees.find(
          e => e.id === empId
        );

        const schedules = this.scheduleserviceService
          .getSchedulesByEmployee(empId)
          .filter(s => s.date === values.date);

        schedules.forEach(schedule => {

          const shift =
            this.shiftserviceService.getShiftById(
              schedule.shiftId
            );

          this.existingAssignments.push({

            employeeName: employee?.name,

            name: shift?.name,

            startTime: shift?.startTime,

            endTime: shift?.endTime,

            color: shift?.color

          });

        });

      });

      if (!values.shiftId) return;

      //check conflict for selected employee
      this.selectedEmployeeIds.forEach(empId => {
        const conflict = this.scheduleserviceService.checkConflict({
        id: this.scheduleToEdit?.id ?? 'temp',
        employeeId: empId,
        shiftId: values.shiftId,
        date: values.date
      } as ShiftScheduleDTO,
      this.scheduleToEdit?.id
    );

      if (conflict) {
        const emp = this.employees.find(e => e.id === empId);
        this.conflictMessage.push(`${emp?.name}: ${conflict.message}`);
      }
      });
    });

    this.assignmentForm.get('endDate')?.valueChanges.subscribe(end => {
      const start = this.assignmentForm.value.date;
      if (end && start && end < start) {
        this.assignmentForm.patchValue({ endDate: '' });
      }
    });
  }

  get minDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.formatDateLocal(tomorrow);
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
  get selectedShift(): WorkShiftDTO | undefined {
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
    if (this.isEditMode) {
      const form = this.assignmentForm.value;
      const updatedSchedule: ShiftScheduleDTO = {
        ...this.scheduleToEdit!,
        shiftId: form.shiftId,
        date: form.date,
        project: form.project,
        projectId: this.projects.find(project => project.name === form.project)?.id
          ?? this.scheduleToEdit!.projectId,
        location: form.location,
        recurrence: form.recurrence,
        customDays: form.customDays,
        customInterval: form.customInterval,
        repeatCount: form.repeatCount,
        description: form.description
      };

      if (this.editMode === 'series' && this.scheduleToEdit?.assignmentGroupId) {
        this.scheduleserviceService.updateScheduleSeries(
          this.scheduleToEdit.assignmentGroupId,
          {
            shiftId: form.shiftId,
            //date: form.date,
            project: form.project,
            location: form.location,
            recurrence: form.recurrence,
            customDays: form.customDays,
            customInterval: form.customInterval,
            repeatCount: form.repeatCount,
            description: form.description
          });
      } else {
        this.scheduleserviceService.updateSchedule(updatedSchedule);
      }
      
      this.closeModal.emit();
      return;
    }
    //custome recurrence validation
    if (this.assignmentForm.value.recurrence === 'custom' &&
      (!this.assignmentForm.value.customDays || this.assignmentForm.value.customDays.length === 0)
    ) {
      alert('Please select at least one day for custom recurrence.');
      return;
    }
    if (this.assignmentForm.invalid || !this.selectedEmployeeIds.length || this.conflictMessage.length) return;

    const { shiftId, date, endDate, project, location, recurrence, customDays, customInterval, repeatCount, description } = this.assignmentForm.value;
    const datesToAssign = this.resolveDates(date, recurrence, repeatCount);
    const serviceConflicts: string[] = []; 
    
        this.selectedEmployeeIds.forEach(empId => {
        // one schedule group per date
        const assignmentGroupId = crypto.randomUUID();
          datesToAssign.forEach(d => {
          const result = this.scheduleserviceService.assignShift({
          id: crypto.randomUUID(),
          assignmentGroupId,
          employeeId: empId,
          shiftId,
          date: d,
          status: 'scheduled',
          project,
          projectId: this.projects.find(projectOption => projectOption.name === project)?.id,
          location,
          recurrence,
          customDays,
          customInterval,
          repeatCount,
          description
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

    this.assignmentForm.reset({ recurrence: 'none', repeatCount: 1, customDays: [] });
    this.clearEmployees();
    this.closeModal.emit();
  }

  get isEditMode(): boolean {
    return !!this.scheduleToEdit;
  }

  get isRecurringSchedule(): boolean {
    return !!(
      this.scheduleToEdit?.assignmentGroupId
    );
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

  private resolveDates(
  startDate: string,
  recurrence: string,
  repeatCount: number = 1
): string[] {

  const endDate =
    this.assignmentForm.value.endDate;

  if (endDate) {

    const dates: string[] = [];

    const current =
      new Date(startDate);

    const end =
      new Date(endDate);

    while (current <= end) {

      dates.push(
        this.formatDateLocal(
          new Date(current)
        )
      );

      current.setDate(
        current.getDate() + 1
      );
    }

    return dates;
  }

  const dates: string[] = [];

  const start =
    new Date(startDate);

  if (recurrence === 'none') {

    dates.push(startDate);

    return dates;
  }

  if (recurrence === 'daily') {

    for (let i = 0; i < repeatCount; i++) {

      const d = new Date(start);

      d.setDate(
        start.getDate() + i
      );

      dates.push(
        this.formatDateLocal(d)
      );
    }

    return dates;
  }

  if (recurrence === 'weekly') {

    for (let i = 0; i < repeatCount; i++) {

      const d = new Date(start);

      d.setDate(
        start.getDate() + (i * 7)
      );

      dates.push(
        this.formatDateLocal(d)
      );
    }

    return dates;
  }

  if (recurrence === 'custom') {

    const selectedDays =
      this.assignmentForm.value.customDays || [];

    if (!selectedDays.length) {
      return [startDate];
    }

    const dayMap: any = {
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
        week * 7
      );

      selectedDays.forEach(
        (dayName: string) => {

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
        }
      );
    }

    return dates.sort();
  }

  return [startDate];
}

toggleSeriesEdit(event: Event): void {
  const checked =
    (event.target as HTMLInputElement).checked;

  this.editMode =
    checked ? 'series' : 'single';
}

get showRecurrenceControls(): boolean {

  if (!this.isEditMode) {
    return true;
  }

  return this.editMode === 'series';
}

  /*private resolveDates(startDate: string, recurrence: string): string[] {
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
    //const dates: string[] = [];
    const start = new Date(startDate);

  if (recurrence === 'none')    return dates;

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
      const selectedDays: string[] = this.assignmentForm.value.customDays || [];
      if (!selectedDays.length) return dates;

      const dayMap: any = {
        Sun: 0, Mon: 1, Tue: 2, Wed: 3,
        Thu: 4, Fri: 5, Sat: 6
      };

      const start = new Date(startDate);

      // Generate for next 30 days
      for (let i = 1; i < 30; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);

        const dayName = Object.keys(dayMap).find(
          key => dayMap[key] === d.getDay()
        );

        if (selectedDays.includes(dayName!)) {
          dates.push(this.formatDateLocal(d));
        }
      }

      return dates;
    }

    /*if (recurrence === 'custom') {
      const interval = this.assignmentForm.value.customInterval || 1;
      for (let i = 1; i <= 10; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i * interval);
        dates.push(this.formatDateLocal(d));
      }
    }

    return dates;
  }*/

  onShiftChange(event: any) {
    if (event.target.value === '__add_new__') {
      event.target.value = '';
      this.assignmentForm.patchValue({ shiftId: '' });
      this.showAddShiftModal = true;
      this.newShiftName = '';
      this.newShiftStart = '';
      this.newShiftEnd = '';
    }
  }

  closeAddShiftModal() {
    this.showAddShiftModal = false;
    this.newShiftName = '';
    this.newShiftStart = '';
    this.newShiftEnd = '';
  }

  saveNewShiftModal() {
    if (!this.newShiftName || !this.newShiftStart || !this.newShiftEnd) {
      alert('Please fill in all fields');
      return;
    }
    const newShift: WorkShiftDTO = {
      id: '',
      name: this.newShiftName,
      startTime: this.newShiftStart,
      endTime: this.newShiftEnd,
      type: 'custom'
    };
    this.shiftserviceService.addShift(newShift).subscribe({
      next: created => {
        this.assignmentForm.patchValue({ shiftId: created.id });
        this.closeAddShiftModal();
      },
      error: () => alert('Failed to save shift. Please try again.')
    });
  }

}
