import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RecurringPayment } from './recurring-payment.model';

@Component({
  selector: 'app-recurring-payment-modal',
  templateUrl: './recurring-payment-modal.component.html',
  styleUrls: ['./recurring-payment-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class RecurringPaymentModalComponent {
  @Output() save = new EventEmitter<RecurringPayment>();
  @Output() cancel = new EventEmitter<void>();

  form: FormGroup;
  showSummary = false;

  frequencies = ['Daily', 'Weekly', 'Monthly', 'Custom'];

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      type: ['one-time', Validators.required],
      frequency: [null],
      startDate: [null, Validators.required],
      endDate: [null],
      noEndDate: [false],
      occurrences: [null],
      emailReminder: [false]
    });
  }

  onSaveClick() {
    if (this.form.valid) {
      const value = this.form.value as RecurringPayment;

      if (value.noEndDate) {
        value.endDate = undefined;
      }

      if (value.type === 'recurring' && !value.frequency) {
        this.form.get('frequency')?.setErrors({ required: true });
        return;
      }

      if (value.type === 'recurring' && !value.noEndDate && !value.endDate && !value.occurrences) {
        this.form.get('endDate')?.setErrors({ required: true });
        this.form.get('occurrences')?.setErrors({ required: true });
        return;
      }

      this.save.emit(value);   // ✅ send data to parent
      this.showSummary = true; // optional local feedback
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCancelClick() {
    this.cancel.emit();
    this.showSummary = false;
  }
}
