import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO, ApplicationStage } from '../../../domain/applicant.dto';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';

@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class CandidateComponent implements OnInit {

  viewState: 'job-grid' | 'applicant-list' = 'job-grid';
  
  allApplications: any[] = []; // Raw JobApplicationDTO[]
  groupedJobs: any[] = []; 
  selectedJob: any = null;
  filteredApplicants: any[] = [];

  applicantColumns: TableColumn[] = [
    { header: 'First Name', field: 'firstname', sortable: true },
    { header: 'Last Name', field: 'lastname', sortable: true },
    { header: 'Email', field: 'email', sortable: true },
    { header: 'Actions', field: 'action', badgeClass: (row) => 'badge-info' }
  ];

   constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {}

   ngOnInit(): void {
    // Store myCandidates in localStorage if not already present
    // if (!localStorage.getItem('candidates')) {
    //   localStorage.setItem('candidates', JSON.stringify(this.myCandidates));
    // }

    // this.getCandidate();

    this.loadDummyData()
  }

  loadDummyData() {
    // Mimicking the JobApplicationDTO structure
    this.allApplications = [
      {
        id: 101,
        firstname: 'Jane',
        lastname: 'Doe',
        email: 'jane@example.com',
        jobVacancy: { id: 5, jobTitle: 'Frontend Developer', jobCategory: { name: 'Engineering' }, customFieldsResponce: [{ jobVacancyCustomFields: { label: 'Portfolio' }, value: 'http://jane.dev', type: 'String' }] },
      },
      {
        id: 102,
        firstname: 'John',
        lastname: 'Smith',
        email: 'john@work.com',
        jobVacancy: { id: 5, jobTitle: 'Frontend Developer', jobCategory: { name: 'Engineering' },         customFieldsResponce: [{ jobVacancyCustomFields: { label: 'Years of Exp' }, value: '5', type: 'String' }] },

      }
    ];
    this.groupApplicationsByJob();
  }

  groupApplicationsByJob() {
    const groups = new Map();
    this.allApplications.forEach(app => {
      const jobId = app.jobVacancy.id;
      if (!groups.has(jobId)) {
        groups.set(jobId, {
          id: jobId,
          title: app.jobVacancy.jobTitle,
          category: app.jobVacancy.jobCategory?.name,
          applicants: []
        });
      }
      groups.get(jobId).applicants.push(app);
    });
    this.groupedJobs = Array.from(groups.values()).map(g => ({ ...g, count: g.applicants.length }));
  }

  selectJob(job: any) {
    this.selectedJob = job;
    this.filteredApplicants = job.applicants;
    this.viewState = 'applicant-list';
  }

  handleCandidateAction($event: { actionId: string; row: any; }) {
throw new Error('Method not implemented.');
}


  // showCandidate: boolean = true;
  // showInterviewInvite: boolean = false;
  // searchTerm: string = '';
  // activeItem: ApplicantDTO = {}
  // viewModal: boolean = false;
  // candidateColumns: TableColumn[] = [
  //   { header: 'Name', field: 'candidateName', sortable: true, className: 'table-item' },
  //   { header: 'Email', field: 'email', sortable: true, className: 'table-item' },
  //   { header: 'Position', field: 'position', sortable: true, className: 'table-item' },
  //   { header: 'Date Applied', field: 'dateApplied', sortable: true, className: 'table-item' },
  //   {
  //     header: 'Stage',
  //     field: 'stage',
  //     sortable: true,
  //     className: 'table-item',
  //     badgeClass: (row) => this.getStatusClass(row.stage)
  //   }
  // ];
  // candidateActions: TableAction[] = [
  //   { id: 'view', label: 'View', icon: 'pi pi-eye' },
  //   {
  //     id: 'invite',
  //     label: 'Send Invite',
  //     icon: 'pi pi-send',
  //     visible: (row) => row?.stage === 'Application Received'
  //   }
  // ];

  // constructor(
  //   private confirmationService: ConfirmationService,
  //   private messageService: MessageService 
  // ) {}

  // getDynamicKeys(): string[] {
  //   const predefinedKeys = [
  //     'id', 'candidateName', 'contactNo', 'email', 'position',
  //     'dateApplied', 'stage', 'interviewStage', 'firstName', 'firstname', 'lastName', 'lastname', 'fullName', 'fullname',
  //     'interviewSubject', 'interviewInvite', 'interviewType', 'inviteAttachments',
  //     'offerSubject', 'offerLetter', 'offerAttachments',
  //     'appointmentSubject', 'appointmentLetter', 'appointmentAttachments'
  //   ];
    
  //   return Object.keys(this.activeItem).filter(key => !predefinedKeys.includes(key));
  // }
  
  // isFile(value: any): boolean {
  //   return typeof value === 'string' && (value.startsWith('http') || value.startsWith('blob:'));
  // }


  // openViewModal(candidate: any, op?: any) {
  //   this.activeItem = candidate
  //   this.viewModal = !this.viewModal;
  //   op?.hide?.();
  // }

  // closeViewModal() {
  //   for (const key of this.getDynamicKeys()) {
  //     if (this.isDocument(this.activeItem[key])) {
  //       URL.revokeObjectURL(this.getDocumentUrl(key));
  //     }
  //   }
  //   this.viewModal = false;
  // }
  

  // openInterviewInvite(candidate: any){
  //   this.activeItem = candidate
  //   console.log(candidate)
  //   this.showCandidate = false;
  //   this.showInterviewInvite = true;
  // }

  // handleCandidateAction(event: { actionId: string; row: ApplicantDTO }) {
  //   if (event.actionId === 'view') {
  //     this.openViewModal(event.row);
  //   }
  //   if (event.actionId === 'invite') {
  //     this.openInterviewInvite(event.row);
  //   }
  // }
  // closeInterviewInvite() {
  //   this.showCandidate = true;
  //   this.showInterviewInvite = false;
  // }

  // viewResume(resume: string | File): void {
  //   if (!resume) {
  //     console.error('No resume found.');
  //     return;
  //   }
  
  //   if (typeof resume === 'string') {
  //     const base64String = resume.split(',')[1];  
  //     const blob = this.base64ToBlob(base64String, 'application'); 
  //     const url = URL.createObjectURL(blob);
  //     window.open(url, '_blank');
  //   } else if (resume instanceof File) {
  //     const fileUrl = URL.createObjectURL(resume);
  //     window.open(fileUrl, '_blank');
  //   }
  // }
  
  // base64ToBlob(base64: string, mimeType: string): Blob {
  //   const byteCharacters = atob(base64);  
  //   const byteArrays = [];
  
  //   for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
  //     const slice = byteCharacters.slice(offset, offset + 1024);
  //     const byteNumbers = new Array(slice.length);
  
  //     for (let i = 0; i < slice.length; i++) {
  //       byteNumbers[i] = slice.charCodeAt(i);
  //     }
  
  //     byteArrays.push(new Uint8Array(byteNumbers));
  //   }
  
  //   return new Blob(byteArrays, { type: mimeType });
  // }
  

  // getStatusClass(stage: string) {
  //   switch (stage) {
  //     case 'Application Received':
  //       return 'badge badge-lightgrey';
  //     case 'Shortlisted':
  //       return 'badge badge-lightblue';
  //     default:
  //       return '';
  //   }
  // }



  // ngOnInit(): void {
  //   // Store myCandidates in localStorage if not already present
  //   // if (!localStorage.getItem('candidates')) {
  //   //   localStorage.setItem('candidates', JSON.stringify(this.myCandidates));
  //   // }

  //   this.getCandidate();
  // }

  // getCandidate(){
  //   const storedCandidates = localStorage.getItem('candidates');
  //   if (storedCandidates) {
  //     this.candidates = JSON.parse(storedCandidates);
  //   }

  //   this.positions = [...new Set(this.candidates.map(c => c.position))]; 
  //   this.filteredCandidates = [...this.candidates].reverse(); 

  //   console.log(this.candidates)
  // }


  // stages = ['Application Received', 'Shortlisted'];
  
  // // myCandidates: any[] = [
  // //   { id: 1, candidateName: 'Damilola Awe', position: 'Frontend Dev', email: 'damilola.awe@hotmail.com', contactNo: '202-555-0181', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 1', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. luptatum cumque,',  },
  // //   { id: 2, candidateName: 'Awe Williams', position: 'Sales Personel', email: 'Awe.williams@gmail.com', contactNo: '+1(970)333-3833', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 2', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. quam, ' },
  // //   { id: 3, candidateName: 'Anthony Awe', position: 'Frontend Dev', email: 'anthony.Awe@gmail.com', contactNo: '+1(970)888-3866', dateApplied: '2023-06-03', stage: 'Application Received', resume: 'resume 3', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluia voluptas ' },
  // //   { id: 4, candidateName: 'Kevin Awe', position: 'Backend Dev', email: 'kevin.Awe@gmail.com', contactNo: '202-555-0120', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 4', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, ' },
  // //   { id: 5, candidateName: 'Christopher Awe', position: 'CEO', email: 'christopher.Awe@gmail.com', contactNo: '+49800600600', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 5', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru' }
  // // ];

  // candidates: ApplicantDTO[] = JSON.parse(localStorage.getItem('candidates') || '[]');

  // positions: any[] =[]; 
  // // positions = [...new Set(this.candidates.map(c => c.position))]; 
  // selectedPositions: string[] = [];
  // filteredCandidates: ApplicantDTO[] = [];

  // filterCandidatesByPosition() {
  //   if (this.selectedPositions.length > 0) {
  //     this.filteredCandidates = this.candidates.filter(candidate =>
  //     this.selectedPositions.includes(candidate.position!)
  //     );
  //   } else {
  //     this.filteredCandidates = [...this.candidates]; // Show all if no position is selected
  //   }
  // }


  // updateStage(candidate: any, newStage: string) {
  //   candidate.stage = newStage;
  // }
  
  // filterCandidates() {
  //   this.filteredCandidates = this.candidates.filter(candidate => {
  //     const matchesSearchTerm = candidate.candidateName!.toLowerCase().includes(this.searchTerm.toLowerCase());
  //     const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(candidate.position!);
  
  //     return matchesSearchTerm && matchesPosition;
  //   });
  // }

  // confirmCandidateDelete(candidate: any): void {
  //   this.confirmationService.confirm({
  //     message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${candidate.candidateName}'s application`,
  //     header: `Delete Candidate - ${candidate.candidateName}`,
  //     icon: 'pi pi-exclamation-triangle',
  //     acceptButtonStyleClass:"p-btn-danger p-button-text",
  //     rejectButtonStyleClass:"p-btn-cancle p-button-text",
  //     acceptIcon:"none",
  //     rejectIcon:"none",
  //     acceptLabel: 'Delete',
  //     rejectLabel: 'Cancel',
  //     // styleClass: 'custom-confirm-dialog',
  //     accept: () => {
  //       this.deleteCandidate(candidate);
  //     },
  //     reject: () => {

  //     }
  //   });
  // }

  // deleteCandidate(candidate: any): void {
  // const storedCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');

  // const updatedCandidates = storedCandidates.filter((c: any) => c.id !== candidate.id);

  // localStorage.setItem('candidates', JSON.stringify(updatedCandidates));

  // this.filteredCandidates = updatedCandidates;

  // localStorage.setItem('candidates', JSON.stringify(updatedCandidates));
  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'Candidate Deleted',
  //     detail: `${candidate.candidateName} application has been successfully deleted.`
  //   });
  // }

  // sendInvite(interviewDetails: ApplicantDTO) {
  //   const interviewCandidate: ApplicantDTO[] = JSON.parse(localStorage.getItem('candidates') || '[]');
  //   const scheduledInterview: ApplicantDTO[] = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    
  //   const index = interviewCandidate.findIndex((c: ApplicantDTO) => c.id === this.activeItem?.id);
  //   if (index !== -1 && this.activeItem) {
  //     const currentStage = this.activeItem.interviewStage || 0; 
  //     const updatedCandidate: ApplicantDTO = {
  //       ...interviewCandidate[index],
  //       stage: ApplicationStage.Scheduled,
  //       interviewStage: currentStage + 1,  
  //       interviewInvite: interviewDetails.interviewInvite,
  //       interviewType: interviewDetails.interviewType,
  //       inviteAttachments: interviewDetails.inviteAttachments,
  //     };

  //     interviewCandidate.splice(index, 1);
      
  //     localStorage.setItem('candidates', JSON.stringify(interviewCandidate));
  //     scheduledInterview.push(updatedCandidate);
  //     console.log("candidate-Job Application Info", updatedCandidate.interviewInvite, updatedCandidate.interviewType)
  //     localStorage.setItem('scheduledCandidate', JSON.stringify(scheduledInterview));

  //     this.messageService.add({
  //       severity: 'success',
  //       summary: 'Candidate Invited',
  //       detail: `${this.activeItem.candidateName} has been successfully invited for the interview.`
  //     });
      
  //     this.closeInterviewInvite();
  //     this.getCandidate();
  //   }
  // }
  
  // updateInterviewStatus(inviteData: any) {
  //   console.log('Updating interview status:', inviteData);
  // }
  
  
  // downloadFile(candidate: any) {
  //   const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');
  //   const applicant = existingCandidates.find((c: any) => c.id === candidate.id);
  
  //   if (applicant) {
  //     const keywords = ['resume', 'cv', 'curriculum vitae'];
  //     const cvFiles = Object.entries(applicant).filter(([key, value]) => {
  //       if (typeof value === 'string' && value.startsWith('data:')) {
  //         try {
  //           const decodedValue = atob(value.split(',')[1]);
  //           return keywords.some(keyword =>
  //             key.toLowerCase().includes(keyword) || decodedValue.toLowerCase().includes(keyword)
  //           );
  //         } catch {
  //           return false;
  //         }
  //       }
  //       return false;
  //     });
  
  //     if (cvFiles.length > 0) {
  //       cvFiles.forEach(([key, base64Data]) => {
  //         const link = document.createElement('a');
  //         link.href = base64Data as string;
  //         link.download = `${applicant.candidateName || 'Candidate'} - ${key}`; 
  //         link.click();
  //       });
  //     } else {
  //       this.messageService.add({
  //         severity: 'error',
  //         summary: 'Download Failed',
  //         detail: `No CV or resume found for ${candidate.candidateName}.`
  //       });
  //     }
  //   } else {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Download Failed',
  //       detail: `Candidate not found.`
  //     });
  //   }
  // }
  
  // // generateBlobUrl(dataUrl: string): string {
  // //   const byteString = atob(dataUrl.split(',')[1]); 
  // //   const mimeType = dataUrl.split(';')[0].split(':')[1]; 
  
  // //   const byteNumbers = new Array(byteString.length);
  // //   for (let i = 0; i < byteString.length; i++) {
  // //     byteNumbers[i] = byteString.charCodeAt(i);
  // //   }
  
  // //   const byteArray = new Uint8Array(byteNumbers);
  // //   const blob = new Blob([byteArray], { type: mimeType });
  // //   return URL.createObjectURL(blob);
  // // }
  
  // // isDocument(value: any): boolean {
  // //   return typeof value === 'string' && value.startsWith('data:application');
  // // }

  // // getDocumentUrl(key: string): string {
  // //   return this.isDocument(this.activeItem[key]) ? this.generateBlobUrl(this.activeItem[key]) : '';
  // // }
  

  // generateBlobUrl(dataUrl: string): string {
  //   const byteString = atob(dataUrl.split(',')[1]);
  //   const mimeType = dataUrl.split(';')[0].split(':')[1];
  
  //   const byteNumbers = new Array(byteString.length);
  //   for (let i = 0; i < byteString.length; i++) {
  //     byteNumbers[i] = byteString.charCodeAt(i);
  //   }
  
  //   const byteArray = new Uint8Array(byteNumbers);
  //   const blob = new Blob([byteArray], { type: mimeType });
  //   return URL.createObjectURL(blob);
  // }
  
  // isDocument(value: any): boolean {
  //   return typeof value === 'string' && 
  //          (value.startsWith('data:application/pdf') || value.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  // }
  
  // getDocumentUrl(key: string): string {
  //   return this.isDocument(this.activeItem[key]) ? this.generateBlobUrl(this.activeItem[key]) : '';
  // }
  
  
}
