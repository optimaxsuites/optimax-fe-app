import { Component, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { MessageService } from 'primeng/api';
import { EmployeeService } from '../../../service/employee.service';
import { ErrorMessageService } from '../../../shared-component/service/error-message/error-message.service';
// const crypto = require('crypto');

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
  /** Set once a response has been recorded; the page then shows a thank-you instead of the forms. */
  responded: 'confirmed' | 'declined' | null = null;
  securityState: 'checking' | 'valid' | 'missing' | 'invalid' | 'expired' | 'error' = 'checking';
  securityTitle = '';
  securityDetail = '';
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
      const securityParam = params.get('security') || '';
      const expiry = params.get('exp') || '';
      this.securityState = 'checking';
      this.securityTitle = '';
      this.securityDetail = '';
      this.acknowledgment = null;
      this.responded = null;
      if (nameFromParam) {
        this.employeeName = nameFromParam.split('-').join(' ');
      }
      if (this.mediaNo) {
        // this.fetchEmployee(this.uuid);
        this.getEmployeesProfilePhotoUrl(this.mediaNo);
      }

      void this.decodeSecurity(expiry, securityParam);
    });

    // this.route.queryParamMap.subscribe((params) => {
    //   const employeeFromQuery = params.get('employee') || '';
    //   if (employeeFromQuery) {
    //     this.employeeName = employeeFromQuery;
    //   }
    // });
  }

  async decodeSecurity(expiry: any, securityParam: string) {
    if (!securityParam) {
      this.securityState = 'missing';
      this.securityTitle = 'Invalid link';
      this.securityDetail =
        'This confirmation link is missing security information. Please inform the person who nominated you to request a revised link on your behalf.';
      this.messageService.add({
        severity: 'error',
        summary: this.securityTitle,
        detail: this.securityDetail,
        key: 'global',
        life: 4000,
      });
      return false;
    }

    const expiryTimestamp = parseInt(`${expiry ?? ''}`, 10);
    if (!Number.isFinite(expiryTimestamp)) {
      this.securityState = 'missing';
      this.securityTitle = 'Invalid link';
      this.securityDetail =
        'We could not validate this confirmation link due to an unexpected error. Please inform the person who nominated you to request a revised link on your behalf.';
      this.messageService.add({
        severity: 'error',
        summary: this.securityTitle,
        detail: this.securityDetail,
        key: 'global',
        life: 4000,
      });
      return false;
    }

    try {
      if (!window?.crypto?.subtle) {
        this.securityState = 'error';
        this.securityTitle = 'Security check not supported';
        this.securityDetail =
          'Your browser does not support the required security checks. Please try a modern browser or inform the person who nominated you to request a revised link on your behalf.';
        this.messageService.add({
          severity: 'error',
          summary: this.securityTitle,
          detail: this.securityDetail,
          key: 'global',
          life: 4000,
        });
        return false;
      }

      const encoder = new TextEncoder();
      const keyData = encoder.encode('10esCTg2bhOloagm5XE9WEXukzUOaivZzFLxc/cyVP8=');
      const key = await window.crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      const sign = async (message: string) => {
        const signatureBuffer = await window.crypto.subtle.sign('HMAC', key, encoder.encode(message));
        return Array.from(new Uint8Array(signatureBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
      };

      // The link is signed outside this app, so the name part is matched every way it may have
      // been built: the first two words (the original check), every word, or first + last word.
      // Checking only the first two words failed every three-part name.
      const words = (this.employeeName || '').trim().split(/\s+/).filter(Boolean);
      const nameVariants = Array.from(new Set([
        words.slice(0, 2).join(''),
        words.join(''),
        words.length > 1 ? `${words[0]}${words[words.length - 1]}` : words.join(''),
      ]));
      let status = false;
      for (const name of nameVariants) {
        if (await sign(`${this.uuid}${name}${this.mediaNo}${expiryTimestamp}`) === securityParam) {
          status = true;
          break;
        }
      }
      const now = Math.floor(Date.now() / 1000);
      const isExpired = now > expiryTimestamp;

      if (!status) {
        this.securityState = 'invalid';
        this.securityTitle = 'Invalid link';
        this.securityDetail =
          'The confirmation link appears to be invalid or has been tampered with. Please inform the person who nominated you to request a revised link on your behalf.';
        this.messageService.add({
          severity: 'error',
          summary: this.securityTitle,
          detail: this.securityDetail,
          key: 'global',
          life: 4000,
        });
        return false;
      }

      if (isExpired) {
        this.securityState = 'expired';
        this.securityTitle = 'Expired link';
        this.securityDetail = 'This confirmation link has expired.';
        this.messageService.add({
          severity: 'error',
          summary: this.securityTitle,
          detail: this.securityDetail,
          key: 'global',
          life: 4000,
        });
        return false;
      }

      this.securityState = 'valid';
      return true;
    } catch (error) {
      this.securityState = 'error';
      this.securityTitle = 'Unable to validate link';
      this.securityDetail =
        'We could not validate this confirmation link due to an unexpected error. Please inform the person who nominated you to request a revised link on your behalf.';
      this.messageService.add({
        severity: 'error',
        summary: this.securityTitle,
        detail: this.securityDetail,
        key: 'global',
        life: 4000,
      });
      console.error('Error decoding security parameter:', error);
      return false;
    }
  }

  onFileChange(event: Event, controlName: 'signature' | 'passportPhoto' | 'idCard') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.form.get(controlName)?.setValue(input.files[0] as File);
      this.form.get(controlName)?.updateValueAndValidity();
    }
  }

  chooseAcknowledgment(value: 'yes' | 'no') {
    if (this.securityState !== 'valid') {
      return;
    }
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
    if (this.responded || this.submitting) return;
    if (this.securityState !== 'valid') {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid link',
        detail: 'Please use a valid confirmation link to continue.',
        key: 'global',
        life: 4000,
      });
      return;
    }
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
        this.responded = 'confirmed';
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
    if (this.responded || this.submitting) return;
    if (this.securityState !== 'valid') {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid link',
        detail: 'Please use a valid confirmation link to continue.',
        key: 'global',
        life: 4000,
      });
      return;
    }
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
    // The link's uuid is the employee's id (it's what fetchEmployee() looks them up by), so the
    // decline is tied to the employee even though their record isn't loaded on this page.
    const employeeId = this.employeeInView?.id ?? this.uuid;
    if (employeeId) formData.append('employeeId', `${employeeId}`);
    if (this.employeeInView?.email) formData.append('employeeEmail', this.employeeInView.email);
    formData.append('guarantorName', this.declineForm.get('fullName')?.value || '');
    formData.append('guarantorEmail', this.declineForm.get('email')?.value || '');

    this.employeeService.submitGuarantorConfirmation(formData).subscribe({
      next: () => {
        this.submitting = false;
        this.responded = 'declined';
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
