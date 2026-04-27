import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { MailNotificationService } from '../../../service/mailNotification.service';

@Component({
  selector: 'app-interview-response',
  template: `
    <div class="interview-response-page">
      <div class="response-container">
        <!-- Processing State -->
        <div class="processing-state" *ngIf="processing">
          <div class="spinner-container">
            <div class="spinner"></div>
          </div>
          <h3 class="processing-title">Processing Your Response</h3>
          <p class="processing-message">Please wait while we update your interview status...</p>
        </div>

        <!-- Response State -->
        <div class="response-card" *ngIf="!processing">
          <div class="response-header">
            <div class="icon-container"
                 [class.success-icon]="action === 'accept'"
                 [class.decline-icon]="action === 'decline'">
              <i class="fas"
                 [class.fa-check-circle]="action === 'accept'"
                 [class.fa-info-circle]="action === 'decline'"></i>
            </div>
            <h1 class="response-title">{{ title }}</h1>
          </div>

          <div class="response-content">
            <p class="response-message">{{ message }}</p>

            <div class="action-details" *ngIf="action === 'accept'">
              <div class="detail-item">
                <i class="fas fa-calendar-check"></i>
                <span>Interview Confirmed</span>
              </div>
              <div class="detail-item">
                <i class="fas fa-envelope"></i>
                <span>Confirmation email sent</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .interview-response-page {
      min-height: 100vh;
    //   background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .response-container {
      max-width: 500px;
      width: 100%;
    }

    /* Processing State */
    .processing-state {
      background: white;
      border-radius: 16px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    }

    .spinner-container {
      margin-bottom: 24px;
    }

    .spinner {
      width: 60px;
      height: 60px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .processing-title {
      color: #374151;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 12px 0;
    }

    .processing-message {
      color: #6b7280;
      font-size: 16px;
      margin: 0;
    }

    /* Response Card */
    .response-card {
      background: white;
      border-radius: 16px;
      padding: 40px 30px;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .response-header {
      margin-bottom: 32px;
    }

    .icon-container {
      margin-bottom: 20px;
    }

    .icon-container i {
      font-size: 64px;
    }

    .success-icon i {
      color: #10b981;
    }

    .decline-icon i {
      color: #6b7280;
    }

    .response-title {
      color: #111827;
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      letter-spacing: -0.025em;
    }

    .response-content {
      margin-bottom: 40px;
    }

    .response-message {
      color: #4b5563;
      font-size: 18px;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    .action-details {
      background: #f8fafc;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      color: #374151;
      font-size: 16px;
      font-weight: 500;
      margin-bottom: 12px;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .detail-item i {
      color: #10b981;
      font-size: 18px;
    }

    .response-actions {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      min-width: 140px;
      justify-content: center;
    }

    .btn-primary {
      background: #667eea;
      color: white;
    }

    .btn-primary:hover {
      background: #5a67d8;
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
      border-color: #9ca3af;
    }

    /* Responsive Design */
    @media (max-width: 480px) {
      .interview-response-page {
        padding: 16px;
      }

      .response-card, .processing-state {
        padding: 32px 20px;
      }

      .response-title {
        font-size: 28px;
      }

      .response-message {
        font-size: 16px;
      }

      .response-actions {
        flex-direction: column;
      }

      .btn-primary, .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class InterviewResponseComponent implements OnInit {
  processing = true;
  title = '';
  message = '';
  action = '';
  candidate: any = {}

  constructor(private route: ActivatedRoute, private mailService: MailNotificationService) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const id = params['candidateId'];
      const action = params['action']; // 'accept' or 'decline'

      if (id && action) {
        this.updateStatus(id, action);
      }
    });
  }

  updateStatus(id: string, action: string) {
    // Get the invitation to preserve it
    const invites = JSON.parse(localStorage.getItem('upcomingInvite') || '[]');
    const index = invites.findIndex((c: any) => c.id == id);

    if (index !== -1) {
      this.candidate = invites[index];
      // Keep the invite in the list for reference - mark response but keep record
      invites[index].candidateResponse = action;
      localStorage.setItem('upcomingInvite', JSON.stringify(invites));
    }
    
    this.action = action.toLowerCase();
    this.title = action === 'accept' ? 'Awesome!' : 'Response Noted';
    this.message = action === 'accept' 
      ? 'Your interview has been confirmed. We look forward to meeting you!' 
      : 'Thank you for letting us know. We wish you the best in your search.';

    // Update the candidate data in localStorage
    const candidateData = localStorage.getItem('candidateData');
    if (candidateData) {
      try {
        const candidates = JSON.parse(candidateData);
        const candidateIndex = candidates.findIndex((c: any) => c.id == id);
        if (candidateIndex !== -1) {
          candidates[candidateIndex].status = action === 'accept' ? 'Interview Accepted' : 'Interview Declined';
          candidates[candidateIndex].interviewStatus = action === 'accept' ? 'Accepted' : 'Declined';
          // Add to decision history without overwriting
          if (!candidates[candidateIndex].decisionHistory) {
            candidates[candidateIndex].decisionHistory = [];
          }
          
          // Send confirmation email and capture copy
          const emailCopy = this.sendConfirmationEmail(action);
          
          // Add acceptance/decline entry - AFTER the invite entry (which already exists)
          candidates[candidateIndex].decisionHistory.push({
            date: new Date().toISOString(),
            action: action === 'accept' ? 'Interview Accepted' : 'Interview Declined',
            details: action === 'accept' ? 'Candidate accepted the interview invitation.' : 'Candidate declined the interview invitation.',
            emailCopy
          });
          
          localStorage.setItem('candidateData', JSON.stringify(candidates));
        }
      } catch (e) {
        console.error('Error updating candidate data:', e);
      }
    }

    this.processing = false;
  }

  sendConfirmationEmail(action: string) {
  const isConfirmed = action === 'accept';
  
  const title = isConfirmed ? 'Interview Confirmed' : 'Interview Withdrawn';
  const primaryColor = isConfirmed ? '#28a745' : '#dc3545';
  
  const htmlMessage = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: ${primaryColor}; padding: 20px; text-align: center;">
        <h1 style="color: white; margin: 0;">${title}</h1>
      </div>
      
      <div style="padding: 30px; color: #333; line-height: 1.6;">
        <p>Dear <strong>${this.candidate.firstname}</strong>,</p>
        
        ${isConfirmed ? `
          <p>Thank you for confirming your interview. We are excited to speak with you about the <strong>${this.candidate.jobVacancy?.jobTitle || 'Position'}</strong> role.</p>
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${this.candidate.scheduledDate || 'To be communicated'}</p>
            <p style="margin: 5px 0;"><strong>Location:</strong> Remote / Office (Check calendar invite)</p>
          </div>
          <p>A calendar invitation with the meeting link/address has been sent to your email. Please ensure you are in a quiet environment with a stable connection.</p>
        ` : `
          <p>We have received your response declining the interview invitation for the <strong>${this.candidate.jobVacancy?.jobTitle  || 'Position'}</strong> role.</p>
          <p>We have updated our records accordingly. Thank you for your interest in joining our team, and we wish you the very best in your current job search and future professional endeavors.</p>
        `}
        
        <p style="margin-top: 30px;">Best Regards,<br><strong>The Hiring Team</strong></p>
      </div>
      
      <div style="background-color: #f4f4f4; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        This is an automated notification regarding your application status.
      </div>
    </div>
  `;

  const body = {
    body: htmlMessage,
    subject: title,
    recieverEmail: this.candidate.email,
    name: this.candidate.firstname
  }
  this.mailService.sendMail(body).subscribe(response => {
    console.log('Email sent successfully:', response);
  }, error => {
    console.error('Error sending email:', error);
  });
  return htmlMessage;
}

}
