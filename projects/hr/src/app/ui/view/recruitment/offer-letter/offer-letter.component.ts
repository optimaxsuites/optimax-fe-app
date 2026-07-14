import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicantDTO, AttachmentDTO } from '../../../domain/applicant.dto';
// // import { CompanyProfileService }
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
  //   // get companyProfile$() { return this.companyProfileService.companyProfile$; }

  constructor() {}



  ngOnInit(): void {
    this.setTemplate(0)
    this.updateOfferSubject();
  }

  updateOfferSubject() {
    this.offerSubject = `Offer Letter For The Position Of ${this.getCandidatePosition()}`;
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
    <p>We are pleased to offer you the position of <b>[Job Title]</b> at <b>[Company Name]</b>.</p>
    <p>This offer follows the successful completion of your interview process. The detailed offer terms, compensation, start date, and reporting requirements are included in this letter or attached documents.</p>
    <p>Please review the offer and confirm your acceptance by replying to this message or signing the attached offer document.</p>
    <p>Best regards,<br />
    [Your Name]<br />
    [Your Job Title]<br />
    [Company Name]<br />
    [Contact Information]</p>`,
  
    `<p>Dear <b>[Candidate Name]</b>,</p>
    <p>Congratulations. We are excited to offer you the role of <b>[Job Title]</b> at <b>[Company Name]</b>.</p>
    <p>Your interview performance and experience stood out to the panel, and we believe you will make a strong contribution to the team.</p>
    <p>Kindly review the attached offer details and confirm your decision within the stated acceptance period.</p>
    <p>Best regards,<br />
    [Your Name]<br />
    [Your Job Title]<br />
    [Company Name]<br />
    [Contact Information]</p>`,
  
    `<p>Hi <b>[Candidate Name]</b>,</p>
    <p>Great news. We would like to offer you the <b>[Job Title]</b> role at <b>[Company Name]</b>.</p>
    <p>The panel completed its review and agreed to move forward with an offer. Please go through the offer details and let us know if you accept.</p>
    <p>We look forward to welcoming you to the team.</p>
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

  private getCandidateName(candidate: ApplicantDTO = this.candidate): string {
    return (
      candidate.candidateName ||
      candidate.fullName ||
      candidate.fullname ||
      `${candidate.firstname || candidate.firstName || ''} ${candidate.lastname || candidate.lastName || ''}`.trim()
    );
  }

  private getCandidatePosition(candidate: ApplicantDTO = this.candidate): string {
    return (
      candidate.position ||
      candidate['jobVacancy']?.jobTitle ||
      candidate['job']?.title ||
      candidate['jobVacancy']?.jobCategory?.name ||
      ''
    );
  }
}
