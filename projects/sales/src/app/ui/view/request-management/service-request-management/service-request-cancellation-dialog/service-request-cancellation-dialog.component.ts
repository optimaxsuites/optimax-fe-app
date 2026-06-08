// src/app/ui/view/service-request-management/service-request-cancellation-dialog/service-request-cancellation-dialog.component.ts

import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';

export interface CancellationData {
  requestId: string;
  requestTitle: string;
  requestStatus: string;
  cancellationPolicy?: string;
}

export interface CancellationResult {
  reason: string;
  additionalNotes?: string;
}

@Component({
  selector: 'app-service-request-cancellation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule],
  templateUrl: './service-request-cancellation-dialog.component.html',
  styleUrls: ['./service-request-cancellation-dialog.component.scss']
})
export class ServiceRequestCancellationDialogComponent {
  
  cancellationReason = '';
  additionalNotes = '';
  selectedReasonIndex = -1;
  isSubmitting = false;
  
  cancellationReasons = [
    { 
      id: 'CHANGED_MIND', 
      label: 'Changed my mind / No longer needed', 
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      requiresNote: false
    },
    { 
      id: 'BUDGET_CONSTRAINTS', 
      label: 'Budget constraints', 
      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      requiresNote: false
    },
    { 
      id: 'TIMING_ISSUES', 
      label: 'Timing / schedule conflicts', 
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      requiresNote: true,
      notePlaceholder: 'Please describe the timing issues...'
    },
    { 
      id: 'FOUND_ALTERNATIVE', 
      label: 'Found a better vendor/service', 
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
      requiresNote: true,
      notePlaceholder: 'Please share which vendor/service you chose instead...'
    },
    { 
      id: 'SCOPE_CHANGED', 
      label: 'Project scope changed', 
      icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
      requiresNote: true,
      notePlaceholder: 'Please describe how the scope has changed...'
    },
    { 
      id: 'VENDOR_ISSUES', 
      label: 'Issues with vendor communication/quality', 
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0',
      requiresNote: true,
      notePlaceholder: 'Please describe the vendor issues...'
    },
    { 
      id: 'INTERNAL_CHANGES', 
      label: 'Internal business changes', 
      icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      requiresNote: true,
      notePlaceholder: 'Please explain the internal changes...'
    },
    { 
      id: 'OTHER', 
      label: 'Other reason', 
      icon: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      requiresNote: true,
      notePlaceholder: 'Please provide details...'
    }
  ];

  constructor(
    private dialogRef: MatDialogRef<ServiceRequestCancellationDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: CancellationData
  ) {}

  selectReason(index: number): void {
    this.selectedReasonIndex = index;
    this.cancellationReason = this.cancellationReasons[index].label;
    
    // Clear additional notes if the new reason doesn't require notes
    if (!this.cancellationReasons[index].requiresNote) {
      this.additionalNotes = '';
    }
  }

  isReasonSelected(): boolean {
    return this.selectedReasonIndex !== -1;
  }

  getSelectedReason(): any {
    if (this.selectedReasonIndex === -1) return null;
    return this.cancellationReasons[this.selectedReasonIndex];
  }

  requiresNotes(): boolean {
    const reason = this.getSelectedReason();
    return reason ? reason.requiresNote : false;
  }

  getNotePlaceholder(): string {
    const reason = this.getSelectedReason();
    return reason?.notePlaceholder || 'Please provide additional details...';
  }

  onSubmit(): void {
    if (!this.isReasonSelected()) {
      return;
    }

    if (this.requiresNotes() && !this.additionalNotes.trim()) {
      return;
    }

    this.isSubmitting = true;
    
    const result: CancellationResult = {
      reason: this.cancellationReason,
      additionalNotes: this.additionalNotes.trim() || undefined
    };
    
    setTimeout(() => {
      this.dialogRef.close(result);
    }, 500);
  }

  onClose(): void {
    this.dialogRef.close(null);
  }
}