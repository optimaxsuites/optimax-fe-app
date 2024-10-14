import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicantDTO } from 'src/app/ui/hr/domain/applicant.dto';
import { AttachmentDTO } from 'src/app/ui/sales/domain/quotation.dto';

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
    `Dear [Candidate Name],
  
  We are delighted to offer you the position of [Job Title] at [Company Name]. After careful consideration, we believe that your skills and experience align perfectly with our team, and we are excited to have you join us.
  
  Position: [Job Title]
  Start Date: [Start Date]
  Salary: [Salary]
  Benefits: [List of Benefits]
  
  Please review the details of this offer, and if you accept, we can proceed with the necessary documentation. We look forward to a positive response from you.
  
  Warm regards,
  [Your Name]
  [Your Job Title]
  [Company Name]
  [Contact Information]`,
  
    `Dear [Candidate Name],
  
  Congratulations! We are pleased to extend an offer for the [Job Title] role at [Company Name]. We were impressed with your background and are confident you will make valuable contributions to our team.
  
  Job Title: [Job Title]
  Starting Salary: [Salary]
  Start Date: [Start Date]
  Benefits: [List of Benefits]
  
  Please confirm your acceptance of this offer by [Response Deadline]. We look forward to welcoming you to the team!
  
  Best regards,
  [Your Name]
  [Your Job Title]
  [Company Name]
  [Contact Information]`,
  
    `Hi [Candidate Name],
  
  We’re thrilled to offer you the position of [Job Title] at [Company Name]! We can’t wait to see how your skills and energy will bring a new dynamic to our team.
  
  Here are the details of the offer:
  Position: [Job Title]
  Salary: [Salary]
  Start Date: [Start Date]
  Perks: [List of Benefits]
  
  Let us know if you’re on board by [Response Deadline]. Once confirmed, we’ll send over the paperwork and get you all set up. Welcome to the team!
  
  Cheers,
  [Your Name]
  [Your Job Title]
  [Company Name]
  [Contact Information]`
  ];
  



  // Function to replace placeholders with actual data
  replacePlaceholders(template: string, candidate: any): string {
    return template
      .replace(/\[Candidate Name\]/g, candidate.candidate)
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
