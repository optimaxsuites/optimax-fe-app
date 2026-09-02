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

  showAddIssueModal = false;
  newIssueTypeLabel = '';
  evidenceFileName = '';
  evidenceFile: File | null = null;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      date: ['', Validators.required],
      issueType: ['', Validators.required],
      description: ['', Validators.required],
      evidence: ['']
    });
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

    const newRequest: CorrectionRequest = {
      id: uuidv4(),
      employeeId: this.currentUser.employeeId,
      employeeName: this.currentUser.employeeName,
      department: this.currentUser.department,
      date: this.form.value.date,
      issueType: this.form.value.issueType,
      description: this.form.value.description,
      evidence: this.form.value.evidence,
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
