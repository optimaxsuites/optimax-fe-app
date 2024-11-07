import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RandomTokenService } from '../../service/random-token/random-token.service';
import { ApplicantDTO, ApplicationStage } from 'src/app/ui/hr/domain/applicant.dto';
import { MessageModule } from 'primeng/message';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-job-application-form',
  templateUrl: './job-application-form.component.html',
  styleUrl: './job-application-form.component.scss',
  providers: [MessageService]

})
export class JobApplicationFormComponent {
  job: any; // Define a property to hold job data

  constructor(
    private route: ActivatedRoute,
    private randomToken: RandomTokenService,
    private messageService: MessageService
  ) {
    // this.loadFormData();
  }

  ngOnInit(): void {
    // Get the job id from the route parameters
    const jobId = this.route.snapshot.paramMap.get('id');

    if (jobId) {
      // Fetch job data from localStorage
      const jobData = JSON.parse(localStorage.getItem('jobData') || '[]');
      this.job = jobData.find((job: any) => job.id === jobId);
    }
    console.log('job info', this.job)

    this.job.fields.forEach((field: { label: string; }) => {
      const transformedLabel = this.transformLabelToKey(field.label);
      console.log('Original Label:', field.label, '| Transformed Key:', transformedLabel);
    });
  }

  formData: any = {};


  // Load data from localStorage
  // loadFormData() {
  //   const savedData = localStorage.getItem('candidates');
  //   if (savedData) {
  //     this.formData = JSON.parse(savedData);
  //   }
  // }

  // // Save individual field to localStorage
  saveField(fieldLabel: string) {
    // localStorage.setItem('candidates', JSON.stringify(this.formData));
  }

  transformLabelToKey(label: string): string {
    return label
        .replace(/\s+(.)/g, (match, char) => char.toUpperCase()) // Convert spaces to camelCase
        .replace(/\s+/g, '') // Remove any remaining spaces
        .replace(/^./, char => char.toLowerCase()); // Ensure the first letter is lowercase
  }

  // Save entire form to localStorage on submit
  // saveFormData() {
  //   const candidateName = this.formData.fullName 
  //       || (this.formData.firstName && this.formData.lastName 
  //           ? `${this.formData.firstName} ${this.formData.lastName}`
  //           : '');

  //   const applicantInfo: ApplicantDTO = { 
  //     ...this.formData, 
  //     candidateName,
  //     id: this.randomToken.getRandomToken(), 
  //     position: this.job.category,
  //     dateApplied: new Date().toISOString(), // Capture the current date
  //     stage: ApplicationStage.ApplicationReceived,
  //   };

  //   // delete applicantInfo.firstName;
  //   // delete applicantInfo.lastName;
  //   // delete applicantInfo.fullName;

  //   // Retrieve existing candidates from localStorage or initialize an empty array
  //   const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');

  //   // Push the new applicant info into the existing candidates array
  //   existingCandidates.push(applicantInfo);

  //   // Save the updated candidates array back to localStorage
  //   localStorage.setItem('candidates', JSON.stringify(existingCandidates));

  //   // Optionally reset the formData
  //   this.formData = {}; // Or set it back to its initial state

  //   this.messageService.add({
  //       severity: 'success', 
  //       summary: `Application Successful`,
  //       detail: `You have successfully applied for ${this.job.category}`
  //   });

  // // this.formData = []
  //   // alert(`Form data saved successfully with ID: ${id} and Position: ${position}`);
  // }

  saveFormData() {
    // Combine first name and last name or use full name
    const candidateName = this.formData.fullName || 
      (this.formData.firstName && this.formData.lastName ? `${this.formData.firstName} ${this.formData.lastName}` : '');
  
    // Create applicant info (excluding the CV file for now)
    const applicantInfo: ApplicantDTO = { 
      ...this.formData, 
      candidateName,
      id: this.randomToken.getRandomToken(),  // Unique ID
      position: this.job.category,  // The job category
      dateApplied: new Date().toISOString(),  // Capture current date as ISO string
      stage: ApplicationStage.ApplicationReceived,  // Stage when application is received
    };
  
  // Loop through the form fields to check for file input fields (such as resume)
  const filePromises: Promise<void>[] = []; // Array to hold file conversion promises

  for (const field of this.job.fields) {
    if (field.type === 'file' && this.formData[this.transformLabelToKey(field.label)]) {
      const file = this.formData[this.transformLabelToKey(field.label)];  // Get the file from formData

      // If a file is present and it's a CV (resume), convert it to base64
      if (field.label.toLowerCase() === 'cv' || field.label.toLowerCase() === 'resume') {
        const filePromise = this.convertFileToBase64(file).then((base64File) => {
          applicantInfo.resume = base64File; // Store the base64 file in the resume field
        });
        filePromises.push(filePromise);
      }
    }
  }
  
    // Wait for all file conversions to finish
    Promise.all(filePromises).then(() => {
      // Retrieve existing candidates from localStorage or initialize an empty array if none exists
      const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');
  
      // Push the new applicant info into the existing candidates array
      existingCandidates.push(applicantInfo);
  
      // Save the updated candidates array back to localStorage
      localStorage.setItem('candidates', JSON.stringify(existingCandidates));
  
      // Optionally, reset the formData
      this.formData = {};  // Clears form data after submission
  
      // Notify the user of successful submission
      this.messageService.add({
        severity: 'success', 
        summary: 'Application Successful',
        detail: `You have successfully applied for ${this.job.category}`
      });
    });
  }
  
  // Method to convert file to base64 string
  convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);  // Return base64 string
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);  // Convert file to base64
    });
  }
  
}