import { Component, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
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
export class GuarantorConfirmationComponent implements OnDestroy {
  token = '';
  uuid = '';
  employeeName = '';
  mediaNo = '';
  employeeInView: any;
  acknowledgment: 'yes' | 'no' | null = null;
  readonly defaultEmployeeProfilePhotoUrl =
    'https://media.istockphoto.com/id/1223671392/vector/default-profile-picture-avatar-photo-placeholder-vector-illustration.jpg?s=612x612&w=0&k=20&c=s0aTdmT5aU6b8ot7VKm11DeID6NctRCpB755rA1BIP0=';
  employeeProfilePhotoUrl: SafeUrl | string = this.defaultEmployeeProfilePhotoUrl;
  employeeImageSrc: SafeUrl | string = this.defaultEmployeeProfilePhotoUrl;
  loadingEmployee = false;
  imageLoading = true;
  submitting = false;
  form!: FormGroup;
  declineForm!: FormGroup;
  private employeeImageObjectUrl: string | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private employeeService: EmployeeService,
    private messageService: MessageService,
    private errorMessageService: ErrorMessageService,
    private sanitizer: DomSanitizer
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required]],
      confirm: [false, [Validators.requiredTrue]],
      signature: [null as File | null, [Validators.required]],
      passportPhoto: [null as File | null, [Validators.required]],
      idCard: [null as File | null, [Validators.required]],
    });
    this.declineForm = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
    });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.token = params.get('token') || '';
      this.uuid = params.get('uuid') || '';
      this.mediaNo = params.get('mediaNO') || '';
      const nameFromParam = params.get('name') || '';
      if (nameFromParam) {
        this.employeeName = nameFromParam.split('-').join(' ');
      }
      if (this.mediaNo) {
        // this.fetchEmployee(this.uuid);
        this.getEmployeesProfilePhotoUrl(this.mediaNo);
      }

      
    });

    // this.route.queryParamMap.subscribe((params) => {
    //   const employeeFromQuery = params.get('employee') || '';
    //   if (employeeFromQuery) {
    //     this.employeeName = employeeFromQuery;
    //   }
    // });
  }

  onFileChange(event: Event, controlName: 'signature' | 'passportPhoto' | 'idCard') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.form.get(controlName)?.setValue(input.files[0] as File);
      this.form.get(controlName)?.updateValueAndValidity();
    }
  }

  chooseAcknowledgment(value: 'yes' | 'no') {
    this.acknowledgment = value;
  }

  onEmployeeImageLoad(): void {
    this.imageLoading = false;
  }

  onEmployeeImageError(): void {
    this.releaseEmployeeImageObjectUrl();
    if (this.employeeImageSrc !== this.defaultEmployeeProfilePhotoUrl) {
      this.setEmployeeImage(this.defaultEmployeeProfilePhotoUrl);
      return;
    }

    this.imageLoading = false;
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

  submitDecline(): void {
    if (!this.token) {
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Invalid or missing confirmation link.', key: 'global', life: 4000 });
      return;
    }

    this.declineForm.markAllAsTouched();
    if (this.declineForm.invalid) return;

    this.submitting = true;

    const formData = new FormData();
    formData.append('token', this.token);
    formData.append('acknowledgment', 'false');
    if (this.employeeName) formData.append('employeeName', this.employeeName);
    if (this.employeeInView?.id) formData.append('employeeId', `${this.employeeInView.id}`);
    if (this.employeeInView?.email) formData.append('employeeEmail', this.employeeInView.email);
    formData.append('guarantorName', this.declineForm.get('fullName')?.value || '');
    formData.append('guarantorEmail', this.declineForm.get('email')?.value || '');

    this.employeeService.submitGuarantorConfirmation(formData).subscribe({
      next: () => {
        this.submitting = false;
        this.messageService.add({ severity: 'success', summary: 'Thank you', detail: 'Your response has been recorded.', key: 'global', life: 4000 });
        this.declineForm.reset();
      },
      error: (err) => {
        this.submitting = false;
        const detail = this.errorMessageService.getUserMessage(
          err,
          'Failed to submit response. Please try again.'
        );
        this.messageService.add({ severity: 'error', summary: 'Error', detail, key: 'global', life: 4000 });
      }
    });
  }

  ngOnDestroy(): void {
    this.releaseEmployeeImageObjectUrl();
  }

  private fetchEmployee(id: string): void {
    this.loadingEmployee = true;
    this.imageLoading = true;
    this.employeeService.getEmployeeById(id).subscribe({
      next: (response) => {
        const employee = response?.data ?? response ?? null;
        this.employeeInView = employee;
        const fullName = `${employee?.lastName || ''} ${employee?.firstName || ''}`.trim();
        if (fullName) {
          this.employeeName = fullName;
        }
        if (employee?.imageUrl) {
          this.employeeProfilePhotoUrl = employee.imageUrl;
          this.setEmployeeImage(employee.imageUrl);
        }
        const mediaNo = employee?.employeeMedia?.mediaNo;
        if (mediaNo) {
          this.getEmployeesProfilePhotoUrl(mediaNo);
        } else if (!employee?.imageUrl) {
          this.setEmployeeImage(this.defaultEmployeeProfilePhotoUrl);
        }
      },
      error: () => {
        this.setEmployeeImage(this.defaultEmployeeProfilePhotoUrl);
        this.messageService.add({
          severity: 'warn',
          summary: 'Employee not found',
          detail: 'Unable to load employee details from the confirmation link.',
          key: 'global',
          life: 4000,
        });
      },
      complete: () => {
        this.loadingEmployee = false;
      },
    });
  }

  private getEmployeesProfilePhotoUrl(filename: string) {
    this.employeeService.getEmployeeImage(filename).subscribe({
      next: (response) => {
        const blob = new Blob([response], { type: 'image/png' });
        this.releaseEmployeeImageObjectUrl();
        this.employeeImageObjectUrl = URL.createObjectURL(blob);
        this.employeeProfilePhotoUrl = this.sanitizer.bypassSecurityTrustUrl(
          this.employeeImageObjectUrl
        );
        if (this.employeeInView) {
          this.employeeInView.imageUrl = this.employeeProfilePhotoUrl;
        }
        this.setEmployeeImage(this.employeeProfilePhotoUrl);
      },
      error: () => {
        this.employeeProfilePhotoUrl = this.defaultEmployeeProfilePhotoUrl;
        this.setEmployeeImage(this.defaultEmployeeProfilePhotoUrl);
      },
    });
  }

  private setEmployeeImage(src: SafeUrl | string | null | undefined): void {
    this.imageLoading = true;
    this.employeeImageSrc = src || this.defaultEmployeeProfilePhotoUrl;
  }

  private releaseEmployeeImageObjectUrl(): void {
    if (!this.employeeImageObjectUrl) {
      return;
    }

    URL.revokeObjectURL(this.employeeImageObjectUrl);
    this.employeeImageObjectUrl = null;
  }
}
