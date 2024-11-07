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
  applicantId?: string;
  fileURL: any;
  errorMessage: any;

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


    this.applicantId = this.randomToken.getRandomToken();
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

  // onFileChange(event: any, field: any): void {
  //   const file = event.target.files[0];  // Get the first selected file
  //   if (file) {
  //     // Dynamically store the file in formData using the transformed field label as the key
  //     this.formData[this.transformLabelToKey(field.label)] = file;
  //   }
  // }


  // onFileChange(event: Event) {
  //   const input = event.target as HTMLInputElement;
  //   if (input.files && input.files.length) {
  //     this.onFilePreview(input.files[0])
  //   }

  // }
  // onFilePreview(file: File){
  //   if (file) {
  //     const reader = new FileReader();
  //     reader.onload = (event: any) => {
  //       this.fileURL = event.target.result;
  //       console.log("----", this.fileURL)
  //     };
  //     reader.readAsDataURL(file);
  //   }
  // }
  

  // // Save entire form to localStorage on submit
  // saveFormData() {
  //   const candidateName = this.formData.fullName 
  //       || (this.formData.firstName && this.formData.lastName 
  //           ? `${this.formData.firstName} ${this.formData.lastName}`
  //           : '');

  //   const applicantInfo: ApplicantDTO = { 
  //     ...this.formData, 
  //     candidateName,
  //     resume: this.fileURL,
  //     id: this.applicantId, 
  //     position: this.job.category,
  //     dateApplied: new Date().toISOString(), // Capture the current date
  //     stage: ApplicationStage.ApplicationReceived,
  //   };
  //   console.log("candidate-info", applicantInfo)


  //   // Retrieve existing candidates from localStorage or initialize an empty array
  //   const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');

  //   // Push the new applicant info into the existing candidates array
  //   existingCandidates.push(applicantInfo);
  //   // console.log("candidate-file", existingCandidates)

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







    // Handles file input change dynamically
  onFileChange(event: Event, label: string) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      // Process the selected file for the specific input field (by label)
      this.onFilePreview(input.files[0], label);
    }
  }

  // Previews the file and stores it in the correct form data entry
  onFilePreview(file: File, label: string) {
    if (file) {
      const reader = new FileReader();
      reader.onload = (event: any) => {
        const fileURL = event.target.result;
        
        // Dynamically store the file URL for each label
        this.formData[this.transformLabelToKey(label)] = fileURL;
        console.log(`File for ${label}:`, fileURL);
      };
      reader.readAsDataURL(file);
    }
  }

  // Save form data (including multiple files) to localStorage
  saveFormData() {

    // Validate required fields
    for (let field of this.job.fields) {
      const fieldKey = this.transformLabelToKey(field.label);
      const fieldValue = this.formData[fieldKey];
      
      // Check if the field is required and if its value is empty
      if (field.required && (fieldValue === undefined || fieldValue === null || fieldValue === '')) {
        // Handle the validation error (e.g., display a message or prevent form submission)
        this.messageService.add({
          severity: 'error',
          summary: 'Validation Error',
          detail: `${field.label} is required.`,
        });
        return; // Stop execution if any required field is missing
      }
    }


    const candidateName = this.formData.fullName 
        || (this.formData.firstName && this.formData.lastName 
            ? `${this.formData.firstName} ${this.formData.lastName}` 
            : '');

    const applicantInfo: ApplicantDTO = { 
      ...this.formData, 
      candidateName,
      id: this.applicantId, 
      position: this.job.category,
      dateApplied: new Date().toISOString(), // Capture the current date
      stage: ApplicationStage.ApplicationReceived,
    };
    console.log("candidate-info", applicantInfo)

    // Retrieve existing candidates from localStorage or initialize an empty array
    const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');

    // Push the new applicant info into the existing candidates array
    existingCandidates.push(applicantInfo);

    // Save the updated candidates array back to localStorage
    localStorage.setItem('candidates', JSON.stringify(existingCandidates));

    // Optionally reset the formData
    this.formData = {};
    this.fileURL = '';

    this.messageService.add({
      severity: 'success', 
      summary: `Application Successful`,
      detail: `You have successfully applied for ${this.job.category}`
    });
  }

  


}