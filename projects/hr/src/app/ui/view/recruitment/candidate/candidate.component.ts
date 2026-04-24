import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO, ApplicationStage } from '../../../domain/applicant.dto';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { MenuItem } from 'primeng/api';
import { MailNotificationService } from '../../../service/mailNotification.service';

export interface FormResponse {
  label: string;
  value: string;
}
 
export interface CandidateDocument {
  name: string;
  type: 'pdf' | 'docx' | string;
  size: string;
  uploadedDate: string;
  url: string;
}
 
export interface AiVetting {
  overallScore: number;
  skillsMatch: number;
  experienceFit: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'Pass';
  strengths: string[];
  concerns: string[];
  summary: string;
}
 
export interface DecisionHistoryItem {
  date: string;
  action: string;
  details?: string;
  emailCopy?: string;
  status?: string;
}
 
export interface Candidate {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  appliedDate: string;
  status: 'New' | 'Shortlisted' | 'Rejected' | 'Invited' | 'Interview Accepted' | 'Interview Declined' | 'Offered' | 'Hired';
  interviewStatus?: 'Not Invited' | 'Invited' | 'Accepted' | 'Declined' | 'Completed';
  interviewDetails?: {
    scheduledDate?: string;
    location?: string;
    format?: string;
    notes?: string;
  };
  formResponses: FormResponse[];
  documents: CandidateDocument[];
  aiVetting: AiVetting | null;
  decisionHistory?: DecisionHistoryItem[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'Interview' | 'Offer' | 'Rejection' | 'General' | 'Follow-up';
  subject: string;
  body: string;
  customPlaceholders: PlaceholderField[];
}

export interface PlaceholderField {
  key: string;       // inserted as {{key}}
  label: string;     // shown on chip
  source: 'db' | 'manual';
  inputType: 'text' | 'email' | 'url' | 'date' | 'time' | 'datetime';
  required: boolean;
  appliesTo?: EmailTemplate['category'][];
  helpText?: string;
}
@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class CandidateComponent implements OnInit {

  viewState: 'job-grid' | 'applicant-list' | 'applicant-view' = 'job-grid';
  
  allApplications: any[] = []; // Raw JobApplicationDTO[]
  groupedJobs: any[] = []; 
  selectedJob: any = null;
  selectedCandidate: any = null;
  filteredApplicants: any[] = [];
  viewCandidateModal: boolean = false;

  applicantColumns: TableColumn[] = [
    { header: 'First Name', field: 'firstname', sortable: true },
    { header: 'Last Name', field: 'lastname', sortable: true },
    { header: 'Email', field: 'email', sortable: true },
    { header: 'Status', field: 'status', badgeClass: (row) => this.getStatusBadgeClass(row.status) },
    { header: 'Interview Status', field: 'interviewStatus', badgeClass: (row) => this.getInterviewStatusBadgeClass(row.interviewStatus) },
    { header: 'Applied Date', field: 'appliedDate', sortable: true }
  ];

  applicantActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'fas fa-eye' },
    // { id: 'edit', label: 'Edit', icon: 'fas fa-pen-to-square' },
    // { id: 'delete', label: 'Delete', icon: 'fas fa-trash-can' }
  ];
  activeTab = 'form';

   tabs = [
    { key: 'form',      label: 'Form Response' },
    { key: 'documents', label: 'Documents'      },
    { key: 'ai',        label: 'AI Vetting'     },
    { key: 'decisionHistory', label: 'Decision History' },
  ];
   actionItems: MenuItem[] | undefined;
   currentAction: string = '';
   sendLoading: boolean = false;

   templates: EmailTemplate[] = [];
    selectedInviteTemplate: EmailTemplate | null = null;
    showInviteModal: boolean = false;
    isStepTwo: boolean = false; // Step 1: Select Template, Step 2: Fill & Preview
    manualPlaceholderValues: Record<string, string> = {};

    regData: any = {};

    expandedEmails: boolean[] = [];

   constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private mailService: MailNotificationService
  ) {}

   ngOnInit(): void {
    this.actionItems = [
      {
        label: 'Interview Invite',
        icon: 'fas fa-calendar-check',
        command: () => this.onActionSelected('Interview Invite')
      },
      {
        label: 'Admin Accept Interview',
        icon: 'fas fa-check-circle',
        command: () => this.adminAcceptInterview(this.selectedCandidate)
      },
      {
        label: 'Admin Decline Interview',
        icon: 'fas fa-times-circle',
        command: () => this.adminDeclineInterview(this.selectedCandidate),
        styleClass: 'text-danger'
      },
      { separator: true },
      {
        label: 'Shortlist',
        icon: 'fas fa-bookmark',
        command: () => this.onActionSelected('Shortlist')
      },
      {
        label: 'Request Docs',
        icon: 'fas fa-file-arrow-up',
        command: () => this.onActionSelected('Request Docs')
      },
      { separator: true },
      {
        label: 'Send Offer',
        icon: 'fas fa-envelope-open-text',
        command: () => this.onActionSelected('Send Offer')
      },
      {
        label: 'Reject',
        icon: 'fas fa-xmark',
        styleClass: 'text-danger',
        command: () => this.onActionSelected('Reject')
      }
    ];

    const saved = localStorage.getItem('settings.hr.mailTemplates');
    this.templates = saved ? JSON.parse(saved) : [];

    const userPrimaryInfoRegData = localStorage.getItem('userPrimaryInfoRegData');
    this.regData = userPrimaryInfoRegData ? JSON.parse(userPrimaryInfoRegData) : null;

    this.loadDummyData()
  }

  loadDummyData() {
    // Load from localStorage first, then fall back to dummy data
    const savedData = localStorage.getItem('candidateData');
    if (savedData) {
      try {
        this.allApplications = JSON.parse(savedData);
        this.groupApplicationsByJob();
        return;
      } catch (e) {
        console.error('Error loading saved candidate data:', e);
      }
    }

    // Mimicking the JobApplicationDTO structure
    this.allApplications = [
      {
        id: 101,
        firstname: 'Rukayat',
        lastname: 'Morufu',
        email: 'oluwadarequeensheba@gmail.com',
        appliedDate: 'Apr 10, 2025',
        status: 'Shortlisted',
        interviewStatus: 'Not Invited',
        formResponses: [
          { label: 'Years of Experience', value: '5 years' },
          { label: 'Current Role', value: 'Product Designer at Paystack' },
          { label: 'Availability', value: 'Immediately' },
          { label: 'Expected Salary', value: '₦800,000/month' },
          { label: 'Preferred Work Mode', value: 'Hybrid' },
          { label: 'Cover Note', value: 'I am deeply passionate about user-centred design...' },
        ],
        documents: [
          { name: 'Amara_CV.pdf', type: 'pdf', size: '420 KB', uploadedDate: 'Apr 10, 2025', url: '#' },
          { name: 'Portfolio.pdf', type: 'pdf', size: '2.1 MB', uploadedDate: 'Apr 10, 2025', url: '#' },
        ],
        aiVetting: {
          overallScore: 82,
          skillsMatch: 88,
          experienceFit: 79,
          recommendation: 'Strong Hire',
          strengths: [
            'Strong portfolio with enterprise-scale product experience.',
            'Directly relevant industry experience at a fintech company.',
            'Excellent written communication evident in cover note.',
          ],
          concerns: [
            'No mention of design system contribution or ownership.',
            'Expected salary is above current band for the role.',
          ],
          summary:
            'Amara presents as a well-rounded candidate whose background aligns closely with the role requirements. The fintech experience is a strong differentiator. Salary expectations may require negotiation.',
        },
        jobVacancy: { id: 5, jobTitle: 'Frontend Developer', jobCategory: { name: 'Engineering' }, customFieldsResponce: [{ jobVacancyCustomFields: { label: 'Portfolio' }, value: 'http://jane.dev', type: 'String' }] },
      },
      {
        id: 102,
        firstname: 'Galadinma',
        lastname: 'Christabel',
        email: 'damilola@centrifugegroup.com',
        appliedDate: 'Apr 12, 2025',
        status: 'Shortlisted',
        interviewStatus: 'Not Invited',
        formResponses: [
          { label: 'Years of Experience', value: '3 years' },
          { label: 'Current Role', value: 'UI Designer at Flutterwave' },
          { label: 'Availability', value: '2 weeks notice' },
          { label: 'Expected Salary', value: '₦600,000/month' },
          { label: 'Preferred Work Mode', value: 'Remote' },
          { label: 'Cover Note', value: 'My work at Flutterwave has honed my ability to...' },
        ],
        documents: [
          { name: 'Chidi_Resume.pdf', type: 'pdf', size: '310 KB', uploadedDate: 'Apr 12, 2025', url: '#' },
        ],
        aiVetting: {
          overallScore: 67,
          skillsMatch: 72,
          experienceFit: 60,
          recommendation: 'Maybe',
          strengths: [
            'Solid UI skills with a recognisable brand on the CV.',
            'Salary expectations within budget.',
          ],
          concerns: [
            'Limited evidence of UX research or strategy involvement.',
            'Only one document submitted — no portfolio linked.',
          ],
          summary:
            'Chidi has a solid foundation but may be a level below what the role demands. Worth a screening call to assess depth of UX thinking.',
        },
        jobVacancy: { id: 5, jobTitle: 'Frontend Developer', jobCategory: { name: 'Engineering' },         customFieldsResponce: [{ jobVacancyCustomFields: { label: 'Years of Exp' }, value: '5', type: 'String' }] },
      }
    ];
    this.groupApplicationsByJob();
  }

  groupApplicationsByJob() {
    const groups = new Map();
    this.allApplications.forEach(app => {
      const jobId = app.jobVacancy.id;
      if (!groups.has(jobId)) {
        groups.set(jobId, {
          id: jobId,
          title: app.jobVacancy.jobTitle,
          category: app.jobVacancy.jobCategory?.name,
          applicants: []
        });
      }
      groups.get(jobId).applicants.push(app);
    });
    this.groupedJobs = Array.from(groups.values()).map(g => ({ ...g, count: g.applicants.length }));
  }

  selectJob(job: any) {
    console.log("job", job  )
    this.selectedJob = job;
    this.refreshFilteredApplicants();
    this.viewState = 'applicant-list';
  }

  refreshFilteredApplicants(): void {
    if (this.selectedJob) {
      // Reload from allApplications to get fresh data with decision history
      // selectedJob has id from jobVacancy.id (see groupApplicationsByJob)
      this.filteredApplicants = this.allApplications.filter(app => 
        app.jobVacancy?.id === this.selectedJob?.id
      );
    }
  }

  handleCandidateAction($event: { actionId: string; row: any; }) {
      // Load fresh candidate data from allApplications to ensure decision history is up-to-date
      const freshCandidate = this.allApplications.find(app => app.id === $event.row.id);
      this.selectedCandidate = freshCandidate || $event.row;
      
      // Also refresh from localStorage to catch any recent updates (e.g., from interview response page)
      try {
        const candidateDataStr = localStorage.getItem('candidateData');
        if (candidateDataStr) {
          const allCandidates = JSON.parse(candidateDataStr);
          const fromStorage = allCandidates.find((c: any) => c.id === $event.row.id);
          if (fromStorage) {
            this.selectedCandidate = fromStorage;
            // Also update in allApplications
            const idx = this.allApplications.findIndex(app => app.id === $event.row.id);
            if (idx !== -1) {
              this.allApplications[idx] = fromStorage;
            }
          }
        }
      } catch (e) {
        console.warn('Could not load fresh candidate from storage:', e);
      }
      
      this.expandedEmails = [];
      this.viewCandidateModal = true;
      if ($event.actionId === 'view') {
        this.viewState = 'applicant-view';
      }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
 
  onReject(candidate: Candidate): void {
    // TODO: implement reject logic / confirmation dialog
    console.log('Reject', candidate.id);
  }
 
  onShortlist(candidate: Candidate): void {
    this.updateCandidateStatus(candidate, 'Shortlisted');
    // Add decision history
    this.addDecisionHistory(candidate, 'Shortlisted', 'Candidate was shortlisted for further consideration.');
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `${candidate.firstname} ${candidate.lastname} has been shortlisted.`,
      life: 3000,
    });
  }
 
  onSendInterview(candidate: Candidate, emailBody?: string): void {
    const storedInvites = localStorage.getItem('upcomingInvite');
    let prevInvites: any[] = [];
    if (storedInvites) {
      try { prevInvites = JSON.parse(storedInvites) || []; } catch { prevInvites = []; }
    }

    // Check if invite already exists for this candidate
    const existingInviteIndex = prevInvites.findIndex((inv: any) => inv.id === candidate.id);
    
    const newInvite = {
      ...candidate,
      job: this.selectedJob,
      stage: 'Awaiting Response',
      interviewStage: 1,
      scheduledDate: this.manualPlaceholderValues['date'],
      inviteTimestamp: new Date().toISOString()
    };

    if (existingInviteIndex === -1) {
      // New invite - just add it
      localStorage.setItem('upcomingInvite', JSON.stringify([...prevInvites, newInvite]));
    } else {
      // Update existing invite with new details
      prevInvites[existingInviteIndex] = newInvite;
      localStorage.setItem('upcomingInvite', JSON.stringify(prevInvites));
    }
    
    this.updateCandidateStatus(candidate, 'Invited');
    this.updateCandidateInterviewStatus(candidate, 'Invited');
    // Add decision history with email copy
    this.addDecisionHistory(candidate, 'Interview Invited', 'Interview invitation sent to candidate.', emailBody);
    
    // Refresh the selectedCandidate to update UI
    const candidateIndex = this.allApplications.findIndex(app => app.id === candidate.id);
    if (candidateIndex !== -1) {
      this.selectedCandidate = { ...this.allApplications[candidateIndex] };
    }
    
    this.messageService.add({
      severity: 'success',
      summary: 'Interview Invite Sent',
      detail: `Interview invitation sent to ${candidate.firstname} ${candidate.lastname}.`,
      life: 3000,
    });
  }

  // Admin can accept interview on behalf of candidate
  adminAcceptInterview(candidate: Candidate): void {
    this.updateCandidateStatus(candidate, 'Interview Accepted');
    this.updateCandidateInterviewStatus(candidate, 'Accepted');
    // Add decision history
    this.addDecisionHistory(candidate, 'Interview Accepted', 'Interview accepted by admin on behalf of candidate.');
    
    // Update the invite record
    const storedInvites = localStorage.getItem('upcomingInvite');
    if (storedInvites) {
      try {
        const invites = JSON.parse(storedInvites);
        const inviteIndex = invites.findIndex((inv: any) => inv.id == candidate.id);
        if (inviteIndex !== -1) {
          invites[inviteIndex].stage = 'Accepted';
          localStorage.setItem('upcomingInvite', JSON.stringify(invites));
        }
      } catch (e) {
        console.error('Error updating invite status:', e);
      }
    }
    
    this.messageService.add({
      severity: 'success',
      summary: 'Interview Accepted',
      detail: `Interview accepted for ${candidate.firstname} ${candidate.lastname}.`,
      life: 3000,
    });
  }

  adminDeclineInterview(candidate: Candidate): void {
    this.updateCandidateStatus(candidate, 'Interview Declined');
    this.updateCandidateInterviewStatus(candidate, 'Declined');
    // Add decision history
    this.addDecisionHistory(candidate, 'Interview Declined', 'Interview declined by admin on behalf of candidate.');
    
    // Update the invite record
    const storedInvites = localStorage.getItem('upcomingInvite');
    if (storedInvites) {
      try {
        const invites = JSON.parse(storedInvites);
        const inviteIndex = invites.findIndex((inv: any) => inv.id == candidate.id);
        if (inviteIndex !== -1) {
          invites[inviteIndex].stage = 'Declined';
          localStorage.setItem('upcomingInvite', JSON.stringify(invites));
        }
      } catch (e) {
        console.error('Error updating invite status:', e);
      }
    }
    
    this.messageService.add({
      severity: 'info',
      summary: 'Interview Declined',
      detail: `Interview declined for ${candidate.firstname} ${candidate.lastname}.`,
      life: 3000,
    });
  }
 
  onRequestDocs(candidate: Candidate): void {
    // TODO: open request docs modal
    console.log('Request docs', candidate.id);
  }
 
  onSendOffer(candidate: Candidate): void {
    // TODO: open offer letter modal
    console.log('Send offer', candidate.id);
  }
 
  downloadDocument(doc: CandidateDocument): void {
    // TODO: trigger download
    console.log('Download', doc.url);
  }
 
  runAiVetting(candidate: Candidate): void {
    // TODO: call AI vetting service
    console.log('Run AI vetting for', candidate.id);
  }


    getInitials(candidate: any): string {
     const fullName = `${candidate?.firstname || ''} ${candidate?.lastname || ''}`.trim();
    return fullName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
 
  getScoreClass(score: number): string {
    if (score >= 75) return 'score--high';
    if (score >= 50) return 'score--medium';
    return 'score--low';
  }

  getStatusBadgeClass(status: string): string {
    const statusMap: Record<string, string> = {
      'New': 'badge-secondary',
      'Shortlisted': 'badge-warning',
      'Rejected': 'badge-danger',
      'Invited': 'badge-info',
      'Interview Accepted': 'badge-success',
      'Interview Declined': 'badge-danger',
      'Offered': 'badge-primary',
      'Hired': 'badge-success'
    };
    return statusMap[status] || 'badge-secondary';
  }

  getInterviewStatusBadgeClass(status?: string): string {
    const statusMap: Record<string, string> = {
      'Not Invited': 'badge-secondary',
      'Invited': 'badge-info',
      'Accepted': 'badge-success',
      'Declined': 'badge-danger',
      'Completed': 'badge-primary'
    };
    return statusMap[status || 'Not Invited'] || 'badge-secondary';
  }

  onActionSelected(action: string) {
    this.currentAction = action;
    this.showInviteModal = true;
    this.isStepTwo = false;
    this.selectedInviteTemplate = null;
  }

// 4. Methods to handle transitions
  goToPreview() {
    if (!this.selectedInviteTemplate) return;
    
    // Initialize manual values for 'manual' (send-time) placeholders
    this.manualPlaceholderValues = {};
    this.selectedInviteTemplate.customPlaceholders.forEach(p => {
      this.manualPlaceholderValues[p.key] = '';
    });
    
    this.isStepTwo = true;
  }

  // 5. Logic to resolve placeholders before sending
  resolveFinalContent(text: string): string {
    // Database values (auto-resolved)
    const dbValues: Record<string, string> = {
      candidateName: `${this.selectedCandidate.firstname} ${this.selectedCandidate.lastname}`,
      jobTitle: this.selectedJob?.title || 'the position',
      companyName: this.regData?.companyName || 'N/A', 
      recruiterName: this.regData?.user?.username ||  'Recruiter',
      recruiterEmail: this.regData?.user?.email || 'recruiter@company.com',
      location: this.selectedJob?.location || 'Location',
      acceptButton: window.location.origin + '/interview-response?action=accept&candidateId=' + this.selectedCandidate.id,
      declineButton: window.location.origin + '/interview-response?action=decline&candidateId=' + this.selectedCandidate.id 
    };

    const allValues = { ...dbValues, ...this.manualPlaceholderValues };

    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => allValues[key] || `{{${key}}}`);
  }

  sendFinalMail(){
    console.log("sent")
    this.sendLoading = true;

    const body = {
      name: this.selectedCandidate.firstname,
      recieverEmail: this.selectedCandidate.email,
      subject: this.resolveFinalContent(this.selectedInviteTemplate?.subject || ''),
      body: this.resolveFinalContent(this.selectedInviteTemplate?.body || '')
    }
    this.mailService.sendMail(body).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Invite sent successfully',
          key: 'tl'
        });
        console.log("Invite sent successfully", res);

        switch (this.currentAction) {
          case 'Interview Invite':
            this.onSendInterview(this.selectedCandidate, body.body);
            break;
          case 'Shortlist':
            this.onShortlist(this.selectedCandidate);
            break;
          case 'Request Docs':
            this.onRequestDocs(this.selectedCandidate);
            break;
          case 'Offer':
            this.onSendOffer(this.selectedCandidate);
            break;
          case 'Rejection':
            this.onReject(this.selectedCandidate);
            break;
          default:
             break;
        }

          this.showInviteModal = false;
          this.isStepTwo = false;
          this.selectedInviteTemplate = null;
          this.sendLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to send invite',
          key: 'tl'
        });
        console.error("Error sending invite", err);
        this.sendLoading = false;

      }
    })
  }

  // Helper methods for status updates
  private updateCandidateStatus(candidate: Candidate, status: Candidate['status']): void {
    const candidateIndex = this.allApplications.findIndex(app => app.id === candidate.id);
    if (candidateIndex !== -1) {
      this.allApplications[candidateIndex].status = status;
      // Add to decision history
      this.addDecisionHistory(candidate, status);
      // Persist to localStorage or API
      this.persistCandidateData();
    }
  }

  private addDecisionHistory(candidate: Candidate, action: string, details?: string, emailCopy?: string): void {
    const candidateIndex = this.allApplications.findIndex(app => app.id === candidate.id);
    if (candidateIndex !== -1) {
      if (!this.allApplications[candidateIndex].decisionHistory) {
        this.allApplications[candidateIndex].decisionHistory = [];
      }
      this.allApplications[candidateIndex].decisionHistory!.push({
        date: new Date().toISOString(),
        action,
        details,
        emailCopy
      });
    }
  }

  private updateCandidateInterviewStatus(candidate: Candidate, interviewStatus: Candidate['interviewStatus']): void {
    const candidateIndex = this.allApplications.findIndex(app => app.id === candidate.id);
    if (candidateIndex !== -1) {
      this.allApplications[candidateIndex].interviewStatus = interviewStatus;
      // Persist to localStorage or API
      this.persistCandidateData();
    }
  }

  private persistCandidateData(): void {
    // For now, save to localStorage. In production, this would be an API call
    try {
      localStorage.setItem('candidateData', JSON.stringify(this.allApplications));
    } catch (error) {
      console.error('Error saving candidate data:', error);
    }
  }

  toggleEmailView(index: number): void {
    this.expandedEmails[index] = !this.expandedEmails[index];
  }

  getTimelineIcon(action: string): string {
    switch (action) {
      case 'Shortlisted':
        return 'fa-bookmark';
      case 'Interview Invited':
        return 'fa-calendar-check';
      case 'Interview Accepted':
        return 'fa-check-circle';
      case 'Interview Declined':
        return 'fa-times-circle';
      default:
        return 'fa-info-circle';
    }
  }

  // Helper methods to check if decision already made
  isInterviewInviteSent(candidate: Candidate): boolean {
    return candidate.status === 'Invited' || candidate.decisionHistory?.some(h => h.action === 'Interview Invited') || false;
  }

  isInterviewAccepted(candidate: Candidate): boolean {
    return candidate.interviewStatus === 'Accepted' || candidate.decisionHistory?.some(h => h.action === 'Interview Accepted') || false;
  }

  isInterviewDeclined(candidate: Candidate): boolean {
    return candidate.interviewStatus === 'Declined' || candidate.decisionHistory?.some(h => h.action === 'Interview Declined') || false;
  }

  isShortlisted(candidate: Candidate): boolean {
    return candidate.status === 'Shortlisted' || candidate.decisionHistory?.some(h => h.action === 'Shortlisted') || false;
  }

  getFilteredActionItems(): MenuItem[] {
    if (!this.selectedCandidate || !this.actionItems) return [];
    
    return this.actionItems.map(item => {
      const updatedItem = { ...item };
      
      // Check if action should be disabled
      if (item.label === 'Admin Accept Interview' && this.isInterviewAccepted(this.selectedCandidate)) {
        updatedItem.disabled = true;
      } else if (item.label === 'Admin Decline Interview' && this.isInterviewDeclined(this.selectedCandidate)) {
        updatedItem.disabled = true;
      } else if (item.label === 'Shortlist' && this.isShortlisted(this.selectedCandidate)) {
        updatedItem.disabled = true;
      } else {
        updatedItem.disabled = false;
      }
      
      return updatedItem;
    });
  }

  
  
}
