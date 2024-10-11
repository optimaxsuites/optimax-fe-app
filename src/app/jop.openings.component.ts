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

  tips = [
    {
      image: 'assets/svg/career.svg',
      text: 'Tip 1: Tailor your resume to the job description. Highlight relevant skills and experience.'
    },
    {
      image: 'assets/svg/job-interview-in-the-office.svg',
      text: 'Tip 2: Prepare for the interview by researching the company and practicing common interview questions.'
    },
    {
      image: 'assets/svg/man-with-join-us-sign-for-open-recruitment.svg',
      text: 'Tip 3: Follow up with a thank-you email after the interview to reiterate your interest.'
    }
  ];

  currentIndex = 0;
  carouselInterval: any;

  ngOnInit(): void {
    // Set up the timer to change the tip every 5 seconds
    this.carouselInterval = setInterval(() => {
      this.nextTip();
    }, 5000);
  }

  nextTip(): void {
    this.currentIndex = (this.currentIndex + 1) % this.tips.length;
  }

  previousTip(): void {
    this.currentIndex = (this.currentIndex - 1 + this.tips.length) % this.tips.length;
  }

  ngOnDestroy(): void {
    clearInterval(this.carouselInterval);
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
