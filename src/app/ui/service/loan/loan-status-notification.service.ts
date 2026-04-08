import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { MailNotificationService } from '../mailNotification.service';
import { EmployeeService } from '../employee.service';
import { LoanApplication, LoanStatus } from './loan.types';
import { formatLoanPaymentModeDisplay, formatLoanRepaymentDayDisplay, formatLoanPurposeDisplay } from './loan-display.util';
import { CooperativeLoan } from '../../domain/loan/cooperative-loan.dto';
import { CooperativeMember } from './cooperative-loan/cooperative.types';

@Injectable({
  providedIn: 'root'
})
export class LoanStatusNotificationService {
  private readonly forcedStatusRecipientEmail = 'eseosehodion@gmail.com';

  constructor(
    private employeeService: EmployeeService,
    private mailNotificationService: MailNotificationService
  ) {}

  notifyStatusChange(application: LoanApplication, previousStatus?: LoanStatus | null): Observable<null> {
    if (!application?.employeeId || !application?.status) {
      console.warn('[LoanStatusEmail] Skipped before send because application is incomplete', {
        loanId: application?.id,
        employeeId: application?.employeeId,
        status: application?.status
      });
      return of(null);
    }

    console.log('[LoanStatusEmail] Preparing status email', {
      loanId: application.id,
      loanCode: application.loanCode,
      employeeId: application.employeeId,
      currentStatus: application.status,
      previousStatus: previousStatus || null
    });

    return this.resolveEmployeeForLoan(application).pipe(
      switchMap((employee) => {
        const resolvedEmployeeEmail = String(
          employee?.email || employee?.workEmail || employee?.user?.email || ''
        ).trim();
        const recipientEmail = this.getStatusRecipientEmail(resolvedEmployeeEmail);

        console.log('[LoanStatusEmail] Resolved employee recipient', {
          loanId: application.id,
          employeeId: application.employeeId,
          employeeRecordId: employee?.id || employee?.employeeId || null,
          employeeName: [employee?.firstName, employee?.lastName].filter(Boolean).join(' ') || employee?.fullName || application.fullName || null,
          recipientEmail: recipientEmail || null,
          forcedRecipientEmail: this.forcedStatusRecipientEmail,
          availableEmails: {
            email: employee?.email || null,
            workEmail: employee?.workEmail || null,
            userEmail: employee?.user?.email || null
          }
        });

        if (!recipientEmail) {
          console.warn('Loan status email skipped: employee email not found', application.employeeId);
          return of(null);
        }

        const employeeFirstName = String(employee?.firstName || application.fullName || 'there')
          .trim()
          .split(' ')
          .filter(Boolean)[0] || 'there';

        const mailBody = {
          name: `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || application.fullName || 'Employee',
          recieverEmail: recipientEmail,
          subject: this.buildSubject(application, previousStatus),
          body: this.buildBody(application, employeeFirstName, previousStatus)
        };

        return this.mailNotificationService.sendMail(mailBody).pipe(
          map(() => null),
          catchError((error) => {
            console.error('[LoanStatusEmail] Send failed', {
              loanId: application.id,
              employeeId: application.employeeId,
              recipientEmail,
              error
            });
            return of(null);
          })
        );
      }),
      catchError((error) => {
        console.error('[LoanStatusEmail] Employee lookup failed', {
          loanId: application.id,
          employeeId: application.employeeId,
          error
        });
        return of(null);
      })
    );
  }

  private resolveEmployeeForLoan(application: LoanApplication): Observable<any> {
    return this.employeeService.getEmployeeById(application.employeeId).pipe(
      switchMap((employee) => {
        console.log('[LoanStatusEmail] Primary employee lookup result', {
          loanId: application.id,
          employeeId: application.employeeId,
          found: !!employee,
          employeeRecordId: employee?.id || employee?.employeeId || null,
          hasRecipientEmail: this.hasRecipientEmail(employee)
        });

        if (this.hasRecipientEmail(employee)) {
          return of(employee);
        }

        return this.findEmployeeFromDirectory(application, employee);
      }),
      catchError((error) => {
        console.warn('[LoanStatusEmail] Primary employee lookup failed, falling back to directory search', {
          loanId: application.id,
          employeeId: application.employeeId,
          error
        });
        return this.findEmployeeFromDirectory(application);
      })
    );
  }

  private findEmployeeFromDirectory(application: LoanApplication, preferredMatch?: any): Observable<any> {
    return this.employeeService.getAllEmployee().pipe(
      map((employees) => {
        const matchedEmployee = this.matchEmployeeRecord(employees || [], application, preferredMatch);
        console.log('[LoanStatusEmail] Directory lookup evaluated', {
          loanId: application.id,
          employeeId: application.employeeId,
          totalEmployees: Array.isArray(employees) ? employees.length : 0,
          preferredMatchRecordId: preferredMatch?.id || preferredMatch?.employeeId || null,
          matchedEmployeeRecordId: matchedEmployee?.id || matchedEmployee?.employeeId || null,
          matchedRecipientEmail: matchedEmployee?.email || matchedEmployee?.workEmail || matchedEmployee?.user?.email || null
        });
        if (!matchedEmployee) {
          throw new Error(`No employee directory match for loan employee identifier ${application.employeeId}`);
        }

        return matchedEmployee;
      })
    );
  }

  private matchEmployeeRecord(employees: any[], application: LoanApplication, preferredMatch?: any): any | null {
    const normalizedLoanEmployeeId = String(application.employeeId || '').trim();
    const normalizedLoanEmployeeName = this.normalizeValue(application.fullName || '');

    const candidates = preferredMatch ? [preferredMatch, ...employees] : employees;

    return candidates.find((employee) => {
      const identifiers = [
        employee?.id,
        employee?.userId,
        employee?.user?.id,
        employee?.employeeId,
        employee?.employeeCode,
        employee?.staffId
      ]
        .map((value) => String(value ?? '').trim())
        .filter(Boolean);

      const employeeName = this.normalizeValue(
        employee?.fullName || [employee?.firstName, employee?.lastName].filter(Boolean).join(' ')
      );

      return (
        this.hasRecipientEmail(employee) && (
          (!!normalizedLoanEmployeeId && identifiers.includes(normalizedLoanEmployeeId)) ||
          (!!normalizedLoanEmployeeName && employeeName === normalizedLoanEmployeeName)
        )
      );
    }) || null;
  }

  private hasRecipientEmail(employee: any): boolean {
    return !!String(employee?.email || employee?.workEmail || employee?.user?.email || '').trim();
  }

  private normalizeValue(value: unknown): string {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  notifyCooperativeStatusChange(
    loan: CooperativeLoan,
    member?: CooperativeMember,
    previousStatus?: string | null,
    previousStage?: string | null
  ): Observable<null> {
    const resolvedMemberEmail = String(member?.email || '').trim();
    const recipientEmail = this.getStatusRecipientEmail(resolvedMemberEmail);
    console.log('[CooperativeLoanStatusEmail] Preparing status email', {
      loanId: loan.id,
      currentStatus: loan.status,
      previousStatus: previousStatus || null,
      previousStage: previousStage || null,
      recipientEmail: recipientEmail || null,
      forcedRecipientEmail: this.forcedStatusRecipientEmail,
      resolvedMemberEmail: resolvedMemberEmail || null
    });

    if (!recipientEmail) {
      console.warn('Cooperative loan status email skipped: member email not found', loan.id);
      return of(null);
    }

    const memberFirstName = String(member?.fullName || 'there')
      .trim()
      .split(' ')
      .filter(Boolean)[0] || 'there';

    const mailBody = {
      name: member?.fullName || 'Member',
      recieverEmail: recipientEmail,
      subject: this.buildCooperativeSubject(loan, previousStatus, previousStage),
      body: this.buildCooperativeBody(loan, memberFirstName, previousStatus, previousStage)
    };

    return this.mailNotificationService.sendMail(mailBody).pipe(
      map(() => null),
      catchError((error) => {
        console.error('[CooperativeLoanStatusEmail] Send failed', {
          loanId: loan.id,
          recipientEmail,
          error
        });
        return of(null);
      })
    );
  }

  private buildSubject(application: LoanApplication, previousStatus?: LoanStatus | null): string {
    const loanCode = application.loanCode || String(application.id || '');
    switch (application.status) {
      case 'AWAITING_INTEREST_ACCEPTANCE':
        return `Loan Update: interest proposal ready for ${loanCode}`;
      case 'APPROVED':
        return `Loan Update: ${loanCode} has been approved`;
      case 'READY_FOR_DISBURSEMENT':
        return `Loan Update: ${loanCode} is ready for disbursement`;
      case 'ACTIVE':
        return `Loan Update: ${loanCode} has been disbursed`;
      case 'COMPLETED':
        return `Loan Update: ${loanCode} has been fully repaid`;
      case 'REJECTED':
        return `Loan Update: ${loanCode} was not approved`;
      case 'PAUSED':
        return `Loan Update: ${loanCode} is currently paused`;
      case 'OVERDUE':
        return `Loan Update: ${loanCode} has an overdue repayment`;
      case 'SKIPPED':
        return `Loan Update: ${loanCode} has a skipped repayment`;
      case 'DEFAULTED':
        return `Loan Update: ${loanCode} has been marked defaulted`;
      case 'PENDING':
        return previousStatus
          ? `Loan Update: ${loanCode} is back under review`
          : `Loan Update: ${loanCode} is pending review`;
      default:
        return `Loan Update: ${loanCode} status changed`;
    }
  }

  private buildBody(application: LoanApplication, employeeFirstName: string, previousStatus?: LoanStatus | null): string {
    const statusLabel = this.getStatusLabel(application.status);
    const previousStatusLabel = previousStatus ? this.getStatusLabel(previousStatus) : '';
    const changedAt = this.resolveStatusChangedAt(application);
    const repaymentStartDate = application.repaymentStartDate
      ? this.formatDate(application.repaymentStartDate)
      : 'N/A';
    const repaymentDay = formatLoanRepaymentDayDisplay(application.repaymentDay);
    const interestRate = Number(application.interestRate || 0) > 0 ? `${Number(application.interestRate).toFixed(2)}%` : 'N/A';
    const intro = this.buildIntroCopy(application.status, previousStatusLabel);
    const guidance = this.buildGuidanceCopy(application.status);

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
        <p>Dear ${employeeFirstName},</p>

        <p>${intro}</p>

        <ul>
          <li><strong>Loan ID:</strong> ${application.loanCode || application.id}</li>
          <li><strong>Status:</strong> ${statusLabel}</li>
          <li><strong>Updated On:</strong> ${changedAt}</li>
          <li><strong>Loan Amount:</strong> ${this.formatCurrency(application.amount)}</li>
          <li><strong>Purpose:</strong> ${formatLoanPurposeDisplay(application.purpose)}</li>
          <li><strong>Payment Mode:</strong> ${formatLoanPaymentModeDisplay(application.modeOfPayment)}</li>
          <li><strong>Repayment Start Date:</strong> ${repaymentStartDate}</li>
          <li><strong>Repayment Day:</strong> ${repaymentDay}</li>
          <li><strong>Interest Rate:</strong> ${interestRate}</li>
        </ul>

        ${application.adminComment?.trim() ? `<p><strong>Comment:</strong> ${application.adminComment}</p>` : ''}

  <p>${guidance}</p>

        <br/>

        <p>Regards,<br/>
        <strong>HR Management</strong></p>

        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

        <p style="font-size:12px; color:#777;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  private buildIntroCopy(status: LoanStatus, previousStatusLabel: string): string {
    switch (status) {
      case 'AWAITING_INTEREST_ACCEPTANCE':
        return `Your loan request is now <strong>Awaiting Interest Acceptance</strong>. We have sent your proposed interest terms for review.`;
      case 'APPROVED':
        return `Your loan request has been <strong>approved</strong>${previousStatusLabel ? ` after moving from <strong>${previousStatusLabel}</strong>` : ''}.`;
      case 'READY_FOR_DISBURSEMENT':
        return `Your loan request is now <strong>Ready for Disbursement</strong>.`;
      case 'ACTIVE':
        return `Your loan has been <strong>disbursed</strong> and is now active.`;
      case 'COMPLETED':
        return `Your loan has been marked <strong>Completed</strong>. All scheduled repayments have been received.`;
      case 'REJECTED':
        return `Your loan request has been <strong>rejected</strong>.`;
      case 'PAUSED':
        return `Your loan has been moved to <strong>Paused</strong>.`;
      case 'OVERDUE':
        return `Your loan now has an <strong>Overdue</strong> repayment that needs attention.`;
      case 'SKIPPED':
        return `A scheduled repayment on your loan has been marked as <strong>Skipped</strong>.`;
      case 'DEFAULTED':
        return `Your loan has been marked <strong>Defaulted</strong>.`;
      case 'PENDING':
        return previousStatusLabel
          ? `Your loan request has moved back to <strong>Pending</strong> for further review.`
          : `Your loan request is currently <strong>Pending</strong> review.`;
      default:
        return `Your loan application status has been updated to <strong>${this.getStatusLabel(status)}</strong>.`;
    }
  }

  private buildGuidanceCopy(status: LoanStatus): string {
    switch (status) {
      case 'AWAITING_INTEREST_ACCEPTANCE':
        return 'Please log in to the HR portal to review and accept or reject the proposed interest rate.';
      case 'APPROVED':
        return 'Please log in to the HR portal to review the approved terms and monitor the next processing stage.';
      case 'READY_FOR_DISBURSEMENT':
        return 'Your loan is queued for release. Please monitor the HR portal for disbursement confirmation.';
      case 'ACTIVE':
        return 'Please review your repayment schedule and upcoming due dates in the HR portal.';
      case 'COMPLETED':
        return 'You can still log in to the HR portal if you want to review your repayment history.';
      case 'REJECTED':
        return 'Please log in to the HR portal if you want to review the loan details or any feedback provided.';
      case 'PAUSED':
        return 'Please log in to the HR portal to review the pause note and any action required from you.';
      case 'OVERDUE':
        return 'Please log in to the HR portal as soon as possible to review the overdue installment and settle it.';
      case 'SKIPPED':
        return 'Please log in to the HR portal to review the skipped installment and updated repayment schedule.';
      case 'DEFAULTED':
        return 'Please contact HR immediately and review the loan record in the HR portal.';
      case 'PENDING':
        return 'Please log in to the HR portal to track the latest review progress.';
      default:
        return 'Please log in to the HR portal to review the latest loan details.';
    }
  }

  private resolveStatusChangedAt(application: LoanApplication): string {
    const matchingStatusEntries = [...(application.statusHistory || [])]
      .filter((entry) => entry.status === application.status && !!entry.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    return this.formatDate(
      matchingStatusEntries[0]?.changedAt ||
      application.completedDate ||
      application.disbursedDate ||
      application.approvedDate ||
      application.rejectedDate ||
      application.requestDate
    );
  }

  private getStatusLabel(status: LoanStatus): string {
    switch (status) {
      case 'AWAITING_INTEREST_ACCEPTANCE':
        return 'Awaiting Interest Acceptance';
      case 'READY_FOR_DISBURSEMENT':
        return 'Ready for Disbursement';
      case 'PENDING':
        return 'Pending';
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'ACTIVE':
        return 'Active';
      case 'COMPLETED':
        return 'Completed';
      case 'PAUSED':
        return 'Paused';
      case 'OVERDUE':
        return 'Overdue';
      case 'SKIPPED':
        return 'Skipped';
      case 'DEFAULTED':
        return 'Defaulted';
      default:
        return String(status || '').replace(/_/g, ' ');
    }
  }

  private buildCooperativeSubject(
    loan: CooperativeLoan,
    previousStatus?: string | null,
    previousStage?: string | null
  ): string {
    const loanCode = String(loan.loanCode || loan.loanId || loan.id || '');
    const status = String(loan.status || '').trim();
    const stage = String(loan.applicationStage || '').trim();

    if (stage && stage !== String(previousStage || '').trim()) {
      switch (stage) {
        case 'INFO_REQUESTED':
          return `Cooperative Loan Update: more information is required for ${loanCode}`;
        case 'READY_FOR_ADMIN_REVIEW':
          return `Cooperative Loan Update: ${loanCode} is back under review`;
        case 'PENDING_GUARANTOR_APPROVAL':
          return `Cooperative Loan Update: ${loanCode} is awaiting guarantor approvals`;
        case 'UNDER_ADMIN_REVIEW':
          return `Cooperative Loan Update: ${loanCode} is under admin review`;
      }
    }

    switch (status) {
      case 'APPROVED':
        return `Cooperative Loan Update: ${loanCode} has been approved`;
      case 'REJECTED':
        return `Cooperative Loan Update: ${loanCode} was not approved`;
      case 'ACTIVE':
        return `Cooperative Loan Update: ${loanCode} has been disbursed`;
      case 'COMPLETED':
        return `Cooperative Loan Update: ${loanCode} has been completed`;
      case 'DEFAULTED':
        return `Cooperative Loan Update: ${loanCode} has been marked defaulted`;
      case 'PENDING':
        return previousStatus
          ? `Cooperative Loan Update: ${loanCode} is pending review again`
          : `Cooperative Loan Update: ${loanCode} is pending review`;
      default:
        return `Cooperative Loan Update: ${loanCode} status changed`;
    }
  }

  private buildCooperativeBody(
    loan: CooperativeLoan,
    memberFirstName: string,
    previousStatus?: string | null,
    previousStage?: string | null
  ): string {
    const statusLabel = this.getFriendlyLabel(loan.status);
    const stageLabel = this.getFriendlyLabel(loan.applicationStage);
    const previousStatusLabel = this.getFriendlyLabel(previousStatus);
    const previousStageLabel = this.getFriendlyLabel(previousStage);
    const changedAt = this.resolveCooperativeChangedAt(loan);
    const repaymentStartDate = loan.repaymentStartDate ? this.formatDate(loan.repaymentStartDate) : 'N/A';
    const repaymentDay = formatLoanRepaymentDayDisplay(loan.repaymentDay);
    const interestRate = Number(loan.interestRate || 0) > 0 ? `${Number(loan.interestRate).toFixed(2)}%` : 'N/A';
    const intro = this.buildCooperativeIntroCopy(loan, previousStatusLabel, previousStageLabel);
    const guidance = this.buildCooperativeGuidanceCopy(loan);

    return `
      <div style="font-family: Arial, Helvetica, sans-serif; line-height: 1.6; color: #333;">
        <p>Dear ${memberFirstName},</p>

        <p>${intro}</p>

        <ul>
          <li><strong>Loan ID:</strong> ${loan.loanCode || loan.loanId || loan.id}</li>
          <li><strong>Status:</strong> ${statusLabel || 'N/A'}</li>
          <li><strong>Stage:</strong> ${stageLabel || 'N/A'}</li>
          <li><strong>Updated On:</strong> ${changedAt}</li>
          <li><strong>Loan Amount:</strong> ${this.formatCurrency(Number(loan.amount || 0))}</li>
          <li><strong>Purpose:</strong> ${formatLoanPurposeDisplay(loan.purpose)}</li>
          <li><strong>Payment Mode:</strong> ${formatLoanPaymentModeDisplay(loan.modeOfPayment as any)}</li>
          <li><strong>Repayment Start Date:</strong> ${repaymentStartDate}</li>
          <li><strong>Repayment Day:</strong> ${repaymentDay}</li>
          <li><strong>Interest Rate:</strong> ${interestRate}</li>
        </ul>

        ${loan.adminComment?.trim() ? `<p><strong>Comment:</strong> ${loan.adminComment}</p>` : ''}
        ${loan.adminRequestNote?.trim() ? `<p><strong>Requested Update:</strong> ${loan.adminRequestNote}</p>` : ''}
        ${loan.rejectionReason?.trim() ? `<p><strong>Rejection Reason:</strong> ${loan.rejectionReason}</p>` : ''}

        <p>${guidance}</p>

        <br/>

        <p>Regards,<br/>
        <strong>HR Management</strong></p>

        <hr style="border:none; border-top:1px solid #eee; margin:20px 0;" />

        <p style="font-size:12px; color:#777;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    `;
  }

  private buildCooperativeIntroCopy(
    loan: CooperativeLoan,
    previousStatusLabel: string,
    previousStageLabel: string
  ): string {
    const stage = String(loan.applicationStage || '').trim();
    if (stage) {
      switch (stage) {
        case 'INFO_REQUESTED':
          return 'Your cooperative loan application requires <strong>additional information</strong> before it can proceed.';
        case 'READY_FOR_ADMIN_REVIEW':
          return previousStageLabel
            ? `Your cooperative loan application has moved from <strong>${previousStageLabel}</strong> to <strong>Ready for Admin Review</strong>.`
            : 'Your cooperative loan application is now <strong>Ready for Admin Review</strong>.';
        case 'PENDING_GUARANTOR_APPROVAL':
          return 'Your cooperative loan application is <strong>awaiting guarantor approval</strong>.';
        case 'UNDER_ADMIN_REVIEW':
          return 'Your cooperative loan application is currently <strong>under admin review</strong>.';
      }
    }

    switch (loan.status) {
      case 'APPROVED':
        return `Your cooperative loan request has been <strong>approved</strong>${previousStatusLabel ? ` after moving from <strong>${previousStatusLabel}</strong>` : ''}.`;
      case 'REJECTED':
        return 'Your cooperative loan request has been <strong>rejected</strong>.';
      case 'ACTIVE':
        return 'Your cooperative loan has been <strong>disbursed</strong> and is now active.';
      case 'COMPLETED':
        return 'Your cooperative loan has been marked <strong>Completed</strong>.';
      case 'DEFAULTED':
        return 'Your cooperative loan has been marked <strong>Defaulted</strong>.';
      case 'PENDING':
        return previousStatusLabel
          ? `Your cooperative loan request has moved back to <strong>Pending</strong> from <strong>${previousStatusLabel}</strong>.`
          : 'Your cooperative loan request is currently <strong>Pending</strong> review.';
      default:
        return `Your cooperative loan application has been updated to <strong>${this.getFriendlyLabel(loan.status)}</strong>.`;
    }
  }

  private buildCooperativeGuidanceCopy(loan: CooperativeLoan): string {
    switch (String(loan.applicationStage || '').trim()) {
      case 'INFO_REQUESTED':
        return 'Please log in to the HR portal, review the requested update, and submit the needed information.';
      case 'READY_FOR_ADMIN_REVIEW':
        return 'Please log in to the HR portal to monitor the latest review progress.';
      case 'PENDING_GUARANTOR_APPROVAL':
        return 'Please log in to the HR portal to track guarantor responses and follow up where necessary.';
      case 'UNDER_ADMIN_REVIEW':
        return 'Please log in to the HR portal to monitor the current review stage.';
    }

    switch (String(loan.status || '').trim()) {
      case 'APPROVED':
        return 'Please log in to the HR portal to review the approved terms and monitor disbursement.';
      case 'REJECTED':
        return 'Please log in to the HR portal to review the feedback provided on your application.';
      case 'ACTIVE':
        return 'Please log in to the HR portal to review your repayment schedule and due dates.';
      case 'COMPLETED':
        return 'Please log in to the HR portal if you want to review your repayment history.';
      case 'DEFAULTED':
        return 'Please contact the cooperative administrator immediately and review the loan record in the HR portal.';
      case 'PENDING':
        return 'Please log in to the HR portal to track the latest review progress.';
      default:
        return 'Please log in to the HR portal to review the latest cooperative loan details.';
    }
  }

  private resolveCooperativeChangedAt(loan: CooperativeLoan): string {
    const matchingStatusEntries = [...(loan.statusHistory || [])]
      .filter((entry) => entry.status === loan.status && !!entry.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    return this.formatDate(
      matchingStatusEntries[0]?.changedAt ||
      loan.updatedAt ||
      loan.completedDate ||
      loan.disbursedDate ||
      loan.approvedDate ||
      loan.rejectedDate ||
      loan.requestDate ||
      loan.applicationDate
    );
  }

  private getFriendlyLabel(value?: string | null): string {
    return String(value || '').replace(/_/g, ' ').trim();
  }

  private getStatusRecipientEmail(resolvedEmail?: string | null): string {
    return String(this.forcedStatusRecipientEmail || resolvedEmail || '').trim();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(Number(amount || 0));
  }

  private formatDate(value?: string | null): string {
    if (!value) {
      return 'N/A';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'N/A';
    }

    return date.toLocaleString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}