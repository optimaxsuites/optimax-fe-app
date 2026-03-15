import { Component } from '@angular/core';
import { RecruitmentService } from '../../../service/recruitment.service';


@Component({
  selector: 'app-jop.openings',
  templateUrl: './jop.openings.component.html',
  styleUrl: './jop.openings.component.scss',

})
export class JopOpeningsComponent {
  vacancies: any[] = [];
  filteredVacancies: any[] = [];
  selectedJob: any = null;
  showApplyModal = false;
  jobCategories: any[] = [];

  application = {
    fullName: '',
    email: '',
    customData: {} as any
  };

  constructor(private recruitmentService: RecruitmentService) {}

  ngOnInit() {
    this.loadPublishedJobs();
      this.recruitmentService.getJobCategories().subscribe(res => {
      this.jobCategories = res;
      })
  }

  loadPublishedJobs() {
    this.recruitmentService.getJobVacancies().subscribe(res => {
      this.vacancies = res;
      this.filteredVacancies = res;
    });
  }

  filterJobs(event: any) {
    // Logic to filter this.filteredVacancies based on search input or category
  }

  openApplyModal(job: any) {
    this.selectedJob = job;
    this.application = { fullName: '', email: '', customData: {} };
    this.showApplyModal = true;
  }

  submitApplication() {
    const payload = {
      vacancyId: this.selectedJob.id,
      ...this.application
    };

    // this.recruitmentService.submitApplication(payload).subscribe({
    //   next: () => {
    //     alert('Application submitted successfully!');
    //     this.showApplyModal = false;
    //   },
    //   error: (err) => console.error(err)
    // });
  }
}
