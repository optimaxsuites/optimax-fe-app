import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from './environments/environment';

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

    // Map to the backend's expected field name (`recieverEmail` — sic, backend typo kept intentionally)
    const backendPayload = {
      name: payload.name,
      recieverEmail: payload.receiverEmail,
      subject: payload.subject,
      body: payload.body
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
    adminEmail: string,
    expenseName: string,
    amount: number,
    currency: string = 'NGN'
  ): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name: 'Admin',
      receiverEmail: adminEmail,
      subject: '🧾 New Expense Submitted — Pending Your Review',
      body: `
        <p>Hello,</p>
        <p>A new expense has been submitted and is awaiting your approval.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;">
          <tr><td style="padding:6px 12px;font-weight:bold;background:#f5f5f5;">Submitted By</td>
              <td style="padding:6px 12px;">${submitterName}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;background:#f5f5f5;">Expense Name</td>
              <td style="padding:6px 12px;">${expenseName}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;background:#f5f5f5;">Amount</td>
              <td style="padding:6px 12px;">${currency} ${amount.toLocaleString()}</td></tr>
        </table>
        <br/>
        <p>Please log in to the ERP portal to review and action this expense.</p>
        <br/><p style="color:#666;">Optimax ERP System</p>`
    });
  }

  // ─── Step 3a: Admin APPROVED → notify original submitter ────────────────────
  /**
   * Called after an admin approves an expense.
   * Sends a confirmation email to the user who originally submitted it.
   *
   * @param submitterName   Full name of the original submitter
   * @param submitterEmail  Email of the original submitter
   * @param expenseDetails  Human-readable description (name + amount + currency)
   * @param approvedByName  Name of the admin who approved
   */
  sendExpenseApprovedNotification(
    submitterName: string,
    submitterEmail: string,
    expenseDetails: string,
    approvedByName: string
  ): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name: submitterName,
      receiverEmail: submitterEmail,
      subject: '✅ Your Expense Has Been Approved',
      body: `
        <p>Dear ${submitterName},</p>
        <p>Great news! Your expense has been <strong style="color:#16a34a;">approved</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;">
          <tr><td style="padding:6px 12px;font-weight:bold;background:#f0fdf4;">Expense</td>
              <td style="padding:6px 12px;">${expenseDetails}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;background:#f0fdf4;">Approved By</td>
              <td style="padding:6px 12px;">${approvedByName}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;background:#f0fdf4;">Date</td>
              <td style="padding:6px 12px;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
        </table>
        <br/><p>The expense will be processed in the next payment cycle.</p>
        <br/><p style="color:#666;">Best regards,<br/>Optimax Finance Team</p>`
    });
  }


  sendExpenseRejectedNotification(
    submitterName: string,
    submitterEmail: string,
    expenseDetails: string,
    rejectedByName: string,
    reason?: string
  ): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name: submitterName,
      receiverEmail: submitterEmail,
      subject: '❌ Your Expense Has Been Rejected',
      body: `
        <p>Dear ${submitterName},</p>
        <p>Unfortunately, your expense has been <strong style="color:#dc2626;">rejected</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:480px;">
          <tr><td style="padding:6px 12px;font-weight:bold;background:#fef2f2;">Expense</td>
              <td style="padding:6px 12px;">${expenseDetails}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;background:#fef2f2;">Rejected By</td>
              <td style="padding:6px 12px;">${rejectedByName}</td></tr>
          <tr><td style="padding:6px 12px;font-weight:bold;background:#fef2f2;">Date</td>
              <td style="padding:6px 12px;">${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</td></tr>
          ${reason
            ? `<tr><td style="padding:6px 12px;font-weight:bold;background:#fef2f2;">Reason</td>
                   <td style="padding:6px 12px;">${reason}</td></tr>`
            : ''}
        </table>
        <br/><p>Please review the reason above and resubmit if applicable, or contact your manager for clarification.</p>
        <br/><p style="color:#666;">Best regards,<br/>Optimax Finance Team</p>`
    });
  }


  sendExpenseNotification(
    name: string,
    email: string,
    expenseDetails: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Observable<EmailResponse> {
    if (status === 'APPROVED') {
      return this.sendExpenseApprovedNotification(name, email, expenseDetails, 'Admin');
    }
    return this.sendExpenseRejectedNotification(name, email, expenseDetails, 'Admin', reason);
  }
}