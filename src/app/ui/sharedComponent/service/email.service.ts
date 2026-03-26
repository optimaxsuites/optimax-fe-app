import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from './environments/environment';

//  Corrected typo — was 'recieverEmail', now 'receiverEmail'
export interface EmailPayload {
  name: string;
  receiverEmail: string;
  subject: string;
  body: string;
}

//  Typed response instead of any
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


    const backendPayload = {
      name: payload.name,
      recieverEmail: payload.receiverEmail,
      subject: payload.subject,
      body: payload.body
    };

    return this.http
      .post<EmailResponse>(this.emailEndpoint, backendPayload, { headers })
      .pipe(
        tap(() => console.log(`[EmailService] Email sent → ${payload.receiverEmail} | "${payload.subject}"`)),
        catchError((error) => {
          console.error('[EmailService] Failed to send email:', error);
          return throwError(() => new Error(error?.message || 'Email delivery failed'));
        })
      );
  }

  /**
   * Welcome email — sent when a new user is onboarded.
   */
  sendWelcomeEmail(name: string, email: string, customBody?: string): Observable<EmailResponse> {
    return this.sendNotificationEmail({
      name,
      receiverEmail: email,
      subject: 'Welcome to Optimax',
      body: customBody || `<p>Hi ${name},</p><p>Welcome to the Optimax ERP platform. Your account is ready.</p>`
    });
  }

 
  sendExpenseNotification(
    name: string,
    email: string,
    expenseDetails: string,
    status: 'APPROVED' | 'REJECTED',
    reason?: string
  ): Observable<EmailResponse> {
    const isApproved = status === 'APPROVED';
    const subject = isApproved ? 'Your Expense Has Been Approved ✅' : 'Your Expense Has Been Rejected ❌';

    const body = isApproved
      ? `<p>Dear ${name},</p>
         <p>Your expense has been <strong>approved</strong> and will be processed shortly.</p>
         <p><strong>Details:</strong> ${expenseDetails}</p>
         <br/><p>Best regards,<br/>Optimax Finance Team</p>`
      : `<p>Dear ${name},</p>
         <p>Your expense has been <strong>rejected</strong>.</p>
         <p><strong>Details:</strong> ${expenseDetails}</p>
         ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
         <p>Please contact your manager for more information.</p>
         <br/><p>Best regards,<br/>Optimax Finance Team</p>`;

    return this.sendNotificationEmail({ name, receiverEmail: email, subject, body });
  }

  /**
   * Submission confirmation — sent to admin when an expense is submitted.
   */
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
      subject: 'New Expense Submitted — Pending Review',
      body: `<p>A new expense has been submitted and is awaiting your review.</p>
             <p><strong>Submitted by:</strong> ${submitterName}</p>
             <p><strong>Expense name:</strong> ${expenseName}</p>
             <p><strong>Amount:</strong> ${currency} ${amount.toLocaleString()}</p>
             <p>Please log in to the ERP portal to review and action this expense.</p>
             <br/><p>Optimax ERP System</p>`
    });
  }
}