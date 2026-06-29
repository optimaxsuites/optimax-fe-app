import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { ProcurementRequestService } from '../../../../service/procurement-request-management/product-request-management/procurement-request.service';
export interface CancellationDialogData {
  requestId: string;
  requestTitle: string;
  requestStatus: string;
  canCancelWithoutPenalty?: boolean;
  cancellationPolicy?: string;
}

export interface CancellationResult {
  requestId: string;
  reason: string;
  additionalNotes?: string;
}

@Component({
  selector: 'app-request-cancellation-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule],
  templateUrl: './request-cancellation-dialog.component.html',
  styleUrls: ['./request-cancellation-dialog.component.scss']
})
export class RequestCancellationDialogComponent implements OnInit {
  
  cancellationForm: FormGroup;
  isSubmitting = false;
  cancellationReasons = [
    { value: 'CHANGED_MIND', label: 'Changed my mind / No longer needed', requiresNote: false },
    { value: 'FOUND_BETTER_PRICE', label: 'Found a better price elsewhere', requiresNote: false },
    { value: 'BUDGET_CONSTRAINTS', label: 'Budget constraints / Insufficient funds', requiresNote: false },
    { value: 'TIMING_ISSUES', label: 'Timing issues / Delivery too slow', requiresNote: false },
    { value: 'DUPLICATE_REQUEST', label: 'Duplicate request (already submitted another)', requiresNote: false },
    { value: 'INCORRECT_DETAILS', label: 'Incorrect details entered', requiresNote: true, notePlaceholder: 'Please specify what was incorrect...' },
    { value: 'VENDOR_ISSUES', label: 'Issues with vendor selection', requiresNote: true, notePlaceholder: 'Please describe the vendor issues...' },
    { value: 'OTHER', label: 'Other reason', requiresNote: true, notePlaceholder: 'Please provide details...' }
  ];
  
  selectedReason: any = null;
  showPenaltyWarning = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<RequestCancellationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancellationDialogData,
    private procurementRequestService: ProcurementRequestService
  ) {
    this.cancellationForm = this.fb.group({
      reason: ['', Validators.required],
      additionalNotes: ['', [Validators.maxLength(500)]],
      confirmAcknowledgement: [false, Validators.requiredTrue]
    });
  }

  ngOnInit(): void {
    // Check if cancellation penalty applies
    this.checkCancellationPenalty();
    
    // Watch for reason changes to update additional notes requirement
    this.cancellationForm.get('reason')?.valueChanges.subscribe(reasonValue => {
      this.selectedReason = this.cancellationReasons.find(r => r.value === reasonValue);
      const notesControl = this.cancellationForm.get('additionalNotes');
      
      if (this.selectedReason?.requiresNote) {
        notesControl?.setValidators([Validators.required, Validators.maxLength(500)]);
      } else {
        notesControl?.clearValidators();
        notesControl?.setValidators([Validators.maxLength(500)]);
      }
      notesControl?.updateValueAndValidity();
    });
  }

  private checkCancellationPenalty(): void {
    // Determine if cancellation has penalty based on request status
    const penaltyStatuses = ['VENDORS_QUOTING', 'VENDOR_SELECTED', 'LPO_ISSUED', 'PAYMENT_PENDING'];
    if (penaltyStatuses.includes(this.data.requestStatus) && !this.data.canCancelWithoutPenalty) {
      this.showPenaltyWarning = true;
    }
  }

  onSubmit(): void {
    if (this.cancellationForm.invalid) {
      this.cancellationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    
    const result: CancellationResult = {
      requestId: this.data.requestId,
      reason: this.cancellationForm.get('reason')?.value,
      additionalNotes: this.cancellationForm.get('additionalNotes')?.value
    };

    // Close dialog with result
    this.dialogRef.close(result);
  }

  onClose(): void {
    this.dialogRef.close(null);
  }

  getReasonErrorMessage(): string {
    const control = this.cancellationForm.get('reason');
    if (control?.hasError('required') && control.touched) {
      return 'Please select a reason for cancellation';
    }
    return '';
  }

  getNotesErrorMessage(): string {
    const control = this.cancellationForm.get('additionalNotes');
    if (control?.hasError('required') && control.touched) {
      return 'Please provide additional details for this cancellation reason';
    }
    if (control?.hasError('maxlength')) {
      return 'Notes cannot exceed 500 characters';
    }
    return '';
  }

  getAcknowledgementErrorMessage(): string {
    const control = this.cancellationForm.get('confirmAcknowledgement');
    if (control?.hasError('requiredTrue') && control.touched) {
      return 'You must acknowledge the cancellation terms';
    }
    return '';
  }
}