import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EmployeeService } from '../../../service/employee.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';

@Component({
  selector: 'app-guarantor-confirmation',
  templateUrl: './guarantor-confirmation.component.html',
  styleUrl: './guarantor-confirmation.component.scss'
})
export class GuarantorConfirmationComponent {
  token = '';
  employeeName = '';
  submitting = false;
  form!: FormGroup



  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private messageService: MessageService,
    private errorMessageService: ErrorMessageService
  ) {
    this.token = this.route.snapshot.paramMap.get('token') || '';
    this.employeeName = this.route.snapshot.queryParamMap.get('employee') || '';
       this.form = this.fb.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required]],
    confirm: [false, [Validators.requiredTrue]],
    signature: [null as File | null, [Validators.required]],
    passportPhoto: [null as File | null, [Validators.required]],
    idCard: [null as File | null, [Validators.required]],
    
  });

  }


  onFileChange(event: Event, controlName: 'signature' | 'passportPhoto' | 'idCard') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.form.get(controlName)?.setValue(input.files[0] as File);
      this.form.get(controlName)?.updateValueAndValidity();
    }
  }

  submit(): void {
    if (!this.token) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid or missing confirmation link.', key: 'global', life: 4000 });
      return;
    }

    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting = true;

    const formData = new FormData();
    formData.append('token', this.token);
    if (this.employeeName) formData.append('employeeName', this.employeeName);
    formData.append('fullName', this.form.get('fullName')?.value || '');
    formData.append('email', this.form.get('email')?.value || '');
    formData.append('phone', this.form.get('phone')?.value || '');
    formData.append('confirm', this.form.get('confirm')?.value ? 'true' : 'false');

    const signature = this.form.get('signature')?.value as File | null;
    const passportPhoto = this.form.get('passportPhoto')?.value as File | null;
    const idCard = this.form.get('idCard')?.value as File | null;

    if (signature) formData.append('signature', signature);
    if (passportPhoto) formData.append('passportPhoto', passportPhoto);
    if (idCard) formData.append('idCard', idCard);

    this.employeeService.submitGuarantorConfirmation(formData).subscribe({
      next: () => {
        this.submitting = false;
        this.messageService.add({ severity: 'success', summary: 'Thank you', detail: 'Your confirmation has been submitted successfully.', key: 'global', life: 4000 });
        this.form.reset();
      },
      error: (err) => {
        this.submitting = false;
        const detail = this.errorMessageService.getUserMessage(
          err,
          'Failed to submit confirmation. Please try again.'
        );
        this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'global', life: 4000 });
      }
    });
  }
}
