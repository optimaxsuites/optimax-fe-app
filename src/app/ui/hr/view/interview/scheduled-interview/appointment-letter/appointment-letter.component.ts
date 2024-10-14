import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ApplicantDTO, AttachmentDTO } from 'src/app/ui/hr/domain/applicant.dto';

@Component({
  selector: 'app-appointment-letter',
  templateUrl: './appointment-letter.component.html',
  styleUrl: './appointment-letter.component.scss'
})
export class AppointmentLetterComponent {
  @Output() back = new EventEmitter<void>();
  @Input() interview: any; // Ensure this input property is set
  @Output() submitFrom = new EventEmitter<any>();
  @Input() candidate: ApplicantDTO = {};
  activeTemplateIndex: number | null = null;
  selectedTemplate?: string;
  processedTemplate?: string;
  appointmentSubject?: string;
  attachments?: AttachmentDTO[] = [];



  ngOnInit(): void {
    this.setTemplate(0)
    this.updateSubject();
  }

  updateSubject() {
    this.appointmentSubject = `Appointment Letter For The Position Of ${this.candidate.position}`;
  }

  handleSendAppointment() {
    const appointmentDetails = {
      appointmentSubject: this.appointmentSubject,
      appointmentLetter: this.processedTemplate,
      appointmentAttachments: this.attachments,
    };

    console.log("sending the offer from appointment-component", appointmentDetails)

    this.submitFrom.emit(appointmentDetails);
  }

  // Method to trigger back button event
  goBack() {
    this.back.emit();
  }


  templates: string[] = [
    `Dear [Candidate Name],
    
    We are delighted to offer you the position of [Job Title] at [Company Name]. After careful consideration, we believe that your skills and experience align perfectly with our team, and we are excited to have you join us.

    Instructions
    Use the link below to complete your paperwork and get setup.
    Use your firstname and lastname as credentials to login and get started on the paperwork. Opon completeion of your paperwork you are strongly advised to change you login credentials.
    
    Please find attached your formal appointment letter, which outlines the details of your role and other relevant information. We look forward to a positive response from you.
    
    Warm regards,
    [Your Name]
    [Your Job Title]
    [Company Name]
    [Contact Information]`,
  
    `Dear [Candidate Name],
    
    Congratulations! We are pleased to extend an offer for the [Job Title] role at [Company Name]. We were impressed with your background and are confident you will make valuable contributions to our team.
    
    Instructions
    Use the link below to complete your paperwork and get setup.
    Use your firstname and lastname as credentials to login and get started on the paperwork. Opon completeion of your paperwork you are strongly advised to change you login credentials.

    Enclosed is your official appointment letter as an attachment. We look forward to welcoming you to the team!
    
    Best regards,
    [Your Name]
    [Your Job Title]
    [Company Name]
    [Contact Information]`,
  
    `Hi [Candidate Name],
    
    We’re thrilled to offer you the position of [Job Title] at [Company Name]! We can’t wait to see how your skills and energy will bring a new dynamic to our team.
    
    Instructions
    Use the link below to complete your paperwork and get setup.
    Use your firstname and lastname as credentials to login and get started on the paperwork. Opon completeion of your paperwork you are strongly advised to change you login credentials.

    Find the attached file the official appointment letter. Welcome to the team!
    
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
