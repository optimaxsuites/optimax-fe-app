import { Component, EventEmitter, Input, Output } from '@angular/core';
import { JobDTO } from '../../../domain/job.dto';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-recuitment-form',
  templateUrl: './recuitment-form.component.html',
  styleUrl: './recuitment-form.component.scss'
})
export class RecuitmentFormComponent {
  @Output() back = new EventEmitter<void>();
  @Output() submitFrom = new EventEmitter<JobDTO>();
  @Input() jobData: JobDTO = {}
  @Input() isEdit: boolean = false;  // New input to differentiate between create and edit modes
  // jobData: JobDTO = {};
  
  constructor(private sanitizer: DomSanitizer) {
    // Initialize jobData with a default string
  }

  get sanitizedDescription(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.jobData.description!);
  }

  // In your ngOnInit or constructor, set the current date as the posted date
  ngOnInit() {
    if (!this.jobData.postedDate) {
      this.getTodayDate(); // Set today's date if not already set
    }
  }

  getTodayDate(){
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
    const day = String(today.getDate()).padStart(2, '0'); // Get the day
    const year = today.getFullYear(); // Get the year
  
    this.jobData.postedDate = `${month}/${day}/${year}`; // Format as MM/DD/YYYY
  }

  goBack() {
    this.back.emit();
  }

  submitForm() {
    // Retrieve the existing job postings from localStorage (if any)
    const storedJobs = localStorage.getItem('jobData');
    const jobArray = storedJobs ? JSON.parse(storedJobs) : [];

    if (this.isEdit) {
        // Find the index of the job to be edited
        const jobIndex = jobArray.findIndex((jobData: { id: number | undefined; }) => jobData.id === this.jobData.id);

        if (jobIndex > -1) {
            // Update the existing job data
            jobArray[jobIndex] = this.jobData;
            console.log('Job updated:', this.jobData);
        } else {
            console.error('Job not found for editing.');
        }
    } else {
        // Add the new job data to the array
        jobArray.push(this.jobData);
        console.log('Job added:', this.jobData);
    }

    // Save the updated array back to localStorage
    localStorage.setItem('jobData', JSON.stringify(jobArray));

    // Emit the form submission event (if required)
    this.submitFrom.emit(this.jobData);

    // Optionally, reset the form after submission
    this.jobData = {}; // Reset the job data
  }
  

}
