import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ProfileChangeRequestService } from '../../../service/profile-change-request.service';
import { ProfileChangeRequestDTO } from '../../../model/profile-change-request.model';
import { MailNotificationService } from '../../../service/mailNotification.service';

export interface NextOfKin {
  id?: number;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  relationship?: string;
  DOB?: string;
  emergencyContact?: boolean;
}

export type NokChangeType = 'add' | 'edit' | 'delete';

@Component({
  selector: 'app-nok-change-request',
  templateUrl: './nok-change-request.component.html',
  styleUrl: './nok-change-request.component.scss',
  providers: [MessageService]
})
export class NokChangeRequestComponent implements OnInit, OnChanges {
  @Input() employee: any | null = null;
  @Input() nokRecord: NextOfKin | null = null;
  @Input() changeType: NokChangeType = 'add';
  @Output() requestSubmitted = new EventEmitter<ProfileChangeRequestDTO>();

  nokForm!: FormGroup;
  isSubmitting = false;
  relationships = ['Spouse', 'Child', 'Parent', 'Sibling', 'Grandparent', 'Other'];

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
    if ((changes['nokRecord'] || changes['changeType']) && this.nokForm) {
      this.populateFormWithRecord();
    }
  }

  private initializeForm(): void {
    this.nokForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.email]],
      phone: ['', [Validators.pattern(/^[\d\s+\-()]+$/)]],
      address: [''],
      relationship: ['', Validators.required],
      DOB: [''],
      emergencyContact: [false]
    });

    this.populateFormWithRecord();
  }

  private populateFormWithRecord(): void {
    if (this.changeType === 'edit' && this.nokRecord) {
      this.nokForm.patchValue(this.nokRecord);
    } else if (this.changeType === 'add') {
      this.nokForm.reset({ emergencyContact: false });
    } else if (this.changeType === 'delete' && this.nokRecord) {
      this.nokForm.patchValue(this.nokRecord);
      this.nokForm.disable();
    }
  }

  submitRequest(): void {
    console.log("empl", this.employee)
    if (!this.employee) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Employee information not found.'
      });
      return;
    }

    console.log("type", this.changeType)

    if (this.changeType === 'delete') {
      this.submitDeleteRequest();
    } else if (this.nokForm.invalid) {
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly.'
      });
      return;
    } else if (this.changeType === 'add') {
      this.submitAddRequest();
    } else if (this.changeType === 'edit') {
      console.log("here in edit ")
      this.submitEditRequest();
    }
  }

  private submitAddRequest(): void {
    this.isSubmitting = true;

    const formValue = this.nokForm.value;
    const request: ProfileChangeRequestDTO = {
      employeeId: this.employee.id,
      employeeName: `${this.employee.firstName} ${this.employee.lastName}`,
      employeeEmail: this.employee.email,
      requestType: 'new',
      fieldChangeType: 'NOK',
      request: [
        { fieldName: 'fullName', value: formValue.fullName, oldValue: null },
        { fieldName: 'email', value: formValue.email || null, oldValue: null },
        { fieldName: 'phone', value: formValue.phone || null, oldValue: null },
        { fieldName: 'address', value: formValue.address || null, oldValue: null },
        { fieldName: 'relationship', value: formValue.relationship, oldValue: null },
        { fieldName: 'DOB', value: formValue.DOB || null, oldValue: null },
        { fieldName: 'emergencyContact', value: formValue.emergencyContact, oldValue: null }
      ],
      reason: 'Adding new next of kin record',
      status: 'pending',
      submittedDate: new Date()
    };

    this.profileChangeRequestService.submitProfileChangeRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your next of kin addition request has been submitted for HR review.',
          key: 'global'
        });
        this.requestSubmitted.emit(request);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting NOK add request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Error',
          detail: 'Failed to submit your request. Please try again.'
        });
      }
    });
  }

  private submitEditRequest(): void {
    console.log("here oooo")
    console.log("nok", this.nokRecord)
    if (!this.nokRecord?.id) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Record ID not found.',
        key: 'tl'
      });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.nokForm.value;
    const request: ProfileChangeRequestDTO = {
      employeeId: this.employee.id,
      employeeName: `${this.employee.firstName} ${this.employee.lastName}`,
      employeeEmail: this.employee.email,
      requestType: 'change',
      fieldChangeType: 'NOK',
      request: [
        {fieldName: 'id', value: this.nokRecord.id, oldValue: this.nokRecord.id },
        { fieldName: 'fullName', value: formValue.fullName, oldValue: this.nokRecord.fullName },
        { fieldName: 'email', value: formValue.email || null, oldValue: this.nokRecord.email || null },
        { fieldName: 'phone', value: formValue.phone || null, oldValue: this.nokRecord.phone || null },
        { fieldName: 'address', value: formValue.address || null, oldValue: this.nokRecord.address || null },
        { fieldName: 'relationship', value: formValue.relationship, oldValue: this.nokRecord.relationship },
        { fieldName: 'DOB', value: formValue.DOB || null, oldValue: this.nokRecord.DOB || null },
        { fieldName: 'emergencyContact', value: formValue.emergencyContact, oldValue: this.nokRecord.emergencyContact }
      ],
      reason: 'Updating next of kin record',
      status: 'pending',
      submittedDate: new Date()
    };

    this.profileChangeRequestService.submitProfileChangeRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your next of kin update request has been submitted for HR review.',
          key: 'global'
        });
        this.requestSubmitted.emit(request);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting NOK edit request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Error',
          detail: 'Failed to submit your request. Please try again.'
        });
      }
    });
  }

  private submitDeleteRequest(): void {
    if (!this.nokRecord?.id) {
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
      fieldChangeType: 'NOK',
      request: [
        { fieldName: 'id', value: null, oldValue: this.nokRecord.id },
        { fieldName: 'fullName', value: null, oldValue: this.nokRecord.fullName }
      ],
      reason: 'Deleting next of kin record',
      status: 'pending',
      submittedDate: new Date()
    };

    this.profileChangeRequestService.submitProfileChangeRequest(request).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Request submitted',
          detail: 'Your next of kin deletion request has been submitted for HR review.',
          key: 'global'
        });
        this.requestSubmitted.emit(request);
      },
      error: (error) => {
        this.isSubmitting = false;
        console.error('Error submitting NOK delete request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Error',
          detail: 'Failed to submit your request. Please try again.'
        });
      }
    });
  }

  cancelRequest(): void {
    this.nokForm.reset();
  }

  hasError(fieldName: string, errorType: string): boolean {
    const field = this.nokForm.get(fieldName);
    return !!(field && field.hasError(errorType) && (field.dirty || field.touched));
  }
}
