import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { InterviewPanelMemberDTO } from '../../../domain/applicant.dto';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { MessageService } from 'primeng/api';

interface PanelUserOption {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  label: string;
}

@Component({
  selector: 'app-invite-modal',
  templateUrl: './invite-modal.component.html',
  styleUrl: './invite-modal.component.scss',

})
export class InviteModalComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() header: string = '';
  @Input() currentAction: string = '';
  @Input() managePersistence: boolean = true;
  @Input() candidate: any; // Passed to resolve specific candidate placeholders
  
  @Output() close = new EventEmitter<void>();
  @Output() inviteSent = new EventEmitter<void>();
  @Output() inviteConfigured = new EventEmitter<any>();

  // Internal State
  isStepTwo: boolean = false;
  sendLoading: boolean = false;
  panelUsersLoading: boolean = false;
  
  templates: any[] = [];
  availablePanelUsers: any[] = [];
  
  selectedInviteTemplate: any = null;
  manualPlaceholderValues: any = {};
  interviewInviteSetup: any = {
    notes: '',
    panelMembers: [{ id: '', role: '', name: '', email: '' }]
  };


  constructor(
    private authenticationService: AuthenticationService,
    private mailService: MailNotificationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.panelUsersLoading = true;
    
    // Fetching templates and users based on the application's data patterns[cite: 3, 4]
    const storedTemplates = localStorage.getItem('settings.hr.mailTemplates')
    this.templates = storedTemplates ? JSON.parse(storedTemplates) : [];

    this.loadPanelUsers()
    this.panelUsersLoading = false;
  }

  private loadPanelUsers(): void {
    this.panelUsersLoading = true;
    console.log("Loading panel users...");

    this.authenticationService.getUsers().subscribe({
      next: (users) => {
        console.log("Raw users from API:", users);
        this.availablePanelUsers = Array.isArray(users)
          ? users
              .map((user: any) => this.mapUserToPanelOption(user))
              .filter((user): user is PanelUserOption => Boolean(user))
              .sort((a, b) => a.label.localeCompare(b.label))
          : [];
        console.log("Mapped panel users:", this.availablePanelUsers);
        this.interviewInviteSetup = {
          ...this.interviewInviteSetup,
          panelMembers: this.interviewInviteSetup.panelMembers.map((member: InterviewPanelMemberDTO) => this.mapPanelMember(member))
        };
        this.panelUsersLoading = false;
      },
      error: (error) => {
        console.error('Error loading panel users:', error);
        this.panelUsersLoading = false;
      }
    });
  }

    private mapUserToPanelOption(user: any): PanelUserOption | null {
      const id = String(user?.id || '').trim();
      const email = String(user?.email || '').trim();
      const username = String(user?.username || '').trim();
      const name = String(user?.fullname || user?.fullName || username || email).trim();
  
      if (!id || !email) {
        return null;
      }
  
      const role = this.resolveUserRole(user);
      const label = `${name}${role ? ` • ${role}` : ''} • ${email}`;
  
      return {
        id,
        username,
        name,
        email,
        role,
        label
      };
    }
  
    private resolveUserRole(user: any): string {
      if (typeof user?.appRole?.name === 'string' && user.appRole.name.trim()) {
        return user.appRole.name.trim();
      }
  
      if (typeof user?.role?.name === 'string' && user.role.name.trim()) {
        return user.role.name.trim();
      }
  
      if (Array.isArray(user?.roles) && user.roles.length > 0) {
        const firstRole = user.roles.find((role: any) => typeof role?.name === 'string' && role.name.trim());
        if (firstRole?.name) {
          return firstRole.name.trim();
        }
      }
  
      return 'Interviewer';
    }
  
    private mapPanelMember(member: InterviewPanelMemberDTO): InterviewPanelMemberDTO {
    const matchedUser = this.availablePanelUsers.find(user =>
      user.id === String(member.userId || member.id || '') ||
      user.email.toLowerCase() === String(member.email || '').toLowerCase()
    );
  
    return {
      ...member,
      panelId: (member as any).panelId || this.generateId('panel'),
      id: matchedUser?.id || member.id || member.userId || '',
      userId: matchedUser?.id || member.userId || member.id || '',
      username: matchedUser?.username || member.username || '',
      name: matchedUser?.name || member.name || '',
      role: member.role || matchedUser?.role || 'Interviewer',
      email: matchedUser?.email || member.email || ''
    };
  }
  
    private createEmptyPanelMember(): InterviewPanelMemberDTO {
    return {
      panelId: this.generateId('panel'), // row identity only
      id: '', // selected user id for dropdown binding
      userId: '',
      username: '',
      name: '',
      role: '',
      email: ''
    };
}

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  goToPreview() {
    if (this.selectedInviteTemplate) {
      // Initialize placeholders if the template defines them
      this.selectedInviteTemplate.customPlaceholders?.forEach((p: any) => {
        if (!this.manualPlaceholderValues[p.key]) {
          this.manualPlaceholderValues[p.key] = this.getDefaultPlaceholderValue(p.key);
        }
      });
      this.updateInterviewSetupFromPlaceholders();
      this.isStepTwo = true;
    }
  }

  addPanelMember() {
    this.interviewInviteSetup.panelMembers.push(this.createEmptyPanelMember());
  }

  removePanelMember(index: number) {
    this.interviewInviteSetup.panelMembers.splice(index, 1);
  }

  onPanelUserSelected(index: number, userId: string) {
    const user = this.availablePanelUsers.find(u => u.id === userId);
    if (user) {
      this.interviewInviteSetup.panelMembers[index].id = user.id;
      this.interviewInviteSetup.panelMembers[index].userId = user.id;
      this.interviewInviteSetup.panelMembers[index].username = user.username;
      this.interviewInviteSetup.panelMembers[index].name = user.name;
      this.interviewInviteSetup.panelMembers[index].email = user.email;
      this.interviewInviteSetup.panelMembers[index].role =
        this.interviewInviteSetup.panelMembers[index].role?.trim() || user.role || 'Interviewer';
    }
  }

  resolveFinalContent(content: string): string {
    if (!content) return '';

    const autoValues = this.getAutoPlaceholderValues();
    const allValues = { ...autoValues, ...this.manualPlaceholderValues };

    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      const value = allValues[key];
      return value === undefined || value === null || value === '' ? `{{${key}}}` : String(value);
    });
  }

  sendFinalMail() {
    this.sendLoading = true;
    this.updateInterviewSetupFromPlaceholders();
    const inviteDetails = this.buildInviteDetails();
    const mailBody = {
      name: this.getCandidateFirstName(),
      recieverEmail: String(this.candidate?.email || '').trim(),
      subject: inviteDetails.interviewSubject,
      body: inviteDetails.interviewInvite
    };

    if (!mailBody.recieverEmail) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Missing Email',
        detail: 'Candidate email is required before an interview invitation can be sent.'
      });
      this.sendLoading = false;
      return;
    }

    const completeSend = () => {
      this.sendLoading = false;
      if (this.managePersistence) {
        this.persistInvite(inviteDetails);
        this.inviteSent.emit();
      } else {
        this.inviteConfigured.emit(inviteDetails);
      }
      this.close.emit();
    };

    this.mailService.sendMail(mailBody).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Invite Sent',
          detail: `Interview invitation sent to ${this.getCandidateName() || 'candidate'}.`
        });
        completeSend();
      },
      error: (error) => {
        console.error('Error sending interview invitation:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Invite Failed',
          detail: error?.error?.message || 'Interview invitation mail could not be sent.'
        });
        this.sendLoading = false;
      }
    });
  }

  private persistInvite(inviteDetails: any): void {
    const invites = JSON.parse(localStorage.getItem('upcomingInvite') || '[]');
    const existingInviteIndex = invites.findIndex((invite: any) => invite.id === this.candidate?.id);
    const invitePayload = {
      ...this.candidate,
      stage: 'Awaiting Response',
      candidateResponse: undefined,
      interviewStage: Number(this.candidate?.interviewStage || 1),
      interviewSubject: inviteDetails.interviewSubject,
      interviewInvite: inviteDetails.interviewInvite,
      interviewType: inviteDetails.interviewType,
      scheduledDate: inviteDetails.scheduledDate,
      meetingDetails: {
        date: inviteDetails.scheduledDate,
        time: inviteDetails.scheduledTime,
        location: inviteDetails.location,
        interviewType: inviteDetails.interviewType,
        notes: inviteDetails.notes
      },
      interviewPanel: inviteDetails.panelMembers,
      status: 'Interview Invited'
    };

    if (existingInviteIndex === -1) {
      invites.push(invitePayload);
    } else {
      invites[existingInviteIndex] = invitePayload;
    }

    localStorage.setItem('upcomingInvite', JSON.stringify(invites));
    this.syncCandidateInviteLifecycle(inviteDetails);
  }

  private buildInviteDetails(): any {
    return {
      interviewSubject: this.resolveFinalContent(this.selectedInviteTemplate?.subject || ''),
      interviewInvite: this.resolveFinalContent(this.selectedInviteTemplate?.body || ''),
      interviewType: this.getPlaceholderValue(['interviewType']),
      scheduledDate: this.getPlaceholderValue(['scheduledDate', 'interviewDate', 'date']),
      scheduledTime: this.getPlaceholderValue(['scheduledTime', 'interviewTime', 'time']),
      location: this.getPlaceholderValue(['location', 'interviewLocation']),
      notes: this.getPlaceholderValue(['notes', 'interviewNotes']) || this.interviewInviteSetup.notes || '',
      panelMembers: this.interviewInviteSetup.panelMembers
        .map((member: InterviewPanelMemberDTO) => this.mapPanelMember(member))
        .filter((member: InterviewPanelMemberDTO) => Boolean(member.name || member.email || member.userId))
    };
  }

  private updateInterviewSetupFromPlaceholders(): void {
    this.interviewInviteSetup.scheduledDate = this.getPlaceholderValue(['scheduledDate', 'interviewDate', 'date']) || this.interviewInviteSetup.scheduledDate || '';
    this.interviewInviteSetup.scheduledTime = this.getPlaceholderValue(['scheduledTime', 'interviewTime', 'time']) || this.interviewInviteSetup.scheduledTime || '';
    this.interviewInviteSetup.interviewType = this.getPlaceholderValue(['interviewType', 'type', 'format']) || this.interviewInviteSetup.interviewType || '';
    this.interviewInviteSetup.location = this.getPlaceholderValue(['location', 'interviewLocation', 'meetingLink', 'link']) || this.interviewInviteSetup.location || '';
    this.interviewInviteSetup.notes = this.getPlaceholderValue(['notes', 'interviewNotes']) || this.interviewInviteSetup.notes || '';
  }

  private getAutoPlaceholderValues(): Record<string, string> {
    const candidateName = this.getCandidateName();
    const jobTitle = this.getCandidateJobTitle();
    const companyName = this.getCompanyName();
    const recruiterName = this.getRecruiterName();
    const recruiterEmail = this.getRecruiterEmail();

    return {
      name: candidateName,
      candidateName,
      firstName: this.getCandidateFirstName(),
      lastName: String(this.candidate?.lastname || this.candidate?.lastName || ''),
      job: jobTitle,
      jobTitle,
      position: jobTitle,
      companyName,
      recruiterName,
      recruiterEmail,
      location: this.interviewInviteSetup.location || this.getCandidateJobLocation(),
      interviewLocation: this.interviewInviteSetup.location || this.getCandidateJobLocation(),
      scheduledDate: this.interviewInviteSetup.scheduledDate || '',
      interviewDate: this.interviewInviteSetup.scheduledDate || '',
      date: this.interviewInviteSetup.scheduledDate || '',
      scheduledTime: this.interviewInviteSetup.scheduledTime || '',
      interviewTime: this.interviewInviteSetup.scheduledTime || '',
      time: this.interviewInviteSetup.scheduledTime || '',
      interviewType: this.interviewInviteSetup.interviewType || '',
      panelMembers: this.interviewInviteSetup.panelMembers
        .filter((member: InterviewPanelMemberDTO) => member.name || member.email)
        .map((member: InterviewPanelMemberDTO) => `${member.name || member.email}${member.role ? ` (${member.role})` : ''}`)
        .join(', '),
      acceptButton: `${window.location.origin}/interview-response?action=accept&candidateId=${this.candidate?.id || ''}`,
      declineButton: `${window.location.origin}/interview-response?action=decline&candidateId=${this.candidate?.id || ''}`
    };
  }

  private getDefaultPlaceholderValue(key: string): string {
    return this.getAutoPlaceholderValues()[key] || '';
  }

  private getPlaceholderValue(keys: string[]): string {
    for (const key of keys) {
      const value = this.manualPlaceholderValues[key];
      if (typeof value === 'string' && value.trim()) {
        return value.trim();
      }
    }

    return '';
  }

  private getCandidateName(): string {
    return (
      this.candidate?.fullName ||
      this.candidate?.fullname ||
      this.candidate?.candidateName ||
      `${this.candidate?.firstname || this.candidate?.firstName || ''} ${this.candidate?.lastname || this.candidate?.lastName || ''}`.trim()
    );
  }

  private getCandidateFirstName(): string {
    return String(this.candidate?.firstname || this.candidate?.firstName || this.getCandidateName().split(' ')[0] || 'Candidate');
  }

  private getCandidateJobTitle(): string {
    return (
      this.candidate?.position ||
      this.candidate?.jobVacancy?.jobTitle ||
      this.candidate?.job?.title ||
      this.candidate?.jobVacancy?.jobCategory?.name ||
      this.candidate?.job?.jobVacancy?.jobCategory?.name ||
      'the position'
    );
  }

  private getCandidateJobLocation(): string {
    return this.candidate?.jobVacancy?.location || this.candidate?.job?.location || '';
  }

  private getCompanyName(): string {
    const rawRegData = localStorage.getItem('userPrimaryInfoRegData') || sessionStorage.getItem('userPrimaryInfoRegData');
    if (!rawRegData) {
      return 'N/A';
    }

    try {
      const regData = JSON.parse(rawRegData);
      return regData?.companyName || regData?.company?.name || 'N/A';
    } catch {
      return 'N/A';
    }
  }

  private getRecruiterName(): string {
    const rawRegData = localStorage.getItem('userPrimaryInfoRegData') || sessionStorage.getItem('userPrimaryInfoRegData');
    if (!rawRegData) {
      return 'Recruiter';
    }

    try {
      const regData = JSON.parse(rawRegData);
      return regData?.user?.username || regData?.username || regData?.fullname || 'Recruiter';
    } catch {
      return 'Recruiter';
    }
  }

  private getRecruiterEmail(): string {
    const rawRegData = localStorage.getItem('userPrimaryInfoRegData') || sessionStorage.getItem('userPrimaryInfoRegData');
    if (!rawRegData) {
      return 'recruiter@company.com';
    }

    try {
      const regData = JSON.parse(rawRegData);
      return regData?.user?.email || regData?.email || 'recruiter@company.com';
    } catch {
      return 'recruiter@company.com';
    }
  }

  private syncCandidateInviteLifecycle(inviteDetails: any): void {
    if (!this.candidate?.id) {
      return;
    }

    const storedCandidates = localStorage.getItem('candidateData');
    if (!storedCandidates) {
      return;
    }

    try {
      const candidates = JSON.parse(storedCandidates);
      const candidateIndex = Array.isArray(candidates)
        ? candidates.findIndex((candidate: any) => candidate.id === this.candidate.id)
        : -1;

      if (candidateIndex === -1) {
        return;
      }

      const candidate = candidates[candidateIndex];
      const candidateName = this.getCandidateName() || 'Candidate';

      candidates[candidateIndex] = {
        ...candidate,
        status: 'Invited',
        interviewStatus: 'Invited',
        interviewDetails: {
          ...(candidate.interviewDetails || {}),
          scheduledDate: inviteDetails.scheduledDate,
          location: inviteDetails.location,
          format: inviteDetails.interviewType,
          notes: inviteDetails.notes
        },
        decisionHistory: [
          ...(candidate.decisionHistory || []),
          {
            date: new Date().toISOString(),
            action: 'Interview Invited',
            details: `${candidateName} was invited for interview ${Number(this.candidate?.interviewStage || 1)}.`,
            emailCopy: inviteDetails.interviewInvite
          }
        ]
      };

      localStorage.setItem('candidateData', JSON.stringify(candidates));
    } catch (error) {
      console.error('Error syncing candidate invite lifecycle:', error);
    }
  }
}
