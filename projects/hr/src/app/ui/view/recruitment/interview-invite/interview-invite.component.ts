import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicantDTO, AttachmentDTO, InterviewPanelMemberDTO } from '../../../domain/applicant.dto';
import { MessageService } from 'primeng/api';
import { AuthenticationService } from '../../../shared-component/service/auth-service/authentication.service';

interface InterviewInviteDraft {
  scheduledDate: string;
  scheduledTime: string;
  location: string;
  notes: string;
  panelMembers: InterviewPanelMemberDTO[];
}

interface PanelUserOption {
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  label: string;
}

@Component({
  selector: 'app-interview-invite',
  templateUrl: './interview-invite.component.html',
  styleUrl: './interview-invite.component.scss',
  providers: [MessageService]
})
export class InterviewInviteComponent {
  @Output() back = new EventEmitter<void>();
  @Input() interview: any; // Ensure this input property is set
  @Output() sendInterviewInvite = new EventEmitter<any>();
  @Input() candidate: ApplicantDTO = {};
  activeTemplateIndex: number | null = null;
  selectedTemplate?: string;
  processedTemplate?: string;
  selectedInterviewType?: string;
  attachments?: AttachmentDTO[] = [];
  inviteDraft: InterviewInviteDraft = this.createInviteDraft();
  availablePanelUsers: PanelUserOption[] = [];
  panelUsersLoading = false;

  constructor(
    private messageService: MessageService,
    private authenticationService: AuthenticationService,
  ){}

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.setTemplate(0)
    this.selectedInterviewType = this.candidate?.interviewType || this.candidate?.meetingDetails?.interviewType || 'Virtual Interview';
    this.inviteDraft = this.createInviteDraft();
    this.loadPanelUsers();
    console.log("active candidate", this.candidate)
  }


  handleSendInvite() {
    const isValid = this.validateForm();
    if (!isValid) {
      this.messageService.add({
        severity: 'error', 
        summary: 'Validation Failed',
        detail: 'Please fill out all fields before submitting the form.' 
      });    
      return; 
    }
    const inviteDetails = {
      interviewType: this.selectedInterviewType,
      interviewInvite: this.processedTemplate,
      inviteAttachments: this.attachments,
      scheduledDate: this.inviteDraft.scheduledDate || this.candidate?.['scheduledDate'],
      scheduledTime: this.inviteDraft.scheduledTime,
      location: this.inviteDraft.location,
      notes: this.inviteDraft.notes,
      panelMembers: this.inviteDraft.panelMembers,
    };

    console.log("invite info from interview-Invite-component", inviteDetails)

    this.sendInterviewInvite.emit(inviteDetails);
  }

  // Validation function
  validateForm(): boolean {
    const requiredFields = [
      this.processedTemplate,
      this.selectedInterviewType,
      this.inviteDraft.scheduledDate,
      this.inviteDraft.scheduledTime,
      this.inviteDraft.location,
      this.inviteDraft.panelMembers.length > 0 && this.inviteDraft.panelMembers.every(member => member.name.trim() && member.role.trim() && member.email.trim())
    ];

    return requiredFields.every(field => field);
  }


  // Method to trigger back button event
  goBack() {
    this.back.emit();
  }


  templates: string[] = [
    `<p>Dear <b>[Candidate Name]</b>,</p>
    <p>We are pleased to inform you that you have been shortlisted for an interview for the position of <b>[Job Title]</b> at <b>[Company Name]</b>.</p>
    <p><b>Interview Details:</b><br />
    Date: <b>[Interview Date]</b><br />
    Time: <b>[Interview Time]</b><br />
    Location: <b>[Interview Location] / [Online Meeting Link]</b><br />
    Interview Type: <b>[In-person/Virtual]</b></p>
    <p>Please let us know if the scheduled time works for you or if you need to reschedule.</p>
    <p>If the interview is virtual, kindly ensure you have a stable internet connection and the necessary software installed. Attached are instructions for joining the online meeting.</p>
    <p>We look forward to speaking with you and learning more about your qualifications.</p>
    <p>Best regards,<br />
    [Your Name]<br />
    [Your Job Title]<br />
    [Company Name]<br />
    [Contact Information]</p>`,
  
    `<p>Dear <b>[Candidate Name]</b>,</p>
    <p>We are excited to invite you to an interview for the position of <b>[Job Title]</b> at <b>[Company Name]</b>. Your application has impressed us, and we are eager to learn more about you.</p>
    <p><b>Interview Details:</b><br />
    Date: <b>[Interview Date]</b><br />
    Time: <b>[Interview Time]</b><br />
    Location: <b>[Interview Location] / [Online Meeting Link]</b><br />
    Interview Format: <b>[In-person/Virtual]</b><br />
    Duration: <b>[Estimated Interview Duration]</b></p>
    <p>Please confirm your availability for this date and time. If you are unable to attend, let us know as soon as possible, and we will do our best to accommodate a rescheduled interview.</p>
    <p>If this is a virtual interview, please ensure your setup includes a quiet environment and a reliable internet connection. Further instructions will be provided in a follow-up email.</p>
    <p>We look forward to speaking with you soon!</p>
    <p>Best regards,<br />
    [Your Name]<br />
    [Your Job Title]<br />
    [Company Name]<br />
    [Contact Information]</p>`,
  
    `<p>Hi <b>[Candidate Name]</b>,</p>
    <p>Great news! We’d love to get to know you better and chat about the <b>[Job Title]</b> role at <b>[Company Name]</b>. Your application stood out, and we think you could be a great fit for the team.</p>
    <p><b>Here are the interview details:</b><br />
    Date: <b>[Interview Date]</b><br />
    Time: <b>[Interview Time]</b><br />
    Location: <b>[Interview Location] / [Online Meeting Link]</b><br />
    Interview Style: <b>[In-person/Virtual]</b></p>
    <p>We’re excited to hear more about your experience and what you’d bring to the team. If the time doesn’t work for you, no worries! Just let us know, and we’ll find another time that suits you.</p>
    <p>For virtual interviews, make sure you’re in a quiet space with a good internet connection. We’ll send any necessary links and instructions ahead of time.</p>
    <p>Looking forward to our chat!</p>
    <p>Best,<br />
    [Your Name]<br />
    [Your Job Title]<br />
    [Company Name]<br />
    [Contact Information]</p>`
  ];



  // Function to replace placeholders with actual data
  replacePlaceholders(template: string, candidate: any): string {
    return template
      .replace(/\[Candidate Name\]/g, this.getCandidateName(candidate))
      .replace(/\[Job Title\]/g, this.getCandidatePosition(candidate))
      .replace(/\[Interview Date\]/g, this.inviteDraft.scheduledDate || candidate['scheduledDate'] || '[Interview Date]')
      .replace(/\[Interview Time\]/g, this.inviteDraft.scheduledTime || candidate['meetingDetails']?.time || '[Interview Time]')
      .replace(/\[Interview Location\]/g, this.inviteDraft.location || candidate['meetingDetails']?.location || '[Interview Location]')
      .replace(/\[In-person\/Virtual\]/g, this.selectedInterviewType || candidate['meetingDetails']?.interviewType || '[In-person/Virtual]')
      // .replace(/\[Company Name\]/g, 'Centrifuge Info Tech'); // You can dynamically set company name if needed
  }

  // Call this when initializing or changing template
  setTemplate(templateIndex: number) {
    if (this.candidate) {
      this.selectedTemplate = this.templates[templateIndex];
      this.processedTemplate = this.replacePlaceholders(this.selectedTemplate, this.candidate);
      this.activeTemplateIndex = templateIndex;
    }
  }
  // This function is called when the textarea is edited
  onTemplateEdit(newTemplate: string) {
    this.processedTemplate = newTemplate; // Update processed template with user edits
  }

  onFileSelected(event: any) {
    const file = event.target.files[0]; // Get the selected file
    if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const attachment: AttachmentDTO = {
                name: file.name,
                url: e.target.result, // Create a URL for the file\
                size: file.size, // Add the file size
                type: file.type  // Add the file type
            };

            // Initialize attachments if it is undefined
            if (!this.attachments) {
                this.attachments = []; // Initialize as an empty array
            }

            this.attachments.push(attachment); // Add attachment to the array
            console.log("this is the attached file", this.attachments); // This should show the correct value
        };
        reader.readAsDataURL(file); // Read the file as a data URL
    }
  } 

  getTemplateName(index: number): string {
    const templateNames = [
      'Formal Invitation Template',
      'Excited Invitation Template',
      'Casual Chat Invitation Template'
    ];
    return templateNames[index];
  }

  // Define all interview types
  interviewType = [
    { id: 1, type: 'Virtual Interview' },
    { id: 2, type: 'Physical Interview' },
  ];



  interviewTypeChange() {
    console.log('Selected Interview Type(s):', this.selectedInterviewType);
  }

  addPanelMember(): void {
    this.inviteDraft.panelMembers = [
      ...this.inviteDraft.panelMembers,
      this.createEmptyPanelMember()
    ];
  }

  removePanelMember(index: number): void {
    this.inviteDraft.panelMembers = this.inviteDraft.panelMembers.filter((_, currentIndex) => currentIndex !== index);
  }

  onPanelUserSelected(index: number, selectedUserId: string): void {
    const selectedUser = this.availablePanelUsers.find(user => user.id === selectedUserId);
    const currentMember = this.inviteDraft.panelMembers[index];

    if (!currentMember) {
      return;
    }

    if (!selectedUser) {
      this.inviteDraft.panelMembers[index] = {
        ...currentMember,
        userId: '',
        username: '',
        name: '',
        email: ''
      };
      return;
    }

    this.inviteDraft.panelMembers[index] = {
      ...currentMember,
      id: selectedUser.id,
      userId: selectedUser.id,
      username: selectedUser.username,
      name: selectedUser.name,
      email: selectedUser.email,
      role: currentMember.role?.trim() || selectedUser.role || 'Interviewer'
    };
  }

  getPanelUserOptions(selectedUserId?: string): PanelUserOption[] {
    const selectedIds = new Set(
      this.inviteDraft.panelMembers
        .map(member => member.userId)
        .filter((userId): userId is string => Boolean(userId))
    );

    return this.availablePanelUsers.filter(user => user.id === selectedUserId || !selectedIds.has(user.id));
  }

  getCandidateName(candidate: ApplicantDTO = this.candidate): string {
    return (
      candidate.candidateName ||
      candidate.fullName ||
      candidate.fullname ||
      `${candidate.firstname || candidate.firstName || ''} ${candidate.lastname || candidate.lastName || ''}`.trim()
    );
  }

  getCandidatePhone(candidate: ApplicantDTO = this.candidate): string {
    return candidate.contactNo || candidate['phone'] || '';
  }

  getCandidatePosition(candidate: ApplicantDTO = this.candidate): string {
    return (
      candidate.position ||
      candidate['jobVacancy']?.jobTitle ||
      candidate['job']?.title ||
      candidate['jobVacancy']?.jobCategory?.name ||
      ''
    );
  }

  private createInviteDraft(): InterviewInviteDraft {
    return {
      scheduledDate: this.candidate?.['meetingDetails']?.date || this.candidate?.['scheduledDate'] || '',
      scheduledTime: this.candidate?.['meetingDetails']?.time || '',
      location: this.candidate?.['meetingDetails']?.location || '',
      notes: this.candidate?.['meetingDetails']?.notes || '',
      panelMembers: this.candidate?.['interviewPanel']?.length
        ? this.candidate['interviewPanel'].map((member: InterviewPanelMemberDTO) => this.mapPanelMember(member))
        : [this.createEmptyPanelMember()]
    };
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private loadPanelUsers(): void {
    this.panelUsersLoading = true;

    this.authenticationService.getUsers().subscribe({
      next: (users) => {
        this.availablePanelUsers = Array.isArray(users)
          ? users
              .map((user: any) => this.mapUserToPanelOption(user))
              .filter((user): user is PanelUserOption => Boolean(user))
              .sort((a, b) => a.label.localeCompare(b.label))
          : [];
        this.inviteDraft = {
          ...this.inviteDraft,
          panelMembers: this.inviteDraft.panelMembers.map(member => this.mapPanelMember(member))
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
      user.id === String(member.userId || '') || user.email.toLowerCase() === String(member.email || '').toLowerCase()
    );

    return {
      ...member,
      id: member.id || this.generateId('panel'),
      userId: matchedUser?.id || member.userId || '',
      username: matchedUser?.username || member.username || '',
      name: matchedUser?.name || member.name || '',
      role: member.role || matchedUser?.role || 'Interviewer',
      email: matchedUser?.email || member.email || ''
    };
  }

  private createEmptyPanelMember(): InterviewPanelMemberDTO {
    return {
      id: '',
      panelId: this.generateId('panel'),
      userId: '',
      username: '',
      name: '',
      role: '',
      email: ''
    };
  }


}
