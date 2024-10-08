import { Component } from '@angular/core';
import { JobDTO } from './ui/hr/domain/job.dto';
import { ApplicantDTO } from './ui/hr/domain/applicant.dto';

@Component({
  selector: 'app-jop.openings',
  templateUrl: './jop.openings.component.html',
  styleUrl: './jop.openings.component.scss'
})
export class JopOpeningsComponent {
  applicant: ApplicantDTO ={}

  resume: File | null = null;

  job: JobDTO = {};

  ngOnInit(): void {
    const jobData = localStorage.getItem('jobData');
    if (jobData) {
      this.job = JSON.parse(jobData);
    }
  }


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.resume = file;
      console.log('Resume selected:', this.resume);
    }
  }

  submitApplication() {

    


    console.log('Application Submitted', this.applicant);
    console.log('Resume:', this.resume);
    // Perform further actions like uploading the resume or sending data to the server
  }
}
