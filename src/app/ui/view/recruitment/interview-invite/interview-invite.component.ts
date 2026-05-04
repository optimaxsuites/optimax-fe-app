import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { ApplicantDTO, InterviewPanelMemberDTO } from '../../../domain/applicant.dto';
import { MailNotificationService } from '../../../service/mailNotification.service';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-interview-invite',
  templateUrl: './interview-invite.component.html'
})
export class InterviewInviteComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() candidate: any;
  @Input() currentAction: string = 'Interview Invite';
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() onComplete = new EventEmitter<any>();

  templates: any[] = [];
  selectedInviteTemplate: any;
  isStepTwo: boolean = false;
  sendLoading: boolean = false;
  availablePanelUsers: any[] = [];
  regData = {}

  interviewInviteSetup = {
    panelMembers: [] as InterviewPanelMemberDTO[],
    customResponses: {} as Record<string, string>
  };

  constructor(
    private mailService: MailNotificationService,
    private authService: AuthenticationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadTemplates();
    this.loadPanelUsers();
    this.addPanelMember(); // Initialize with one member
  }

  loadTemplates() {
    const saved = localStorage.getItem('settings.hr.mailTemplates');
    this.templates = saved ? JSON.parse(saved) : [];

    const userPrimaryInfoRegData = localStorage.getItem('userPrimaryInfoRegData');
    this.regData = userPrimaryInfoRegData ? JSON.parse(userPrimaryInfoRegData) : null;

  }

  loadPanelUsers() {
    this.authService.getUsers().subscribe(users => {
      this.availablePanelUsers = users.map((u: { username: any; id: any; email: any; }) => ({
        label: u.username,
        id: u.id,
        email: u.email
      }));
    });
  }

  goToPreview() {
    if (this.selectedInviteTemplate) {
      this.isStepTwo = true;
    }
  }

  addPanelMember() {
    const member: InterviewPanelMemberDTO = {
      id: Math.random().toString(36).substr(2, 9),
      userId: '',
      role: 'Interviewer',
      email: '',
      panelId: "",
      name: ""
    };
    this.interviewInviteSetup.panelMembers.push(member);
  }

  removePanelMember(index: number) {
    if (this.interviewInviteSetup.panelMembers.length > 1) {
      this.interviewInviteSetup.panelMembers.splice(index, 1);
    }
  }

  onUserSelect(member: any) {
    const user = this.availablePanelUsers.find(u => u.id === member.userId);
    if (user) {
      member.email = user.email;
    }
  }

  resolveFinalContent(content: string): string {
    if (!content) return '';
    let processed = content;
    // Replace placeholders like {{name}} or {{job}} based on candidate input
    processed = processed.replace(/{{name}}/g, `${this.candidate?.firstname} ${this.candidate?.lastname}`);
    
    // Map custom field responses
    Object.keys(this.interviewInviteSetup.customResponses).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processed = processed.replace(regex, this.interviewInviteSetup.customResponses[key]);
    });
    
    return processed;
  }

  sendFinalMail() {
    this.sendLoading = true;
    const payload = {
      templateId: this.selectedInviteTemplate.id,
      candidateId: this.candidate.id,
      panel: this.interviewInviteSetup.panelMembers,
      content: this.resolveFinalContent(this.selectedInviteTemplate.body)
    };

    this.onComplete.emit(payload);

    // this.mailService.sendInterviewInvite(payload).subscribe({
    //   next: () => {
    //     this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Invite Sent' });
    //     this.close();
        
    //   },
    //   error: () => { this.sendLoading = false; }
    // });
  }

  close() {
    this.visible = false;
    this.visibleChange.emit(false);
    this.isStepTwo = false;
  }
}