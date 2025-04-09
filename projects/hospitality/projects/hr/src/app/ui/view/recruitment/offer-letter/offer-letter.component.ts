import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicantDTO, AttachmentDTO } from '../../../domain/applicant.dto';
// import { ApplicantDTO, AttachmentDTO } from 'src/app/ui/hr/domain/applicant.dto';

@Component({
  selector: 'app-offer-letter',
  templateUrl: './offer-letter.component.html',
  styleUrl: './offer-letter.component.scss'
})
export class OfferLetterComponent {
  @Output() back = new EventEmitter<void>();
  @Input() interview: any; // Ensure this input property is set
  @Output() submitFrom = new EventEmitter<any>();
  @Input() candidate: ApplicantDTO = {};
  activeTemplateIndex: number | null = null;
  selectedTemplate?: string;
  processedTemplate?: string;
  offerSubject?: string;
  attachments?: AttachmentDTO[] = [];



  ngOnInit(): void {
    this.setTemplate(0)
    this.updateOfferSubject();
  }

  updateOfferSubject() {
    this.offerSubject = `Offer Letter For The Position Of ${this.candidate.position}`;
  }

  handleSendOffer() {
    const offerDetails = {
      offerSubject: this.offerSubject,
      offerLetter: this.processedTemplate,
      offerAttachments: this.attachments,
    };

    console.log("sending the offer from offer-component", offerDetails)

    this.submitFrom.emit(offerDetails);
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
      .replace(/\[Company Name\]/g, 'Centrifuge Info Tech'); // You can dynamically set company name if needed
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

  getTemplateName(index: number): string {
    const templateNames = [
      'Formal Offer Letter',
      'Congratulatory Offer Letter',
      'Casual Offer Letter'
    ];
    return templateNames[index];
  }

  onFileSelected(event: any) {
    const file = event.target.files[0]; // Get the selected file
    if (file) {
        const reader = new FileReader();
        reader.onload = (e: any) => {
            const attachment: AttachmentDTO = {
                name: file.name,
                url: e.target.result, // Create a URL for the file
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
}
