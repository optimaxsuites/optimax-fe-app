import { Component, OnInit } from '@angular/core';
import { JobDTO } from '../../../domain/job.dto';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-recruitment-list',
  templateUrl: './recruitment-list.component.html',
  styleUrl: './recruitment-list.component.scss',
  providers: [MessageService, ConfirmationService],

})
export class RecruitmentListComponent implements OnInit {
  showRecruitmentList: boolean = true;
  showRecruitmentForm: boolean = false;
  activeItem: JobDTO = {};
  jobpostings: JobDTO[] = [];
  isEdit?: boolean;

  showListView: boolean = true;



  constructor(
    private sanitizer: DomSanitizer,
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {}

  ngOnInit() {
    this.getJobPostings();
  }
  toggleView() {
    this.showListView = !this.showListView;
  }
  

  getJobPostings() {
    // Retrieve job data from localStorage
    const storedJobData = localStorage.getItem('jobData');

    if (storedJobData) {
      // Parse and assign the job data to the jobpostings array
      this.jobpostings = JSON.parse(storedJobData);
      console.log("jobpostingsData", this.jobpostings);

    // Sort the jobpostings array in FILO order
    this.jobpostings.reverse();

    } else {
      this.jobpostings = []; // Initialize as an empty array if no data found
    }
  }

  






  confirmJobDelete(job: any): void {
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${job.title} job posting.`,
      header: `Delete Candidate - ${job.id}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteJob(job);
      },
      reject: () => {

      }
    });
  }



deleteJob(index: number) {
    // Logic to handle deleting the job
    this.jobpostings.splice(index, 1); // Remove the job from the list
    localStorage.setItem('jobData', JSON.stringify(this.jobpostings)); // Update localStorage
    console.log('Deleted job at index:', index);
}










  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
  

  createJob(){
    // console.log("close is to work")
    // this.close();


    // // Save the job postings to localStorage or any other logic
    // if (this.activeItem.id) {
    //   // Edit existing job
    //   const index = this.jobpostings.findIndex(job => job.id === this.activeItem.id);
    //   if (index !== -1) {
    //     this.jobpostings[index] = this.activeItem; // Update the job
    //   }
    // } else {
    //   // Create new job
    //   this.activeItem.id = this.jobpostings.length + 1; // Generate an ID or use a better way to generate unique IDs
    //   this.jobpostings.push(this.activeItem); // Add the new job
    // }
    
    // // Save updated jobs to localStorage
    // localStorage.setItem('jobData', JSON.stringify(this.jobpostings));

    // this.close(); // Close the form after submission


    this.close(); // Close the form after submission
  
  }


  openForm() {
    this.activeItem = {}; // Reset the active item for new job creation
    this.isEdit = false;  // Set to false for create mode
    this.showRecruitmentList = false;
    this.showRecruitmentForm = true;
  }

  editJob(job: JobDTO) {
    console.log("job info", job)
    this.activeItem = { ...job }; // Set the active item to the job being edited
    this.isEdit = true;  // Set to false for create mode
    this.showRecruitmentList = false;
    this.showRecruitmentForm = true;
  }

  close() {
    this.showRecruitmentList = true;
    this.showRecruitmentForm = false;
    this.activeItem = {}; // Reset the active item

    this.getJobPostings();
  }
}
