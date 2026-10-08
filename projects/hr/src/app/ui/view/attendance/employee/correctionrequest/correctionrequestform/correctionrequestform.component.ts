import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CorrectionRequest, IssueToCorrectionType } from '../../../../../domain/attendance/correctionrequest.dto';
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
    { value: 'MISSING_IN', label: 'Forgot to Clock In' },
    { value: 'MISSING_OUT', label: 'Forgot to Clock Out' },
    { value: 'WRONG_TIME', label: 'Wrong Time' },
    { value: 'OTHER', label: 'Other' }
  ];

  showAddIssueModal = false;
  newIssueTypeLabel = '';
  evidenceFileName = '';
  evidenceFile: File | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      issueType: ['', Validators.required],
      description: ['', Validators.required],
      evidence: [''],
      requestedClockIn: [''],
      requestedClockOut: ['']
    });
  }

  timeError = '';

  // Local today as YYYY-MM-DD; a correction can't target a day that hasn't happened.
  today = (() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  })();

  get showClockIn(): boolean {
    return ['MISSING_IN', 'WRONG_TIME', 'OTHER'].includes(this.form.value.issueType);
  }

  get showClockOut(): boolean {
    return ['MISSING_OUT', 'WRONG_TIME', 'OTHER'].includes(this.form.value.issueType);
  }

  private toDate(date: string, time: string): Date | undefined {
    return date && time ? new Date(`${date}T${time}`) : undefined;
  }

  onIssueTypeChange(event: any): void {
    if (event.target.value === 'ADD_NEW') {
      this.showAddIssueModal = true;
      this.form.get('issueType')?.setValue('');
    }
  }

  addNewIssueType(): void {
    if (!this.newIssueTypeLabel.trim()) return;

    const newValue = this.newIssueTypeLabel.toUpperCase().replace(/\s+/g, '_');
    this.issueTypes.push({
      value: newValue,
      label: this.newIssueTypeLabel
    });

    this.form.get('issueType')?.setValue(newValue);
    this.closeAddIssueModal();
  }

  closeAddIssueModal(): void {
    this.showAddIssueModal = false;
    this.newIssueTypeLabel = '';
  }

  submit() {
    if (this.form.invalid) return;

    const { date, issueType } = this.form.value;
    if (date > this.today) {
      this.timeError = 'The date of incident cannot be in the future.';
      return;
    }
    const requestedClockIn = this.showClockIn ? this.toDate(date, this.form.value.requestedClockIn) : undefined;
    const requestedClockOut = this.showClockOut ? this.toDate(date, this.form.value.requestedClockOut) : undefined;

    // A correction with no corrected time gives the backend nothing to change on the record
    const needsIn = issueType === 'MISSING_IN' && !requestedClockIn;
    const needsOut = issueType === 'MISSING_OUT' && !requestedClockOut;
    const needsAny = (issueType === 'WRONG_TIME' || issueType === 'OTHER') && !requestedClockIn && !requestedClockOut;
    if (needsIn || needsOut || needsAny) {
      this.timeError = 'Enter the correct clock-in and/or clock-out time.';
      return;
    }
    this.timeError = '';

    const newRequest: CorrectionRequest = {
      id: uuidv4(),
      employeeId: this.currentUser.employeeId,
      employeeName: this.currentUser.employeeName,
      department: this.currentUser.department,
      date: this.form.value.date,
      issueType: this.form.value.issueType,
      correctionType: IssueToCorrectionType(this.form.value.issueType),
      description: this.form.value.description,
      evidence: this.form.value.evidence,
      requestedClockIn,
      requestedClockOut,
      status: 'PENDING',
      locked: false,
      history: [],
      createdAt: new Date()
    };

    this.submitRequest.emit(newRequest);
  }

  cancel() {
    this.close.emit();
  }

  onEvidenceFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.evidenceFile = file;
      this.evidenceFileName = file.name;
    }
  }
}
