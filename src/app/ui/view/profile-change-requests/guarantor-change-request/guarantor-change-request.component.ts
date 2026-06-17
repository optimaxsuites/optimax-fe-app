import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ProfileChangeRequestService } from '../../../service/profile-change-request.service';
import { ProfileChangeRequestDTO } from '../../../model/profile-change-request.model';
import { MailNotificationService } from '../../../service/mailNotification.service';

export interface Guarantor {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  yearsKnown?: number;
}

export type GuarantorChangeType = 'add' | 'edit' | 'delete';

@Component({
  selector: 'app-guarantor-change-request',
  templateUrl: './guarantor-change-request.component.html',
  styleUrl: './guarantor-change-request.component.scss',
  providers: [MessageService]
})
export class GuarantorChangeRequestComponent implements OnInit, OnChanges {
  @Input() employee: any | null = null;
  @Input() guarantorRecord: Guarantor | null = null;
  @Input() changeType: GuarantorChangeType = 'add';
  @Output() requestSubmitted = new EventEmitter<ProfileChangeRequestDTO>();

  guarantorForm!: FormGroup;
  isSubmitting = false;
  relationships = ['Friend', 'Colleague', 'Business Associate', 'Family', 'Other'];

  constructor(
    private fb: FormBuilder,
    private profileChangeRequestService: ProfileChangeRequestService,
    private messageService: MessageService,
    private mailNotificationService: MailNotificationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if ((changes['guarantorRecord'] || changes['changeType']) && this.guarantorForm) {
      this.populateFormWithRecord();
    }
  }

  private initializeForm(): void {
    this.guarantorForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^[\d\s+\-()]+$/)]],
      address: [''],
      relationship: ['', Validators.required],
      yearsKnown: ['', [Validators.min(0), Validators.max(100)]]
    });

    this.populateFormWithRecord();
  }

  private populateFormWithRecord(): void {
    if (this.changeType === 'edit' && this.guarantorRecord) {
      this.guarantorForm.patchValue(this.guarantorRecord);
    } else if (this.changeType === 'add') {
      this.guarantorForm.reset();
    } else if (this.changeType === 'delete' && this.guarantorRecord) {
      this.guarantorForm.patchValue(this.guarantorRecord);
      this.guarantorForm.disable();
    }
  }

  submitRequest(): void {
    if (!this.employee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee information not found.'
      });
      return;
    }

    if (this.changeType === 'delete') {
      this.submitDeleteRequest();
    } else if (this.guarantorForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.'
      });
      return;
    } else if (this.changeType === 'add') {
      this.submitAddRequest();
    } else if (this.changeType === 'edit') {
      this.submitEditRequest();
    }
  }

  private submitAddRequest(): void {
    this.isSubmitting = true;

    const formValue = this.guarantorForm.value;
    const request: ProfileChangeRequestDTO = {
      employeeId: this.employee.id,
      employeeName: `${this.employee.firstName} ${this.employee.lastName}`,
      employeeEmail: this.employee.email,
      requestType: 'new',
      fieldChangeType: 'guarantor',
      request: [
        { fieldName: 'fullName', value: formValue.fullName, oldValue: null },
        { fieldName: 'email', value: formValue.email || null, oldValue: null },
        { fieldName: 'phone', value: formValue.phone || null, oldValue: null },
        { fieldName: 'address', value: formValue.address || null, oldValue: null },
        { fieldName: 'relationship', value: formValue.relationship, oldValue: null },
        { fieldName: 'yearsKnown', value: formValue.yearsKnown || null, oldValue: null }
      ],
      reason: 'Adding new guarantor record',
      status: 'pending',
      submittedDate: new Date()
    };

    this.profileChangeRequestService.submitProfileChangeRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your guarantor addition request has been submitted for HR review.',
          key: 'global'
        });
        this.requestSubmitted.emit(request);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting guarantor add request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Error',
          detail: 'Failed to submit your request. Please try again.'
        });
      }
    });
  }

  private submitEditRequest(): void {
    if (!this.guarantorRecord?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Record ID not found.'
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.guarantorForm.value;
    const request: ProfileChangeRequestDTO = {
      employeeId: this.employee.id,
      employeeName: `${this.employee.firstName} ${this.employee.lastName}`,
      employeeEmail: this.employee.email,
      requestType: 'change',
      fieldChangeType: 'guarantor',
      request: [
        { fieldName: 'fullName', value: formValue.fullName, oldValue: this.guarantorRecord.fullName },
        { fieldName: 'email', value: formValue.email || null, oldValue: this.guarantorRecord.email || null },
        { fieldName: 'phone', value: formValue.phone || null, oldValue: this.guarantorRecord.phone || null },
        { fieldName: 'address', value: formValue.address || null, oldValue: this.guarantorRecord.address || null },
        { fieldName: 'relationship', value: formValue.relationship, oldValue: this.guarantorRecord.relationship },
        { fieldName: 'yearsKnown', value: formValue.yearsKnown || null, oldValue: this.guarantorRecord.yearsKnown || null }
      ],
      reason: 'Updating guarantor record',
      status: 'pending',
      submittedDate: new Date()
    };

    this.profileChangeRequestService.submitProfileChangeRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your guarantor update request has been submitted for HR review.',
          key: 'global'
        });
        this.requestSubmitted.emit(request);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting guarantor edit request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Error',
          detail: 'Failed to submit your request. Please try again.'
        });
      }
    });
  }

  private submitDeleteRequest(): void {
    if (!this.guarantorRecord?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Record ID not found.'
      });
      return;
    }

    this.isSubmitting = true;
    const request: ProfileChangeRequestDTO = {
      employeeId: this.employee.id,
      employeeName: `${this.employee.firstName} ${this.employee.lastName}`,
      employeeEmail: this.employee.email,
      requestType: 'delete',
      fieldChangeType: 'guarantor',
      request: [
        { fieldName: 'id', value: null, oldValue: this.guarantorRecord.id },
        { fieldName: 'fullName', value: null, oldValue: this.guarantorRecord.fullName }
      ],
      reason: 'Deleting guarantor record',
      status: 'pending',
      submittedDate: new Date()
    };

    this.profileChangeRequestService.submitProfileChangeRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your guarantor deletion request has been submitted for HR review.',
          key: 'global'
        });
        this.requestSubmitted.emit(request);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting guarantor delete request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Error',
          detail: 'Failed to submit your request. Please try again.'
        });
      }
    });
  }

  cancelRequest(): void {
    this.guarantorForm.reset();
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.guarantorForm.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
  }
}
