import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CorrectionRequest } from '../../../../../domain/attendance/correctionrequest.dto';
import { v4 as uuidv4 } from 'uuid';

@Component({
  selector: 'app-correctionrequestform',
  templateUrl: './correctionrequestform.component.html',
  styleUrl: './correctionrequestform.component.scss'
})
export class CorrectionrequestformComponent {
   @Output() close = new EventEmitter<void>();
  @Output() submitRequest = new EventEmitter<CorrectionRequest>();

  form: FormGroup;

  issueTypes = [
    { value: 'MISSED_CLOCK', label: 'Missed Clock' },
    { value: 'WRONG_TIME', label: 'Wrong Time' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      issueType: ['', Validators.required],
      description: ['', Validators.required]
    });
  }

  department = "Engineering";

  submit() {
    if (this.form.invalid) return;

    const newRequest: CorrectionRequest = {
      id: uuidv4(),
      employeeId: this.form.value.employeeId,
      employeeName: this.form.value.employeeName,
      department: this.form.value.employeeId,
      date: this.form.value.date,
      issueType: this.form.value.issueType,
      description: this.form.value.description,
      status: 'PENDING',
      createdAt: new Date().toISOString()
    };

    this.submitRequest.emit(newRequest);
  }

  cancel() {
    this.close.emit();
  }
}
