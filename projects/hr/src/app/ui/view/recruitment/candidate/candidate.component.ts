import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO, ApplicationStage } from '../../../domain/applicant.dto';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
import { MenuItem } from 'primeng/api';
import { MailNotificationService } from '../../../service/mailNotification.service';

export interface FormResponse {
  label: string;
  value: string;
}
 
export interface CandidateDocument {
  name: string;
  type: 'pdf' | 'docx' | string;
  size: string;
  uploadedDate: string;
  url: string;
}
 
export interface AiVetting {
  overallScore: number;
  skillsMatch: number;
  experienceFit: number;
  recommendation: 'Strong Hire' | 'Hire' | 'Maybe' | 'Pass';
  strengths: string[];
  concerns: string[];
  summary: string;
}
 
export interface Candidate {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  appliedDate: string;
  status: 'New' | 'Shortlisted' | 'Rejected' | 'Invited' | 'Offered';
  formResponses: FormResponse[];
  documents: CandidateDocument[];
  aiVetting: AiVetting | null;
}

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'Interview' | 'Offer' | 'Rejection' | 'General' | 'Follow-up';
  subject: string;
  body: string;
  customPlaceholders: PlaceholderField[];
}

export interface PlaceholderField {
  key: string;       // inserted as {{key}}
  label: string;     // shown on chip
  source: 'db' | 'manual';
  inputType: 'text' | 'email' | 'url' | 'date' | 'time' | 'datetime';
  required: boolean;
  appliesTo?: EmailTemplate['category'][];
  helpText?: string;
}
@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class CandidateComponent implements OnInit {

  viewState: 'job-grid' | 'applicant-list' | 'applicant-view' = 'job-grid';
  
  allApplications: any[] = []; // Raw JobApplicationDTO[]
  groupedJobs: any[] = []; 
  selectedJob: any = null;
  selectedCandidate: any = null;
  filteredApplicants: any[] = [];
  viewCandidateModal: boolean = false;

  applicantColumns: TableColumn[] = [
    { header: 'First Name', field: 'firstname', sortable: true },
    { header: 'Last Name', field: 'lastname', sortable: true },
    { header: 'Email', field: 'email', sortable: true },
    // { header: 'Actions', field: 'action', badgeClass: (row) => 'badge-info' }
  ];

  applicantActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'fas fa-eye' },
    // { id: 'edit', label: 'Edit', icon: 'fas fa-pen-to-square' },
    // { id: 'delete', label: 'Delete', icon: 'fas fa-trash-can' }
  ];
  activeTab = 'form';

   tabs = [
    { key: 'form',      label: 'Form Response' },
    { key: 'documents', label: 'Documents'      },
    { key: 'ai',        label: 'AI Vetting'     },
  ];
   actionItems: MenuItem[] | undefined;
   currentAction: string = '';
   sendLoading: boolean = false;

   templates: EmailTemplate[] = [];
    selectedInviteTemplate: EmailTemplate | null = null;
    showInviteModal: boolean = false;
    isStepTwo: boolean = false; // Step 1: Select Template, Step 2: Fill & Preview
    manualPlaceholderValues: Record<string, string> = {};

    regData: any = {};

   constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private mailService: MailNotificationService
  ) {}

   ngOnInit(): void {
    this.actionItems = [
      // {
      //   label: 'Interview Invite',
      //   icon: 'fas fa-calendar-check',
      //   command: () => this.onSendInterview(this.selectedCandidate)
      // },
      {
        label: 'Shortlist',
        icon: 'fas fa-bookmark',
        command: () => this.onActionSelected('Shortlist')
      },
      {
        label: 'Request Docs',
        icon: 'fas fa-file-arrow-up',
        command: () => this.onActionSelected('Request Docs')
      },
      { separator: true },
      {
        label: 'Send Offer',
        icon: 'fas fa-envelope-open-text',
        command: () => this.onActionSelected('Send Offer')
      },
      // {
      //   label: 'Reject',
      //   icon: 'fas fa-xmark',
      //   styleClass: 'text-danger', // Optional: highlight rejection in red
      //   command: () => this.onActionSelected('Reject')
      // }
    ];

    const saved = localStorage.getItem('settings.hr.mailTemplates');
    this.templates = saved ? JSON.parse(saved) : [];

    const userPrimaryInfoRegData = localStorage.getItem('userPrimaryInfoRegData');
    this.regData = userPrimaryInfoRegData ? JSON.parse(userPrimaryInfoRegData) : null;

    this.loadDummyData()
  }

  loadDummyData() {
    // Mimicking the JobApplicationDTO structure
    this.allApplications = [
      {
        id: 101,
        firstname: 'Rukayat',
        lastname: 'Morufu',
        email: 'oluwadarequeensheba@gmail.com',
        formResponses: [
          { label: 'Years of Experience', value: '5 years' },
          { label: 'Current Role', value: 'Product Designer at Paystack' },
          { label: 'Availability', value: 'Immediately' },
          { label: 'Expected Salary', value: '₦800,000/month' },
          { label: 'Preferred Work Mode', value: 'Hybrid' },
          { label: 'Cover Note', value: 'I am deeply passionate about user-centred design...' },
        ],
        documents: [
          { name: 'Amara_CV.pdf', type: 'pdf', size: '420 KB', uploadedDate: 'Apr 10, 2025', url: '#' },
          { name: 'Portfolio.pdf', type: 'pdf', size: '2.1 MB', uploadedDate: 'Apr 10, 2025', url: '#' },
        ],
        aiVetting: {
          overallScore: 82,
          skillsMatch: 88,
          experienceFit: 79,
          recommendation: 'Strong Hire',
          strengths: [
            'Strong portfolio with enterprise-scale product experience.',
            'Directly relevant industry experience at a fintech company.',
            'Excellent written communication evident in cover note.',
          ],
          concerns: [
            'No mention of design system contribution or ownership.',
            'Expected salary is above current band for the role.',
          ],
          summary:
            'Amara presents as a well-rounded candidate whose background aligns closely with the role requirements. The fintech experience is a strong differentiator. Salary expectations may require negotiation.',
        },
        jobVacancy: { id: 5, jobTitle: 'Frontend Developer', jobCategory: { name: 'Engineering' }, customFieldsResponce: [{ jobVacancyCustomFields: { label: 'Portfolio' }, value: 'http://jane.dev', type: 'String' }] },
      },
      {
        id: 102,
        firstname: 'Galadinma',
        lastname: 'Christabel',
        email: 'damilola@centrifugegroup.com',
        formResponses: [
          { label: 'Years of Experience', value: '3 years' },
          { label: 'Current Role', value: 'UI Designer at Flutterwave' },
          { label: 'Availability', value: '2 weeks notice' },
          { label: 'Expected Salary', value: '₦600,000/month' },
          { label: 'Preferred Work Mode', value: 'Remote' },
          { label: 'Cover Note', value: 'My work at Flutterwave has honed my ability to...' },
        ],
        documents: [
          { name: 'Chidi_Resume.pdf', type: 'pdf', size: '310 KB', uploadedDate: 'Apr 12, 2025', url: '#' },
        ],
        aiVetting: {
          overallScore: 67,
          skillsMatch: 72,
          experienceFit: 60,
          recommendation: 'Maybe',
          strengths: [
            'Solid UI skills with a recognisable brand on the CV.',
            'Salary expectations within budget.',
          ],
          concerns: [
            'Limited evidence of UX research or strategy involvement.',
            'Only one document submitted — no portfolio linked.',
          ],
          summary:
            'Chidi has a solid foundation but may be a level below what the role demands. Worth a screening call to assess depth of UX thinking.',
        },
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
    console.log("job", job  )
    this.selectedJob = job;
    this.filteredApplicants = job.applicants;
    this.viewState = 'applicant-list';
  }

  handleCandidateAction($event: { actionId: string; row: any; }) {
      this.selectedCandidate = $event.row;
      this.viewCandidateModal = true;
      if ($event.actionId === 'view') {
        this.viewState = 'applicant-view';
      }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────
 
  onReject(candidate: Candidate): void {
    // TODO: implement reject logic / confirmation dialog
    console.log('Reject', candidate.id);
  }
 
  onShortlist(candidate: Candidate): void {
    // TODO: implement shortlist logic
    console.log('Shortlist', candidate.id);
  }
 
  onSendInterview(candidate: Candidate): void {
    const storedInvites = localStorage.getItem('upcomingInvite');
    let prevInvites: any[] = [];
    if (storedInvites) {
      try {
        prevInvites = JSON.parse(storedInvites) || [];
      } catch {
        prevInvites = [];
      }
    }
    const body = {
      job: this.selectedJob,
      candidate: candidate,
    }
    localStorage.setItem('upcomingInvite', JSON.stringify([...prevInvites, body]));
  }
 
  onRequestDocs(candidate: Candidate): void {
    // TODO: open request docs modal
    console.log('Request docs', candidate.id);
  }
 
  onSendOffer(candidate: Candidate): void {
    // TODO: open offer letter modal
    console.log('Send offer', candidate.id);
  }
 
  downloadDocument(doc: CandidateDocument): void {
    // TODO: trigger download
    console.log('Download', doc.url);
  }
 
  runAiVetting(candidate: Candidate): void {
    // TODO: call AI vetting service
    console.log('Run AI vetting for', candidate.id);
  }


    getInitials(candidate: any): string {
     const fullName = `${candidate?.firstname || ''} ${candidate?.lastname || ''}`.trim();
    return fullName
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
 
  getScoreClass(score: number): string {
    if (score >= 75) return 'score--high';
    if (score >= 50) return 'score--medium';
    return 'score--low';
  }

  onActionSelected(action: string) {
    this.currentAction = action;
    this.showInviteModal = true;
    this.isStepTwo = false;
    this.selectedInviteTemplate = null;
  }

// 4. Methods to handle transitions
  goToPreview() {
    if (!this.selectedInviteTemplate) return;
    
    // Initialize manual values for 'manual' (send-time) placeholders
    this.manualPlaceholderValues = {};
    this.selectedInviteTemplate.customPlaceholders.forEach(p => {
      this.manualPlaceholderValues[p.key] = '';
    });
    
    this.isStepTwo = true;
  }

  // 5. Logic to resolve placeholders before sending
  resolveFinalContent(text: string): string {
    // Database values (auto-resolved)
    const dbValues: Record<string, string> = {
      candidateName: `${this.selectedCandidate.firstname} ${this.selectedCandidate.lastname}`,
      jobTitle: this.selectedJob?.title || 'the position',
      companyName: this.regData?.companyName || 'N/A', 
      recruiterName: this.regData?.user?.username ||  'Recruiter',
      recruiterEmail: this.regData?.user?.email || 'recruiter@company.com',
      location: this.selectedJob?.location || 'Location'
    };

    const allValues = { ...dbValues, ...this.manualPlaceholderValues };

    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => allValues[key] || `{{${key}}}`);
  }

  sendFinalMail(){
    console.log("sent")
    this.sendLoading = true;

    const body = {
      name: this.selectedCandidate.firstname,
      recieverEmail: this.selectedCandidate.email,
      subject: this.resolveFinalContent(this.selectedInviteTemplate?.subject || ''),
      body: this.resolveFinalContent(this.selectedInviteTemplate?.body || '')
    }
    this.mailService.sendMail(body).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Invite sent successfully',
          key: 'tl'
        });
        console.log("Invite sent successfully", res);

        switch (this.currentAction) {
          case 'Interview Invite':
            this.onSendInterview(this.selectedCandidate);
            break;
          case 'Shortlist':
            this.onShortlist(this.selectedCandidate);
            break;
          case 'Request Docs':
            this.onRequestDocs(this.selectedCandidate);
            break;
          case 'Offer':
            this.onSendOffer(this.selectedCandidate);
            break;
          case 'Rejection':
            this.onReject(this.selectedCandidate);
            break;
          default:
             break;
        }

          this.showInviteModal = false;
          this.isStepTwo = false;
          this.selectedInviteTemplate = null;
          this.sendLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to send invite',
          key: 'tl'
        });
        console.error("Error sending invite", err);
        this.sendLoading = false;

      }
    })
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
