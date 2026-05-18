/**
 * Bank Details Change Request Component
 * Allows employees to submit requests to change their bank details
 */
import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { NigerianBanksService, NigerianBank } from '../../../service/nigerian-banks.service';
import { ProfileChangeRequestDTO, RequestDTO } from '../../../service/models/profile-change-request.model';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { HrNotificationListenerService, HrBankChangeNotification } from '../../../service/hr-notification-listener.service';

@Component({
  selector: 'app-bank-details-change-request',
  templateUrl: './bank-details-change-request.component.html',
  styleUrl: './bank-details-change-request.component.scss',
  providers: [MessageService]
})
export class BankDetailsChangeRequestComponent implements OnInit {
  @Output() requestSubmitted = new EventEmitter<ProfileChangeRequestDTO>();

  bankDetailsForm!: FormGroup;
  banks: NigerianBank[] = [];
  filteredBanks: NigerianBank[] = [];
  isSubmitting = false;
  currentBankDetails: any = null;

  constructor(
    private fb: FormBuilder,
    private bankService: NigerianBanksService,
    private messageService: MessageService,
    private mailNotificationService: MailNotificationService,
    private hrNotificationService: HrNotificationListenerService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadBanks();
    this.loadCurrentBankDetails();
  }

  /**
   * Initialize the form with validation
   */
  private initializeForm(): void {
    this.bankDetailsForm = this.fb.group({
      currentBankName: ['', Validators.required],
      currentAccountNumber: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
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
    const storedData = localStorage.getItem('employeeProfile');
    if (storedData) {
      try {
        const profile = JSON.parse(storedData);
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
      this.messageService.add({
        severity: 'error',
        summary: 'Validation Error',
        detail: 'Please fill in all required fields correctly',
        life: 5000
      });
      return;
    }

    this.isSubmitting = true;

    const formValue = this.bankDetailsForm.value;
    const changeRequest: ProfileChangeRequestDTO = {
      employeeId: this.getCurrentEmployeeId(),
      requestType: 'change',
      fieldChangeType: 'bank',
      request: [
        {
          fieldName: 'bankName',
          oldValue: formValue.currentBankName,
          value: formValue.newBankName
        },
        {
          fieldName: 'accountNumber',
          oldValue: formValue.currentAccountNumber,
          value: formValue.newAccountNumber
        }
      ],
      reason: formValue.reason,
      status: 'pending',
      submittedDate: new Date()
    };

    // Save to local storage temporarily (until backend is ready)
    this.saveRequestToLocalStorage(changeRequest);

    // Emit the request to parent component
    this.requestSubmitted.emit(changeRequest);

    // Send notification to admin via email and in-app
    this.sendNotificationsToAdmin(changeRequest);

    this.messageService.add({
      severity: 'success',
      summary: 'Request Submitted',
      detail: 'Your bank details change request has been submitted successfully. HR will review it soon.',
      life: 5000
    });

    // Reset form
    this.bankDetailsForm.reset();
    this.loadCurrentBankDetails();
    this.isSubmitting = false;
  }

  /**
   * Send notifications to admin about the change request
   */
  private sendNotificationsToAdmin(changeRequest: ProfileChangeRequestDTO): void {
    const employeeName = this.getCurrentEmployeeName();
    const employeeEmail = this.getCurrentEmployeeEmail();
    const hrEmail = sessionStorage.getItem('useremail') || 'hr@optimaxsuites.com';

    // Send email notification
    const emailBody = {
      name: employeeName,
      recieverEmail: hrEmail,
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

    // Send email
    this.mailNotificationService.sendMail(emailBody).subscribe({
      next: () => {
        console.log('Email notification sent to HR');
      },
      error: (err) => {
        console.error('Error sending email notification:', err);
      }
    });

    // Trigger in-app notification for HR
    const notification: HrBankChangeNotification = {
      type: 'bank_change_request',
      employeeName: employeeName,
      employeeId: String(changeRequest.employeeId),
      requestedBankName: changeRequest.request[0]?.value,
      requestedAccountNumber: changeRequest.request[1]?.value,
      recipientEmail: hrEmail,
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
    return sessionStorage.getItem('username') || 'Unknown Employee';
  }

  /**
   * Get current employee email from session
   */
  private getCurrentEmployeeEmail(): string {
    return sessionStorage.getItem('useremail') || 'employee@optimaxsuites.com';
  }

  /**
   * Save request to local storage temporarily
   */
  private saveRequestToLocalStorage(request: ProfileChangeRequestDTO): void {
    try {
      const existingRequests = this.getRequestsFromLocalStorage();
      existingRequests.push(request);
      localStorage.setItem('profileChangeRequests', JSON.stringify(existingRequests));
    } catch (error) {
      console.error('Error saving request to local storage:', error);
    }
  }

  /**
   * Get all requests from local storage
   */
  getRequestsFromLocalStorage(): ProfileChangeRequestDTO[] {
    try {
      const data = localStorage.getItem('profileChangeRequests');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error retrieving requests from local storage:', error);
      return [];
    }
  }

  /**
   * Get current employee ID (placeholder - implement with actual auth service)
   */
  private getCurrentEmployeeId(): number {
    // TODO: Replace with actual employee ID from auth service
    return parseInt(localStorage.getItem('employeeId') || '0', 10);
  }

  /**
   * Cancel and reset form
   */
  cancelRequest(): void {
    if (this.bankDetailsForm.dirty) {
      const confirmation = confirm('Are you sure you want to cancel? Any unsaved changes will be lost.');
      if (confirmation) {
        this.bankDetailsForm.reset();
        this.loadCurrentBankDetails();
      }
    }
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
}
