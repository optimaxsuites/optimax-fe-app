import { Component, EventEmitter, Input, Output, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { WorkShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';

@Component({
  selector: 'app-shift-form',
  templateUrl: './shift-form.component.html',
  styleUrl: './shift-form.component.scss'
})
export class ShiftFormComponent implements OnInit {

   @Input() shift?: WorkShiftDTO;

  @Output() closeForm = new EventEmitter<void>();

  shiftForm!: FormGroup;

  isEditMode = false;

  colorOptions = [
      '#3da86a',
      '#4f8cff',
      '#ffb020',
      '#ff5c5c',
      '#8e44ad',
      '#2c3e50',
      '#00bcd4'
  ];

  constructor(
    private fb: FormBuilder,
    private shiftserviceService: ShiftserviceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.isEditMode = !!this.shift;

    this.shiftForm = this.fb.group({
      name: ['', Validators.required],
      type: ['morning'],
      //department: [''],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      description: ['', Validators.required],
      color: ['#3da86a', Validators.required]
    },
    {
    validators: this.shiftTimeValidator()
    }
    );

    if (this.shift) {
      this.shiftForm.patchValue(this.shift);
    }

  }

  get detectedShiftType():
    'morning' | 'evening' | 'night' | 'custom' {

    const startTime =
      this.shiftForm?.get('startTime')?.value;

    if (!startTime) {
      return 'morning';
    }

    const hour =
      Number(startTime.split(':')[0]);

    if (hour >= 5 && hour < 12) {
      return 'morning';
    }

    if (hour >= 12 && hour < 18) {
      return 'evening';
    }

    return 'night';
  }

  getShiftType(
    startTime: string
  ): 'morning' | 'evening' | 'night' {

    const hour =
      Number(startTime.split(':')[0]);

    if (hour >= 5 && hour < 12) {
      return 'morning';
    }

    if (hour >= 12 && hour < 18) {
      return 'evening';
    }

    return 'night';
  }

  private shiftTimeValidator(): ValidatorFn {

    return (
      control: AbstractControl
    ): ValidationErrors | null => {

      const startTime =
        control.get('startTime')?.value;

      const endTime =
        control.get('endTime')?.value;

      if (!startTime || !endTime) {
        return null;
      }

      const startHour =
        Number(startTime.split(':')[0]);

      const endHour =
        Number(endTime.split(':')[0]);

      const shiftType =
        this.getShiftType(startTime);

      if (
        shiftType !== 'night' &&
        endTime <= startTime
      ) {
        return {
          invalidShiftTime: true
        };
      }

      return null;
    };
  }

  selectColor(color: string) {
    this.shiftForm.patchValue({ color });
    this.cdr.detectChanges(); //forces UI to update
  }

  saveShift() {

    if (this.shiftForm.invalid) return;

    const shiftData: WorkShiftDTO = {
      id: this.shift?.id || crypto.randomUUID(),
      ...this.shiftForm.value,
      type: this.detectedShiftType
    };

    if (this.isEditMode) {
      this.shiftserviceService.updateShift(shiftData);
    } else {
      this.shiftserviceService.addShift(shiftData);
    }

    this.close();

  }

  close() {
    this.closeForm.emit();
  }

}
