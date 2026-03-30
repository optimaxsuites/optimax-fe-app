import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';
import { ScheduleserviceService } from '../../../service/workschedule-shift/scheduleservice.service';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { debounceTime } from 'rxjs';

@Component({
  selector: 'app-shift-assignment',
  templateUrl: './shift-assignment.component.html',
  styleUrl: './shift-assignment.component.scss'
})
export class ShiftAssignmentComponent implements OnInit {
  assignmentForm!: FormGroup;
  shifts: ShiftDTO[] = [];
  conflictMessage = '';
  existingAssignments: any[] = [];

  /* MOCK EMPLOYEES (replace later with employee service) */
  employees = [
    { id: 'emp-1', name: 'Afolabi Daniels' },
    { id: 'emp-2', name: 'David Okpabio' },
    { id: 'emp-3', name: 'Ngozi Ezer' }
  ];

  @Output() close = new EventEmitter<void>();

  constructor(
    private fb: FormBuilder,
    private shiftserviceService: ShiftserviceService,
    private scheduleserviceService: ScheduleserviceService
  ) {}

  ngOnInit(): void {

    this.assignmentForm.valueChanges
  .pipe(debounceTime(200))
  .subscribe(values => {

    this.conflictMessage = '';
    this.existingAssignments = [];

    if (!values.employeeId || !values.date) return;

    /* GET EXISTING SCHEDULES */

    const schedules =
      this.scheduleserviceService.getSchedulesByEmployee(values.employeeId)
        .filter(s => s.date === values.date);

    /* MAP WITH SHIFT DATA */

    this.existingAssignments = schedules.map(s => {

      const shift = this.shiftserviceService.getShiftById(s.shiftId);

      return {
        name: shift?.name,
        startTime: shift?.startTime,
        endTime: shift?.endTime,
        color: shift?.color
      };

    });

    /* CONFLICT DETECTION */

    if (!values.shiftId) return;

    const schedule = {
      id: 'temp',
      ...values
    };

    const conflict = this.scheduleserviceService.checkConflict(schedule);

    if (conflict) {
      this.conflictMessage = conflict.message;
    }

  });

    this.assignmentForm = this.fb.group({
      employeeId: ['', Validators.required],
      shiftId: ['', Validators.required],
      date: ['', Validators.required]
    });

    this.shiftserviceService.shifts$.subscribe(shifts => {
      this.shifts = shifts;
    });

    /* PRE-ASSIGNMENT CONFLICT DETECTION */

  this.assignmentForm.valueChanges
    .pipe(debounceTime(200))
    .subscribe(values => {

      this.conflictMessage = '';

      if (
        !values.employeeId ||
        !values.shiftId ||
        !values.date
      ) return;

      const schedule = {
        id: 'temp',
        ...values
      };

      const conflict = this.scheduleserviceService.checkConflict(schedule);

      if (conflict) {
        this.conflictMessage = conflict.message;
      }

    });

  }

  assignShift() {

    this.conflictMessage = '';

    const schedule = {
      id: crypto.randomUUID(),
      ...this.assignmentForm.value
    };

    const result = this.scheduleserviceService.assignShift(schedule);

    /*if (!result.success) {
      this.conflictMessage = result.message!;
      return;
    }*/

    if (result.success) {
      this.assignmentForm.reset();
      this.close.emit();
    } else {
      this.conflictMessage = result.message!;
    }
  }

      cancel() {
      this.close.emit();
    }
}
