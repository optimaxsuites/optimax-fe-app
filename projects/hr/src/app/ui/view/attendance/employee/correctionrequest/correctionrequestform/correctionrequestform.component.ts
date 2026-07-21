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

  // TODO: Replace with actual user session data from UserService
  private currentUser = {
    employeeId: '1',
    employeeName: 'Employee',
    department: 'Engineering'
  };

  issueTypes = [
    { value: 'MISSED_CLOCK', label: 'Missed Clock' },
    { value: 'WRONG_TIME', label: 'Wrong Time' },
    { value: 'OTHER', label: 'Other' }
  ];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      issueType: ['', Validators.required],
      requestedClockIn: [''],
      requestedClockOut: [''],
      description: ['', Validators.required],
      evidence: ['']
    });
  }

  submit() {
    if (this.form.invalid) return;

    const newRequest: CorrectionRequest = {
      id: uuidv4(),
      employeeId: this.currentUser.employeeId,
      employeeName: this.currentUser.employeeName,
      department: this.currentUser.department,
      date: this.form.value.date,
      issueType: this.form.value.issueType,
      requestedClockIn: this.form.value.requestedClockIn,
      requestedClockOut: this.form.value.requestedClockOut,
      description: this.form.value.description,
      evidence: this.form.value.evidence,
      status: 'PENDING',
      locked: false,
      history: [],
      createdAt: new Date().toISOString()
    };

    this.submitRequest.emit(newRequest);
  }

  cancel() {
    this.close.emit();
  }
}
