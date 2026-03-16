// job-openings.component.ts
import { Component, OnInit } from '@angular/core';
import { RecruitmentService } from '../../../service/recruitment.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-job-openings',
  templateUrl: './jop.openings.component.html',
  styleUrl: './jop.openings.component.scss',
})
export class JopOpeningsComponent implements OnInit {
  vacancies: any[] = [];
  filteredVacancies: any[] = [];
  selectedJob: any = null;
  showApplyModal = false;
  jobCategories: any[] = [];

  // Active filter state
  private activeCategory = '';
  private activeType     = '';
  private activeLocation = '';

  application = {
    fullName: '',
    email: '',
    phone: '',
    letter: '',
    file: null,
    customData: {} as Record<string, any>,
  };

  constructor(private recruitmentService: RecruitmentService, private router: Router) {
     const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras.state && navigation.extras.state['job']) {
      this.selectedJob = navigation.extras.state['job'];
      this.showApplyModal = true;
    }
  }

  ngOnInit(): void {
    this.loadPublishedJobs();


    if (!this.selectedJob && history.state && history.state.job) {
      this.selectedJob = history.state.job;
      this.showApplyModal = true;
    }
    
    this.recruitmentService.getJobCategories().subscribe((res) => {
      this.jobCategories = res;
    });

  }

  loadPublishedJobs(): void {
    this.recruitmentService.getJobVacancies().subscribe((res) => {
      this.vacancies         = res;
      this.filteredVacancies = res;
    });
  }

  // ── Filter handlers ───────────────────────────────────────────────
  onCategoryChange(event: Event): void {
    this.activeCategory = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onTypeChange(event: Event): void {
    this.activeType = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  onLocationChange(event: Event): void {
    this.activeLocation = (event.target as HTMLSelectElement).value;
    this.applyFilters();
  }

  private applyFilters(): void {
    this.filteredVacancies = this.vacancies.filter((job) => {
      const matchCat = !this.activeCategory
        || String(job.categoryId) === this.activeCategory;

      const matchType = !this.activeType
        || job.jobType?.name?.toLowerCase().includes(this.activeType.toLowerCase());

      const matchLoc = !this.activeLocation
        || job.location?.toLowerCase().includes(this.activeLocation.toLowerCase());

      return matchCat && matchType && matchLoc;
    });
  }

  // ── Modal ─────────────────────────────────────────────────────────
  openApplyModal(job: any): void {
    this.selectedJob  = job;
    this.application  = { fullName: '', email: '', phone: '', letter: '', file: null, customData: {} };
    this.showApplyModal = true;
  }

  submitApplication(): void {
    const payload = {
      vacancyId: this.selectedJob?.id,
      ...this.application,
    };

    // Uncomment when API is ready:
    // this.recruitmentService.submitApplication(payload).subscribe({
    //   next: () => { alert('Application submitted!'); this.showApplyModal = false; },
    //   error: (err) => console.error(err),
    // });

    console.log('Application payload:', payload);
    this.showApplyModal = false;
  }
}
