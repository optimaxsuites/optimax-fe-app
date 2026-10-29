/**
 * Bank Details Change Request Component
 * Allows employees to submit requests to change their bank details
 */
import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NigerianBanksService, NigerianBank } from '../../../service/nigerian-banks.service';
import { ProfileChangeRequestService } from '../../../service/profile-change-request.service';
import { ProfileChangeRequestDTO } from '../../../model/profile-change-request.model';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { HrNotificationListenerService, HrBankChangeNotification } from '../../../service/hr-notification-listener.service';
import { EmployeeService } from '../../../service/employee.service';
import { SelectedEmployeeStore } from '../../employee-management/selected-employee.store';

@Component({
  selector: 'app-bank-details-change-request',
  templateUrl: './bank-details-change-request.component.html',
  styleUrl: './bank-details-change-request.component.scss',
  providers: [MessageService]
})
export class BankDetailsChangeRequestComponent implements OnInit, OnChanges {
  @Input() employee: any | null = null;
  @Output() requestSubmitted = new EventEmitter<ProfileChangeRequestDTO>();

  bankDetailsForm!: FormGroup;
  banks: NigerianBank[] = [];
  filteredBanks: NigerianBank[] = [];
  isSubmitting = false;
  currentBankDetails: any = null;

  constructor(
    private fb: FormBuilder,
    private bankService: NigerianBanksService,
    private profileChangeRequestService: ProfileChangeRequestService,
    private messageService: MessageService,
    private mailNotificationService: MailNotificationService,
    private hrNotificationService: HrNotificationListenerService,
    private employeeService: EmployeeService,
    private selectedEmployee: SelectedEmployeeStore
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadBanks();
    this.loadCurrentBankDetails();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['employee'] && this.bankDetailsForm) {
      this.loadCurrentBankDetails();
    }
  }

  /**
   * Initialize the form with validation
   */
  private initializeForm(): void {
    this.bankDetailsForm = this.fb.group({
      currentBankName: [''],
      currentAccountNumber: [''],
      newBankName: ['', Validators.required],
      newAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      confirmAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      reason: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]]
    }, { validators: this.accountNumberMatchValidator });
  }

  /**
   * Custom validator to ensure new account numbers match
   */
  private accountNumberMatchValidator(group: FormGroup): { [key: string]: any } | null {
    const newAccountNumber = group.get('newAccountNumber')?.value;
    const confirmAccountNumber = group.get('confirmAccountNumber')?.value;

    if (newAccountNumber && confirmAccountNumber && newAccountNumber !== confirmAccountNumber) {
      return { 'accountMismatch': true };
    }
    return null;
  }

  /**
   * Load all available Nigerian banks
   */
  private loadBanks(): void {
    this.banks = this.bankService.getBanks();
    this.filteredBanks = this.banks;
  }

  /**
   * Load current bank details from local storage or component state
   */
  private loadCurrentBankDetails(): void {
    const profile = this.employee || this.getStoredEmployeeProfile();
    if (profile) {
      try {
        this.currentBankDetails = {
          bankName: profile.bankName || '',
          accountNumber: profile.accountNumber || ''
        };
        this.bankDetailsForm.patchValue({
          currentBankName: this.currentBankDetails.bankName,
          currentAccountNumber: this.currentBankDetails.accountNumber
        });
      } catch (error) {
        console.error('Error loading employee profile:', error);
      }
    }
  }

  /**
   * Filter banks based on search input
   */
  onBankSearch(event: any): void {
    const query = event.query || '';
    if (query.length > 0) {
      this.filteredBanks = this.bankService.searchBanks(query);
    } else {
      this.filteredBanks = this.banks;
    }
  }

  /**
   * Validate account number format
   */
  validateAccountNumber(fieldName: string): void {
    const control = this.bankDetailsForm.get(fieldName);
    if (control && control.value) {
      if (!this.bankService.validateAccountNumber(control.value)) {
        control.setErrors({ 'invalidAccountNumber': true });
      }
    }
  }

  /**
   * Submit the bank details change request
   */
  submitRequest(): void {
    if (!this.bankDetailsForm.valid) {
      this.bankDetailsForm.markAllAsTouched();
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        key: 'tl',
        life: 5000
      });
      return;
    }

    this.isSubmitting = true;

    const formValue = this.bankDetailsForm.value;
    const currentBank = {
      bankName: formValue.currentBankName || this.currentBankDetails?.bankName || '',
      accountNumber: formValue.currentAccountNumber || this.currentBankDetails?.accountNumber || ''
    };
    const requestedBank = {
      bankName: this.normalizeBankName(formValue.newBankName),
      accountNumber: formValue.newAccountNumber
    };

    this.profileChangeRequestService.submitBankChangeRequest(
      this.getCurrentEmployeeId(),
      this.getCurrentEmployeeName(),
      currentBank,
      requestedBank,
      formValue.reason,
      this.getCurrentEmployeeEmail()
    ).subscribe({
      next: (changeRequest) => {
        this.requestSubmitted.emit(changeRequest);
        this.sendRequestNotifications(changeRequest);

        this.messageService.add({
          severity: 'success',
          summary: 'Request Submitted',
          detail: 'Your bank details change request has been submitted successfully. HR will review it soon.',
          key: 'tl',
          life: 5000
        });

        this.bankDetailsForm.reset();
        this.loadCurrentBankDetails();
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error submitting bank details change request:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Submission Failed',
          detail: 'Unable to submit bank details change request. Please try again.',
          key: 'tl',
          life: 5000
        });
        this.isSubmitting = false;
      }
    });
  }

  private sendRequestNotifications(changeRequest: ProfileChangeRequestDTO): void {
    this.sendNotificationToEmployee(changeRequest);
    this.sendNotificationsToHrAdmins(changeRequest);
  }

  private sendNotificationToEmployee(changeRequest: ProfileChangeRequestDTO): void {
    const employeeName = this.getCurrentEmployeeName();
    const employeeEmail = this.getCurrentEmployeeEmail();

    if (!employeeEmail) {
      return;
    }

    const emailBody = {
      name: employeeName,
      recieverEmail: employeeEmail,
      subject: 'Bank Details Change Request Received',
      body: `
        <h2>Bank Details Change Request Received</h2>
        <p>Dear ${employeeName},</p>
        <p>Your bank details change request has been submitted and is awaiting HR review.</p>
        <h3>Requested Details:</h3>
        <p><strong>Requested Bank:</strong> ${changeRequest.request[0]?.value}</p>
        <p><strong>Requested Account Number:</strong> ****${(changeRequest.request[1]?.value || '').slice(-4)}</p>
        <p><strong>Reason for Change:</strong> ${changeRequest.reason || 'Not provided'}</p>
        <p><strong>Submitted Date:</strong> ${new Date(changeRequest.submittedDate || '').toLocaleString()}</p>
        <p>You will receive another notification when HR approves or rejects this request.</p>
      `
    };

    this.mailNotificationService.sendMail(emailBody).subscribe({
      next: () => {
        console.log('Bank change request confirmation email sent to employee');
      },
      error: (err) => {
        console.error('Error sending employee confirmation email:', err);
      }
    });
  }

  /**
   * Send notifications to HR/admin employees about the change request.
   */
  private sendNotificationsToHrAdmins(changeRequest: ProfileChangeRequestDTO): void {
    const employeeName = this.getCurrentEmployeeName();
    const employeeEmail = this.getCurrentEmployeeEmail();

    this.employeeService.getAllEmployee().subscribe({
      next: (employees) => {
        const recipientEmails = this.getHrAdminEmails(employees);

        if (recipientEmails.length === 0) {
          const fallbackEmail = sessionStorage.getItem('useremail') || 'hr@optimaxsuites.com';
          recipientEmails.push(fallbackEmail);
        }

        recipientEmails.forEach((recipientEmail) => {
          this.sendHrAdminEmail(changeRequest, employeeName, employeeEmail, recipientEmail);
        });

        this.publishHrInAppNotification(changeRequest, employeeName, recipientEmails[0]);
      },
      error: (error) => {
        console.error('Error loading employees for HR notification recipients:', error);
        const fallbackEmail = sessionStorage.getItem('useremail') || 'hr@optimaxsuites.com';
        this.sendHrAdminEmail(changeRequest, employeeName, employeeEmail, fallbackEmail);
        this.publishHrInAppNotification(changeRequest, employeeName, fallbackEmail);
      }
    });
  }

  private sendHrAdminEmail(
    changeRequest: ProfileChangeRequestDTO,
    employeeName: string,
    employeeEmail: string,
    recipientEmail: string
  ): void {
    const emailBody = {
      name: employeeName,
      recieverEmail: recipientEmail,
      subject: `New Bank Details Change Request from ${employeeName}`,
      body: `
        <h2>New Bank Details Change Request</h2>
        <p><strong>Employee Name:</strong> ${employeeName}</p>
        <p><strong>Employee Email:</strong> ${employeeEmail}</p>
        <p><strong>Current Bank:</strong> ${changeRequest.request[0]?.oldValue}</p>
        <p><strong>Requested Bank:</strong> ${changeRequest.request[0]?.value}</p>
        <p><strong>Current Account Number:</strong> ****${(changeRequest.request[1]?.oldValue || '').slice(-4)}</p>
        <p><strong>Requested Account Number:</strong> ****${(changeRequest.request[1]?.value || '').slice(-4)}</p>
        <p><strong>Reason for Change:</strong> ${changeRequest.reason || 'Not provided'}</p>
        <p><strong>Submitted Date:</strong> ${new Date(changeRequest.submittedDate || '').toLocaleString()}</p>
        <p>Please review this request in the HR management portal.</p>
      `
    };

    this.mailNotificationService.sendMail(emailBody).subscribe({
      next: () => {
        console.log(`Bank change request notification sent to HR/admin: ${recipientEmail}`);
      },
      error: (err) => {
        console.error(`Error sending HR/admin notification to ${recipientEmail}:`, err);
      }
    });
  }

  private publishHrInAppNotification(
    changeRequest: ProfileChangeRequestDTO,
    employeeName: string,
    recipientEmail: string
  ): void {
    const notification: HrBankChangeNotification = {
      type: 'bank_change_request',
      employeeName: employeeName,
      employeeId: String(changeRequest.employeeId),
      requestedBankName: changeRequest.request[0]?.value,
      requestedAccountNumber: changeRequest.request[1]?.value,
      recipientEmail,
      timestamp: new Date().toISOString()
    };

    this.hrNotificationService.addNotification(notification);

    // Dispatch custom event for other components listening to notifications
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('hr-bank-change-notification', {
        detail: notification,
        bubbles: true,
        cancelable: true
      });
      window.dispatchEvent(event);
    }
  }

  /**
   * Get current employee name from session
   */
  private getCurrentEmployeeName(): string {
    const fullName = `${this.employee?.firstName || ''} ${this.employee?.lastName || ''}`.trim();
    return fullName || this.employee?.name || sessionStorage.getItem('username') || 'Unknown Employee';
  }

  /**
   * Get current employee email from session
   */
  private getCurrentEmployeeEmail(): string {
    return this.employee?.workEmail || this.employee?.email || sessionStorage.getItem('useremail') || 'employee@optimaxsuites.com';
  }

  /**
   * Get current employee ID (placeholder - implement with actual auth service)
   */
  private getCurrentEmployeeId(): string | number {
    return this.employee?.id || localStorage.getItem('employeeId') || sessionStorage.getItem('userid') || localStorage.getItem('userid') || '0';
  }

  /**
   * Cancel and reset form
   */
  cancelRequest(): void {
    this.bankDetailsForm.reset();
    this.loadCurrentBankDetails();
  }

  /**
   * Get form control for template
   */
  getControl(name: string) {
    return this.bankDetailsForm.get(name);
  }

  /**
   * Check if field has error
   */
  hasError(fieldName: string, errorType: string): boolean {
    const control = this.getControl(fieldName);
    return !!(control && control.hasError(errorType) && (control.dirty || control.touched));
  }

  private normalizeBankName(value: string | NigerianBank): string {
    return typeof value === 'string' ? value : value?.name || '';
  }

  private getHrAdminEmails(employees: any[]): string[] {
    const emails = new Set<string>();

    employees
      .filter((employee) => this.isHrAdminEmployee(employee))
      .forEach((employee) => {
        const email = this.getEmployeeWorkEmail(employee);
        if (email) {
          emails.add(email);
        }
      });

    return Array.from(emails);
  }

  private isHrAdminEmployee(employee: any): boolean {
    const title = String(employee?.jobTitle?.name || employee?.jobTitle || '').toLowerCase();
    return title.includes('admin')
      || title.includes('human resource')
      || title.includes('administration');
  }

  private getEmployeeWorkEmail(employee: any): string {
    return String(employee?.workEmail || employee?.email || '').trim();
  }

  private getStoredEmployeeProfile(): any | null {
    const selected = this.selectedEmployee.get();
    if (selected) return selected;
    const keys = ['currentEmployee', 'employeeProfile'];
    for (const key of keys) {
      const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (!stored) continue;
      try {
        return JSON.parse(stored);
      } catch {
        continue;
      }
    }
    return null;
  }
}
