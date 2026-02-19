import { Component, OnInit, ViewChild } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DomSanitizer } from '@angular/platform-browser';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { JobPostingCustomFieldDTO, JobPostingDTO } from '../../../domain/job.dto';
import { RecruitmentService } from '../../../service/recruitment.service';
import { RecruitmentFormComponent } from '../recruitment-form/recruitment-form.component';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-recruitment-list',
  templateUrl: './recruitment-list.component.html',
  styleUrl: './recruitment-list.component.scss',
  providers: [MessageService, ConfirmationService],

})
export class RecruitmentListComponent implements OnInit {
  showRecruitmentList: boolean = true;
  showRecruitmentForm: boolean = false;
  activeItem: JobPostingDTO = {};
  jobpostings: JobPostingDTO[] = [];
  isEdit?: boolean;
  searchTerm?: string;
  filteredJobPostings: JobPostingDTO[] = [];
  showListView: boolean = true;
  viewModal?: boolean;
  jobColumns: TableColumn[] = [
    { header: 'Title', field: 'jobTitle', sortable: true, className: 'table-item' },
    { header: 'Location', field: 'location', sortable: true, className: 'table-item' },
    { header: 'Job Type', field: 'jobType', sortable: true, className: 'table-item', formatter: (row) => row?.jobType?.name || row?.jobType || '—' },
    { header: 'Posted Date', field: 'jobPostedDate', sortable: true, className: 'table-item', formatter: (row) => this.formatDateValue(row?.jobPostedDate) },
    { header: 'Expiry Date', field: 'jobExpiryDate', sortable: true, className: 'table-item', formatter: (row) => this.formatDateValue(row?.jobExpiryDate) },
  ];
  jobActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'fas fa-eye' },
    { id: 'edit', label: 'Edit', icon: 'fas fa-pen-to-square' },
    { id: 'delete', label: 'Delete', icon: 'fas fa-trash-can' }
  ];


  constructor(
    private sanitizer: DomSanitizer,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private recruitmentService: RecruitmentService
  ) {}

  ngOnInit() {
    this.getJobPostings();
    // console.log("jobpostingsData", this.jobpostings);

  }
  customFieldList: JobPostingCustomFieldDTO[] = []
  populateCustomFieldList(): void {
    if (!this.activeItem.jobVacancyCustomFields || this.activeItem.jobVacancyCustomFields.length === 0) {
        console.warn("No custom fields available in jobpostings.jobVacancyCustomFields.");
        this.customFieldList = [];
        return;
    }
    const fields = this.activeItem.jobVacancyCustomFields;
    const areObjects = fields.every((item) => typeof item === 'object');
    if (areObjects) {
      this.customFieldList = fields as JobPostingCustomFieldDTO[];
      return;
    }

    const fetchRequests = (fields as number[]).map((fieldId) =>
        this.recruitmentService.getCustomFieldById(fieldId).toPromise()
    );

    Promise.all(fetchRequests)
      .then((fetchedFields) => {
          this.customFieldList = fetchedFields; // Populate the customFieldList with fetched data
          console.log("Custom fields successfully populated", fetchedFields);
      })
      .catch((err) => {
          console.error("Error fetching custom fields", err);
      });
  }


  toggleView() {
    this.showListView = !this.showListView;
  }

  getJobPostings() {
    // Fetch data from the API
    this.recruitmentService.getJobVacancies().subscribe({
      next: (apiJobVacancies) => {
        // Reverse the order of job vacancies and assign to jobpostings
        this.jobpostings = apiJobVacancies.reverse();
  
        // Copy reversed data to filteredJobPostings
        this.filteredJobPostings = [...this.jobpostings];
      },
      error: (err) => {
        console.error('Error fetching job vacancies:', err);
  
        // Fallback to an empty array if API call fails
        this.jobpostings = [];
        this.filteredJobPostings = [];
      },
    });
  }

  // getJobPostings() {
  //   const storedJobData = localStorage.getItem('jobData');

  //   if (storedJobData) {
  //     const parsedData = JSON.parse(storedJobData);

  //     // Check if parsedData is an array
  //     if (Array.isArray(parsedData)) {
  //       this.jobpostings = parsedData;
  //       this.jobpostings.reverse();
  //     } else {
  //       console.error('Parsed data is not an array:', parsedData);
  //       this.jobpostings = [];
  //     }
      
  //     // Copy the jobpostings to filteredJobPostings
  //     this.filteredJobPostings = [...this.jobpostings];

  //   } else {
  //     this.jobpostings = []; // Initialize as an empty array if no data found
  //     this.filteredJobPostings = []; // Initialize as an empty array if no data found
  //   }

  // }

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

  deleteJob(jobId: JobPostingDTO) {
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

  viewJob(job: JobPostingDTO){
    this.activeItem = { ...job };
    this.viewModal = true;
    this.populateCustomFieldList();
  }

  console(){
    console.log('clicked')
  }

  closeViewModal(){
    this.viewModal = false;
  }

  editJob(job: JobPostingDTO) {
    console.log("job info", job)
    this.activeItem = { ...job }; // Set the active item to the job being edited
    this.isEdit = true;  // Set to false for create mode
    this.showRecruitmentList = false;
    this.showRecruitmentForm = true;
  }

  handleJobAction(event: { actionId: string; row: JobPostingDTO }) {
    if (event.actionId === 'view') {
      this.viewJob(event.row);
    }
    if (event.actionId === 'edit') {
      this.editJob(event.row);
    }
    if (event.actionId === 'delete') {
      this.confirmJobDelete(event.row);
    }
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
      (job.jobTitle && job.jobTitle.toLowerCase().includes(term)) ||
      (job.location && job.location.toLowerCase().includes(term)) ||
      (job.jobType && job.jobType === Number(term)) ||
      (job.jobPostedDate && job.jobPostedDate.includes(term))
    );
  }

  private formatDateValue(value: any): string {
    if (!value) return '—';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'number') return new Date(value * 1000).toLocaleDateString();
    if (typeof value === 'string') {
      const asNumber = Number(value);
      if (!Number.isNaN(asNumber) && value.trim() !== '') {
        return new Date(asNumber * 1000).toLocaleDateString();
      }
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
    }
    return String(value);
  }

}
