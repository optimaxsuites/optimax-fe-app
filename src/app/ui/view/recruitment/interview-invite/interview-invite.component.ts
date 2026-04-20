import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicantDTO, AttachmentDTO } from '../../../domain/applicant.dto';
import { MessageService } from 'primeng/api';

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

  constructor(
    private messageService: MessageService,
  ){}

  ngOnInit(): void {
    //Called after the constructor, initializing input properties, and the first call to ngOnChanges.
    //Add 'implements OnInit' to the class.
    this.setTemplate(0)
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
    };

    console.log("invite info from interview-Invite-component", inviteDetails)

    this.sendInterviewInvite.emit(inviteDetails);
  }

  // Validation function
  validateForm(): boolean {
    const requiredFields = [
      this.processedTemplate,
      this.selectedInterviewType
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
      .replace(/\[Candidate Name\]/g, `${candidate.firstName} ${candidate.lastName}`)
      .replace(/\[Job Title\]/g, candidate.position)
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


}
