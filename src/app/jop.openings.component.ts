import { Component } from '@angular/core';
import { JobDTO } from './ui/hr/domain/job.dto';
import { ApplicantDTO } from './ui/hr/domain/applicant.dto';
import { MessageService } from 'primeng/api';
import { RandomTokenService } from './ui/shared/service/random-token/random-token.service';

@Component({
  selector: 'app-jop.openings',
  templateUrl: './jop.openings.component.html',
  styleUrl: './jop.openings.component.scss',
  providers: [MessageService]
})
export class JopOpeningsComponent {
  applicant: ApplicantDTO ={}

  resume: File | null = null;

  job: JobDTO = {};

  constructor(
    private messageService: MessageService,
    private randomToken: RandomTokenService,
  ){}

  ngOnInit(): void {

  }


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.resume = file;
      console.log('Resume selected:', this.resume);
    }
  }

  submitApplication() {
    // Retrieve the existing candidates from localStorage or initialize an empty array if none exist
    let candidates = JSON.parse(localStorage.getItem('candidates') || '[]');

    // Add the current date and stage to the applicant object
    const applicationDate = new Date().toLocaleDateString(); // Format date as needed
    this.applicant.dateApplied = applicationDate;
    this.applicant.stage = 'Application Received';
    this.applicant.id = this.randomToken.getRandomToken();

    // Add the new applicant to the candidates array
    candidates.push(this.applicant);

    // Save the updated candidates array back to localStorage
    localStorage.setItem('candidates', JSON.stringify(candidates));

    console.log('Application Submitted:', this.applicant);
    console.log('Updated Candidates:', candidates);

    // Optional: Confirmation message
    this.messageService.add({
        severity: 'success',
        summary: 'Application Submitted',
        detail: 'Your application has been successfully submitted and added to the candidate list'
    });

    // Reset the applicant form if needed
    this.applicant = {};
  }
}
