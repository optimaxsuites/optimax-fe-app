import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ShiftDTO } from '../../../domain/workschedule-shift/shift.dto';
import { ShiftserviceService } from '../../../service/workschedule-shift/shiftservice.service';

@Component({
  selector: 'app-shift-form',
  templateUrl: './shift-form.component.html',
  styleUrl: './shift-form.component.scss'
})
export class ShiftFormComponent implements OnInit {

   @Input() shift?: ShiftDTO;

  @Output() closeForm = new EventEmitter<void>();

  shiftForm!: FormGroup;

  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    private shiftserviceService: ShiftserviceService
  ) {}

  ngOnInit(): void {

    this.isEditMode = !!this.shift;

    this.shiftForm = this.fb.group({
      name: ['', Validators.required],
      department: [''],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakTime: [0],
      description: [''],
      color: ['#3da86a']
    });

    if (this.shift) {
      this.shiftForm.patchValue(this.shift);
    }

  }

  saveShift() {

    if (this.shiftForm.invalid) return;

    const shiftData: ShiftDTO = {
      id: this.shift?.id || crypto.randomUUID(),
      ...this.shiftForm.value
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
