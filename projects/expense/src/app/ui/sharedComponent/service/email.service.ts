import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from './environments/environment';
import { v4 as uuidV4 } from 'uuid';

export interface EmailPayload {
  name: string;
  receiverEmail: string;
  subject: string;
  body: string;
}

export interface EmailResponse {
  success?: boolean;
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmailService {

  private emailEndpoint = environment.emailEndpoint;

  constructor(private http: HttpClient) {}

  sendNotificationEmail(payload: EmailPayload): Observable<EmailResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.apiKey
    });

    // Map to the backend's expected field name
    // (`recieverEmail` — sic, backend typo kept intentionally)
    const backendPayload = {
      name:          payload.name,
      recieverEmail: payload.receiverEmail,
      subject:       payload.subject,
      body:          payload.body
    };

    return this.http
      .post<EmailResponse>(this.emailEndpoint, backendPayload, { headers })
      .pipe(
        tap(() => console.log(`[EmailService] ✉️  Sent → ${payload.receiverEmail} | "${payload.subject}"`)),
        catchError((error) => {
          console.error('[EmailService] ❌ Failed to send email:', error);
          return throwError(() => new Error(error?.message || 'Email delivery failed'));
        })
      );
  }

  sendWelcomeEmail(name: string, email: string, customBody?: string): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name,
      receiverEmail: email,
      subject: 'Welcome to Optimax',
      body: customBody ||
        `<p>Hi ${name},</p>
         <p>Welcome to the Optimax ERP platform. Your account is ready.</p>`
    });
  }


  sendExpenseSubmissionAlert(
    submitterName: string,
    adminEmail:    string,
    expenseName:   string,
    expenseId:     number | string,
    amount:        number,
    currency:      string = 'NGN'
  ): Observable<EmailResponse> {
    const appBaseUrl = (environment as any).appBaseUrl || 'https://optimaxsuites.com';
    const approvalPath = `/admin/expenses/${uuidV4()}/expensesApproval/${expenseId}`;
    const reviewUrl = `${appBaseUrl}/user/auth/${uuidV4()}?redirect=${encodeURIComponent(approvalPath)}`;

    return this.sendNotificationEmail({
      name:          'Admin',
      receiverEmail: adminEmail,
      subject:       '🧾 New Expense Submitted — Pending Your Review',
      body: `
        <p style="margin:0 0 12px 0;">Hello,</p>
        <p style="margin:0 0 16px 0;">
          A new expense has been submitted and is awaiting your approval.
        </p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;">Submitted By</td>
            <td style="padding:8px 14px;border:1px solid #e2e8f0;">${submitterName}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;">Expense Name</td>
            <td style="padding:8px 14px;border:1px solid #e2e8f0;">${expenseName}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#f8fafc;border:1px solid #e2e8f0;">Amount</td>
            <td style="padding:8px 14px;border:1px solid #e2e8f0;">${currency} ${amount.toLocaleString()}</td>
          </tr>
        </table>
        <div style="margin:18px 0 18px 0;">
          <a href="${reviewUrl}"
             style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700;">
            Review Expense
          </a>
        </div>
        <p style="margin:0 0 12px 0;font-size:13px;color:#334155;">
          If the button doesn’t work, copy and paste this link into your browser:
          <br />
          <span style="word-break:break-all;color:#2563eb;">${reviewUrl}</span>
        </p>
        <p style="margin:0 0 12px 0;">
          Please log in to the Optimax ERP portal to review and action this expense.
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">Optimax ERP System</p>
      `
    });
  }

  sendExpenseApprovedNotification(
    submitterName:  string,
    submitterEmail: string,
    expenseDetails: string,
    approvedByName: string
  ): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name:          submitterName,
      receiverEmail: submitterEmail,
      subject:       '✅ Your Expense Has Been Approved',
      body: `
        <p style="margin:0 0 12px 0;">Dear ${submitterName},</p>
        <p style="margin:0 0 16px 0;">
          Great news! Your expense has been
          <strong style="color:#16a34a;">approved</strong>.
        </p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#f0fdf4;border:1px solid #bbf7d0;">Expense</td>
            <td style="padding:8px 14px;border:1px solid #bbf7d0;">${expenseDetails}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#f0fdf4;border:1px solid #bbf7d0;">Approved By</td>
            <td style="padding:8px 14px;border:1px solid #bbf7d0;">${approvedByName}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#f0fdf4;border:1px solid #bbf7d0;">Date</td>
            <td style="padding:8px 14px;border:1px solid #bbf7d0;">
              ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </td>
          </tr>
        </table>
        <p style="margin:0 0 12px 0;">
          The expense will be processed in the next payment cycle.
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">
          Best regards,<br/>Optimax Finance Team
        </p>
      `
    });
  }

  sendExpenseRejectedNotification(
    submitterName:  string,
    submitterEmail: string,
    expenseDetails: string,
    rejectedByName: string,
    reason?:        string
  ): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name:          submitterName,
      receiverEmail: submitterEmail,
      subject:       '❌ Your Expense Has Been Rejected',
      body: `
        <p style="margin:0 0 12px 0;">Dear ${submitterName},</p>
        <p style="margin:0 0 16px 0;">
          Unfortunately, your expense has been
          <strong style="color:#dc2626;">rejected</strong>.
        </p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;margin-bottom:16px;">
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#fef2f2;border:1px solid #fecaca;">Expense</td>
            <td style="padding:8px 14px;border:1px solid #fecaca;">${expenseDetails}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#fef2f2;border:1px solid #fecaca;">Rejected By</td>
            <td style="padding:8px 14px;border:1px solid #fecaca;">${rejectedByName}</td>
          </tr>
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#fef2f2;border:1px solid #fecaca;">Date</td>
            <td style="padding:8px 14px;border:1px solid #fecaca;">
              ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
            </td>
          </tr>
          ${reason ? `
          <tr>
            <td style="padding:8px 14px;font-weight:600;background:#fef2f2;border:1px solid #fecaca;">Reason</td>
            <td style="padding:8px 14px;border:1px solid #fecaca;">${reason}</td>
          </tr>` : ''}
        </table>
        <p style="margin:0 0 12px 0;">
          Please review the reason above and resubmit if applicable,
          or contact your manager for clarification.
        </p>
        <p style="margin:0;color:#64748b;font-size:13px;">
          Best regards,<br/>Optimax Finance Team
        </p>
      `
    });
  }

  sendExpenseNotification(
    name:           string,
    email:          string,
    expenseDetails: string,
    status:         'APPROVED' | 'REJECTED',
    reason?:        string
  ): Observable<EmailResponse> {
    if (status === 'APPROVED') {
      return this.sendExpenseApprovedNotification(name, email, expenseDetails, 'Admin');
    }
    return this.sendExpenseRejectedNotification(name, email, expenseDetails, 'Admin', reason);
  }
}
