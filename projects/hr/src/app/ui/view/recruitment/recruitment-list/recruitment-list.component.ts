import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { JobDTO } from '../../../domain/job.dto';
import { DomSanitizer } from '@angular/platform-browser';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'app-recruitment-list',
  templateUrl: './recruitment-list.component.html',
  styleUrl: './recruitment-list.component.scss',
  providers: [MessageService, ConfirmationService],
  // animations: [
  //   trigger('animation', [
  //     state('start', style({ opacity: 1 })),
  //     state('end', style({ opacity: 0 })),
  //     transition('start => end', [animate('500ms ease-out')]),
  //     transition('end => start', [animate('500ms ease-in')])
  //   ])
  // ]

})
export class RecruitmentListComponent implements OnInit {
  showRecruitmentList: boolean = true;
  showRecruitmentForm: boolean = false;
  activeItem: JobDTO = {};
  jobpostings: JobDTO[] = [];
  isEdit?: boolean;
  searchTerm?: string;
  filteredJobPostings: JobDTO[] = [];
  showListView: boolean = true;
  viewModal?: boolean;


  constructor(
    private sanitizer: DomSanitizer,
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {}

  ngOnInit() {
    this.getJobPostings();
    // console.log("jobpostingsData", this.jobpostings);

  }
  toggleView() {
    this.showListView = !this.showListView;
  }

  getJobPostings() {
    // // Retrieve job data from localStorage
    // const storedJobData = localStorage.getItem('jobData');

    // if (storedJobData) {
    //   // Parse and assign the job data to the jobpostings array
    //   this.jobpostings = JSON.parse(storedJobData);
      
    //   // Sort the jobpostings array in FILO order
    //   this.jobpostings!.reverse();

    //   this.filteredJobPostings = [...this.jobpostings];

    //   // this.filteredJobPostings.reverse();

    // } else {
    //   this.jobpostings = []; // Initialize as an empty array if no data found
    //   this.filteredJobPostings = [];// Initialize as an empty array if no data found
    // }


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
        this.deleteJob(job.id);
      },
      reject: () => {

      }
    });
  }

  deleteJob(jobId: JobDTO) {
    // Find the index of the job with the matching id
    const index = this.filteredJobPostings.findIndex(job => job.id === jobId);
    
    if (index !== -1) {
        this.filteredJobPostings.splice(index, 1); // Remove the job from the list
        localStorage.setItem('jobData', JSON.stringify(this.filteredJobPostings)); // Update localStorage
        console.log('Deleted job with id:', jobId);
        
        this.messageService.add({
            severity: 'success', 
            summary: `Delete`,
            detail: `Job posting with ${jobId} ID has been successfully deleted`
        });
    } else {
        console.log('Job not found with id:', jobId);
    }
}
  

  createJob(){
    this.close();
  }

  openForm() {
    this.activeItem = {}; // Reset the active item for new job creation
    this.isEdit = false;  // Set to false for create mode
    this.showRecruitmentList = false;
    this.showRecruitmentForm = true;
  }

  viewJob(job: JobDTO){
    this.activeItem = { ...job };
    this.viewModal = true;
  }

  console(){
    console.log('clicked')
  }

  closeViewModal(){
    this.viewModal = false;
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

  searchJobs() {

    const term = this.searchTerm!.toLowerCase();

    this.filteredJobPostings = this.jobpostings.filter(job =>
      (job.title && job.title.toLowerCase().includes(term)) ||
      (job.location && job.location.toLowerCase().includes(term)) ||
      (job.employmentType && job.employmentType.toLowerCase().includes(term)) ||
      (job.postedDate && job.postedDate.includes(term))
    );
  }


}

