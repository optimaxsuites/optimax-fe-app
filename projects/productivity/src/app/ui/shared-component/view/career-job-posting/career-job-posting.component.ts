import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { JobPostingDTO } from '../../../domain/job.dto';

@Component({
  selector: 'app-career-job-posting',
  templateUrl: './career-job-posting.component.html',
  styleUrl: './career-job-posting.component.scss'
})
export class CareerJobPostingComponent {
  
  jobpostings: JobPostingDTO[] = [];
  filteredJobPostings: JobPostingDTO[] = [];
  
  categories: string[] = []; // Add categories here
  employmentTypes: string[] = []; // Add employment types here
  locations: string[] = []; // Add locations here

  selectedCategory: string | null = null;
  selectedEmploymentType: string | null = null;
  selectedLocation: string | null = null;

  ngOnInit(): void {
    this.getJobPostings();
    this.extractFilters();
  }
  
  constructor(private router: Router) {}

  navigateToJob(jobId: string): void {
    this.router.navigate(['/career/job-posting', jobId]);
  }

  getJobPostings() {

    const storedJobData = localStorage.getItem('jobData');

    if (storedJobData) {
      const parsedData = JSON.parse(storedJobData);

      // Check if parsedData is an array
      if (Array.isArray(parsedData)) {
        this.jobpostings = parsedData;
        this.jobpostings.reverse();
      } else {
        console.error('Parsed data is not an array:', parsedData);
        this.jobpostings = [];
      }
      
      // Copy the jobpostings to filteredJobPostings
      this.filteredJobPostings = [...this.jobpostings];

    } else {
      this.jobpostings = []; // Initialize as an empty array if no data found
      this.filteredJobPostings = []; // Initialize as an empty array if no data found
    }

  }

  extractFilters() {
    this.categories = [...new Set(this.jobpostings.map(job => job.category).filter(category => category !== undefined))] as string[]; 
    this.employmentTypes = [...new Set(this.jobpostings.map(job => job.employmentType).filter(type => type !== undefined))] as string[]; 
    this.locations = [...new Set(this.jobpostings.map(job => job.location).filter(location => location !== undefined))] as string[]; 
  }

  filterJobs() {
    this.filteredJobPostings = this.jobpostings.filter(job => {
      return (
        (!this.selectedCategory || job.category === this.selectedCategory) &&
        (!this.selectedEmploymentType || job.employmentType === this.selectedEmploymentType) &&
        (!this.selectedLocation || job.location === this.selectedLocation)
      );
    });
  }

}
