import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';
import { InterviewPanelMemberDTO } from '../../../domain/applicant.dto';

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
  @Input() candidate: any; // Passed to resolve specific candidate placeholders
  
  @Output() close = new EventEmitter<void>();
  @Output() inviteSent = new EventEmitter<void>();

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


  constructor(private authenticationService: AuthenticationService) {}

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
      this.isStepTwo = true;
      // Initialize placeholders if the template defines them
      this.selectedInviteTemplate.customPlaceholders?.forEach((p: any) => {
        if (!this.manualPlaceholderValues[p.key]) {
          this.manualPlaceholderValues[p.key] = '';
        }
      });
    }
  }

  addPanelMember() {
    this.interviewInviteSetup.panelMembers.push({ id: '', role: '', name: '', email: '', userId: '', username: '' });
  }

  removePanelMember(index: number) {
    this.interviewInviteSetup.panelMembers.splice(index, 1);
  }

  onPanelUserSelected(index: number, userId: string) {
    const user = this.availablePanelUsers.find(u => u.id === userId);
    if (user) {
      this.interviewInviteSetup.panelMembers[index].name = user.label;
      this.interviewInviteSetup.panelMembers[index].email = user.email;
    }
  }

  resolveFinalContent(content: string): string {
    if (!content) return '';
    let processed = content;
    
    // Replace manual placeholders
    Object.keys(this.manualPlaceholderValues).forEach(key => {
      processed = processed.replace(new RegExp(`{{${key}}}`, 'g'), this.manualPlaceholderValues[key]);
    });

    // Replace candidate-specific placeholders based on candidate data[cite: 3, 4]
    const candidateName = `${this.candidate?.firstname || ''} ${this.candidate?.lastname || ''}`.trim();
    processed = processed.replace(/{{candidateName}}/g, candidateName);
    
    return processed;
  }

  sendFinalMail() {
    this.sendLoading = true;
    
    // Logic follows the "upcomingInvite" structure used in the response component
    const invitePayload = {
      ...this.candidate,
      interviewPanel: this.interviewInviteSetup.panelMembers,
      meetingDetails: {
        notes: this.interviewInviteSetup.notes,
        ...this.manualPlaceholderValues
      },
      status: 'Interview Invited'
    };

    // Update local storage tracking
    const invites = JSON.parse(localStorage.getItem('upcomingInvite') || '[]');
    invites.push(invitePayload);
    localStorage.setItem('upcomingInvite', JSON.stringify(invites));

    setTimeout(() => {
      this.sendLoading = false;
      this.inviteSent.emit();
      this.close.emit();
    }, 1000);
  }
}