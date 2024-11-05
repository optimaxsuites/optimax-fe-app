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
        .charAt(0).toLowerCase() + label.slice(1); // Ensure the first letter is lowercase
  }

  // Save entire form to localStorage on submit
  saveFormData() {
    const applicantInfo: ApplicantDTO = { 
      ...this.formData, 
      candidateName: this.formData.fullName || (this.formData.firstName ? `${this.formData.firstName} ${this.formData.lastName}` : ''),
      id: this.randomToken.getRandomToken(), 
      position: this.job.category,
      dateApplied: new Date().toISOString(), // Capture the current date
      stage: ApplicationStage.ApplicationReceived,
    };

    // Retrieve existing candidates from localStorage or initialize an empty array
    const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');

    // Push the new applicant info into the existing candidates array
    existingCandidates.push(applicantInfo);

    // Save the updated candidates array back to localStorage
    localStorage.setItem('candidates', JSON.stringify(existingCandidates));

    // Optionally reset the formData
    this.formData = {}; // Or set it back to its initial state

    this.messageService.add({
        severity: 'success', 
        summary: `Application Successful`,
        detail: `You have successfully applied for ${this.job.category}`
    });

  // this.formData = []
    // alert(`Form data saved successfully with ID: ${id} and Position: ${position}`);
  }

}
