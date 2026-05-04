import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import {
  ApplicantDTO,
  ApplicationStage,
  AttachmentDTO,
  InterviewHistoryItemDTO,
  InterviewMeetingDetailsDTO,
  InterviewOutcomeDTO,
  InterviewPanelMemberDTO,
  InterviewScoreAssignmentDTO,
  InterviewScoreStatusDTO,
  InterviewStageSummaryDTO
} from '../../../domain/applicant.dto';
import { ScoreSheetDTO } from '../../../domain/questions.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';
import {jsPDF} from 'jspdf';
import 'jspdf-autotable';
// import autoTable from "jspdf-autotable";

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

type InterviewStage = ApplicationStage | 'Awaiting Response' | 'Accepted' | 'Declined';

type InterviewRecord = Omit<ApplicantDTO, 'stage'> & {
  appliedDate?: string;
  candidateResponse?: string;
  documents?: CandidateDocument[];
  formResponses?: FormResponse[];
  fullName?: string;
  job?: any;
  jobVacancy?: any;
  phone?: string;
  position?: string;
  scheduledDate?: string;
  stage?: InterviewStage;
  meetingDetails?: InterviewMeetingDetailsDTO;
  interviewPanel?: InterviewPanelMemberDTO[];
  interviewHistory?: InterviewHistoryItemDTO[];
  interviewStageSummaries?: InterviewStageSummaryDTO[];
  interviewScoreAssignments?: InterviewScoreAssignmentDTO[];
  interviewCurrentSessionId?: string;
  latestInterviewOutcome?: InterviewOutcomeDTO;
  scoreSheetStatus?: InterviewScoreStatusDTO;
  aiVetting?: AiVetting | null;
};

@Component({
  selector: 'app-scheduled-interview',
  templateUrl: './scheduled-interview.component.html',
  styleUrl: './scheduled-interview.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class ScheduledInterviewComponent {
  private readonly interviewStorageKey = 'upcomingInvite';

  onActionSelected(action: string) {
    switch (action) {
      case 'Send Offer':
        if (this.activeItem?.id) {
          this.openOfferLetter(this.activeItem);
        }
        break;
      case 'Shortlist':
        this.messageService.add({
          severity: 'info',
          summary: 'Not Available Here',
          detail: 'Shortlisting is handled before a candidate enters the interview pipeline.'
        });
        break;
      case 'Request Docs':
        this.messageService.add({
          severity: 'info',
          summary: 'Pending',
          detail: 'Document requests are not wired into the interview stage yet.'
        });
        break;
      default:
        break;
    }
  }
  activeItem: any = {};
  searchTerm: string = '';
  interviews: InterviewRecord[] = [];
  showInterviewList: boolean = true;
  showInterviewInvite: boolean = false;
   currentAction: string = '';
  showScoreSheet: boolean = false;
  showOfferLetter: boolean = false;
  viewModal: boolean = false;
  showAppointment: boolean = false;
  positions: string[] = [];
  selectedPositions: string[] = [];
  filteredCandidates: InterviewRecord[] = [];
  candidateData: any = {};
  interviewColumns: TableColumn[] = [
    { header: 'Name', field: 'fullName', sortable: true, className: 'table-item' },
    { header: 'Email', field: 'email', sortable: true, className: 'table-item' },
    { header: 'Position', field: 'position', sortable: true, className: 'table-item' },
    { header: 'Date Applied', field: 'appliedDate', sortable: true, className: 'table-item' },
    { header: 'Scheduled Date', field: 'scheduledDate', sortable: true, className: 'table-item' },
    { header: 'Interview Type', field: 'interviewType', sortable: true, className: 'table-item' },
    { header: 'Interview Stage', field: 'interviewStage', sortable: true, className: 'table-item' },
    { header: 'Stage', field: 'stage', sortable: true, className: 'table-item' },
    { header: 'Actions', className: 'table-item' },
  ];

  actionItems = [
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

  activeTab = 'form';

   tabs = [
    { key: 'form',      label: 'Form Response' },
    { key: 'documents', label: 'Documents'      },
    { key: 'ai',        label: 'AI Vetting'     },
    { key: 'interviews',        label: 'Interview history'},
    

  ];


  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {
    this.getCandidateScore()
  }

  getStatusClass(stage: string) {
    switch (stage) {
      case 'Awaiting Response':
        return 'badge badge-lightblue';
      case 'Accepted':
        return 'badge badge-lightgreen';
      case 'Declined':
        return 'badge badge-lightred';
      case 'Scheduled':
        return 'badge badge-lightgrey';
      case 'In-Progress':
        return 'badge badge-lightyellow';
      case `Completed`:
        return 'badge badge-lightgreen';

      case `Offer-Sent`:
        return 'badge badge-lightpurple'; 
      case `Offer-Accepted`:
        return 'badge badge-lightblue'; 
      case `Offer-Rejected`:
        return 'badge badge-lightred';

      case 'Appointment-Letter-Sent':
        return 'badge badge-lightpink';

      default:
        return '';
    }
  }

  ngOnInit(): void {
    this.getCandidateData();
  }

// ==============================================get candidate
  getCandidateData(){
    this.interviews = this.getStoredInterviews().map(interview => this.normalizeInterviewRecord(interview));
    this.positions = [...new Set(this.interviews.map(interview => interview.position).filter(Boolean) as string[])];
    this.applyFilters();
  }
// ============================================================

// ===============================================Offer Letter
  openOfferLetter(interview: any){
    this.activeItem = interview;
    this.showInterviewList = false;
    this.showInterviewInvite = false;
    this.viewModal = false;
    this.showScoreSheet = false;
    this.showOfferLetter = true;
    this.showAppointment = false;
  }
  sendOffer(offerDetails: ApplicantDTO){
    const interviews = this.getStoredInterviews();
    
    // Find the candidate to update
    const index = interviews.findIndex(c => c['id'] === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      const currentStage = Number(interviews[index]['interviewStage'] || 1);
      const updatedOfferLetterSent: ApplicantDTO = {
        ...interviews[index],
        stage:  ApplicationStage.OfferSent,
        offerSubject: offerDetails.offerSubject,
        offerLetter: offerDetails.offerLetter,
        offerAttachments: offerDetails.offerAttachments,
        interviewHistory: [
          ...(interviews[index].interviewHistory || []),
          this.createInterviewHistoryEntry(
            currentStage,
            'Offer Letter Sent',
            `Offer letter sent after interview ${currentStage}.`,
            offerDetails.offerAttachments || [],
            this.getLatestSummary(interviews[index])?.averageScore,
            this.getLatestSummary(interviews[index])?.outcome
          )
        ]
      };

      // Update the existing candidate at the found index
      interviews[index] = updatedOfferLetterSent;
      this.persistInterviews(interviews);
      this.syncCandidateLifecycle(interviews[index]['id'], {
        status: 'Offered',
        interviewStatus: 'Completed'
      }, 'Offer Letter Sent', `Offer letter sent after interview ${currentStage}.`);

      // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Offer Letter Sent',
        detail: `${this.getCandidateName(this.activeItem)} has successfully been sent an offer letter.`
      });
      
    }
      
    
    // Close the interview invite component
    this.close();
    this.getCandidateData();

  }
// ============================================================

// ====================================================view modal
  openViewModal(candidate: any, op?: any) {
    this.activeItem = candidate;
    this.activeTab = 'form';
    this.showInterviewList = true;
    this.showInterviewInvite = false;
    this.viewModal = true;
    this.showScoreSheet = false;
    this.showOfferLetter = false;
    this.showAppointment = false;
    op?.hide?.();
  }
  closeViewModal() {
    this.viewModal = false;
  }
// ================================================================

// ======================================================Interview Invite
  openInterviewInvite(interview: any){
    this.activeItem = interview
    this.showInterviewList = false;
    this.showInterviewInvite = true;
    this.viewModal = false;
    this.showScoreSheet = false;
    this.showOfferLetter = false;
    this.showAppointment = false;
  }
  sendInvite(interviewDetails: ApplicantDTO) {
    const interviews = this.getStoredInterviews();
    
    // Find the candidate to update
    const index = interviews.findIndex(c => c['id'] === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      const currentStage = this.activeItem['interviewStage'] || interviews[index]['interviewStage'] || 0;
      const nextStage = currentStage + 1;
      const meetingDetails: InterviewMeetingDetailsDTO = {
        date: interviewDetails['scheduledDate'] || interviews[index]['scheduledDate'],
        time: interviewDetails['scheduledTime'] || interviews[index].meetingDetails?.time || '',
        location: interviewDetails['location'] || interviews[index].meetingDetails?.location || '',
        interviewType: interviewDetails.interviewType || interviews[index].meetingDetails?.interviewType || '',
        notes: interviewDetails['notes'] || interviews[index].meetingDetails?.notes || ''
      };
      const latestSummary = this.getLatestSummary(interviews[index], currentStage);
      const updatedCandidate: InterviewRecord = {
        ...interviews[index],
        stage: ApplicationStage.Scheduled,
        interviewStage: nextStage,
        interviewInvite: interviewDetails.interviewInvite,
        interviewType: interviewDetails.interviewType,
        inviteAttachments: interviewDetails.inviteAttachments,
        scheduledDate: meetingDetails.date,
        candidateResponse: undefined,
        meetingDetails,
        interviewPanel: (interviewDetails['panelMembers'] as InterviewPanelMemberDTO[]) || interviews[index].interviewPanel || [],
        interviewCurrentSessionId: undefined,
        latestInterviewOutcome: 'Pending',
        scoreSheetStatus: 'Not Started',
        interviewScoreAssignments: [
          ...(interviews[index].interviewScoreAssignments || []).filter(assignment => assignment.stageNumber !== nextStage)
        ],
        interviewHistory: [
          ...(interviews[index].interviewHistory || []),
          this.createInterviewHistoryEntry(
            nextStage,
            `Interview ${nextStage} Scheduled`,
            latestSummary
              ? `Candidate progressed from interview ${currentStage} with ${latestSummary.averageScore?.toFixed(1) || '0.0'} average and ${latestSummary.outcome} outcome.`
              : `Candidate progressed to interview ${nextStage}.`,
            interviewDetails.inviteAttachments || []
          )
        ]
      };

      interviews[index] = updatedCandidate;
      this.persistInterviews(interviews);
      this.syncCandidateLifecycle(interviews[index]['id'], {
        status: 'Invited',
        interviewStatus: 'Invited',
        interviewDetails: {
          scheduledDate: meetingDetails.date,
          location: meetingDetails.location,
          format: meetingDetails.interviewType,
          notes: meetingDetails.notes
        }
      }, `Interview ${nextStage} Scheduled`, `Candidate moved to interview ${nextStage}.`);

      this.messageService.add({
        severity: 'success',
        summary: 'Candidate Invited',
        detail: `${this.getCandidateName(this.activeItem)} has been successfully invited for the interview.`
      });
      
    }
      
    
    // Close the interview invite component
    this.close();
    this.getCandidateData();

  }
// ==========================================================================

// ==============================================================Score Sheet
  openScoreSheet(interview: any){
    this.activeItem = interview
    this.showInterviewList = false;
    this.showInterviewInvite = false;
    this.viewModal = false;
    this.showScoreSheet = true;
    this.showOfferLetter = false;
    this.showAppointment = false;
  }
  SaveScoreSheet(scoreSubmission?: ScoreSheetDTO & { outcome?: InterviewOutcomeDTO }){
    if (scoreSubmission && this.activeItem?.['id']) {
      const interviews = this.getStoredInterviews();
      const index = interviews.findIndex(candidate => candidate['id'] === this.activeItem['id']);
      if (index !== -1) {
        const stageNumber = scoreSubmission.interviewStage || interviews[index]['interviewStage'] || 1;
        const sessionId = scoreSubmission.sessionId || interviews[index].interviewCurrentSessionId || '';
        const assignments = this.updateAssignmentsWithSubmission(interviews[index], scoreSubmission);
        const summary = this.buildStageSummary(interviews[index], stageNumber, sessionId, assignments);

        interviews[index] = {
          ...interviews[index],
          interviewScoreAssignments: assignments,
          interviewStageSummaries: this.upsertStageSummary(interviews[index].interviewStageSummaries || [], summary),
          latestInterviewOutcome: summary.outcome,
          scoreSheetStatus: summary.totalSubmissions > 0 ? 'In Progress' : interviews[index].scoreSheetStatus,
          interviewHistory: [
            ...(interviews[index].interviewHistory || []),
            this.createInterviewHistoryEntry(
              stageNumber,
              'Score Sheet Submitted',
              `${scoreSubmission.interviewerName || 'An interviewer'} submitted ${scoreSubmission.criteria?.title || 'a score sheet'} for interview ${stageNumber}.`,
              [],
              scoreSubmission.totalScore || undefined,
              scoreSubmission.outcome
            )
          ]
        };

        this.persistInterviews(interviews);
        this.syncCandidateLifecycle(interviews[index]['id'], {
          interviewStatus: 'Invited'
        }, 'Score Sheet Submitted', `${scoreSubmission.interviewerName || 'An interviewer'} submitted an interview ${stageNumber} score sheet.`);
      }
    }
    this.close();
  }
// ========================================================================

// ==========================================================Appointment Letter
  openAppointmentLetter(interview: any){
    this.activeItem = interview
    this.showInterviewList = false;
    this.showInterviewInvite = false;
    this.viewModal = false;
    this.showScoreSheet = false;
    this.showOfferLetter = false;
    this.showAppointment = true;
  }
  sendAppointment(appointmentDetails: ApplicantDTO){
    const interviews = this.getStoredInterviews();
    
    // Find the candidate to update
    const index = interviews.findIndex(c => c['id'] === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      const currentStage = Number(interviews[index]['interviewStage'] || 1);
      const updatedOfferLetterSent: ApplicantDTO = {
        ...interviews[index],
        stage:  ApplicationStage.AppointmentLetterSent,
        appointmentSubject: appointmentDetails.appointmentSubject,
        appointmentLetter: appointmentDetails.appointmentLetter,
        appointmentAttachments: appointmentDetails.appointmentAttachments,
        interviewHistory: [
          ...(interviews[index].interviewHistory || []),
          this.createInterviewHistoryEntry(
            currentStage,
            'Appointment Letter Sent',
            `Appointment letter sent after interview ${currentStage}.`,
            appointmentDetails.appointmentAttachments || [],
            this.getLatestSummary(interviews[index])?.averageScore,
            this.getLatestSummary(interviews[index])?.outcome
          )
        ]
      };

      interviews[index] = updatedOfferLetterSent;
      this.persistInterviews(interviews);
      this.syncCandidateLifecycle(interviews[index]['id'], {
        interviewStatus: 'Completed'
      }, 'Appointment Letter Sent', `Appointment letter sent after interview ${currentStage}.`);

      this.messageService.add({
        severity: 'success',
        summary: 'Appointment Letter Sent',
        detail: `${this.getCandidateName(this.activeItem)} has successfully been sent an appointment letter.`
      });
      
    }
      
    
    // Close the interview invite component
    this.close();
    this.getCandidateData();
  }
// ===============================================================================

// ===========================================================Start/End Interview
  startInterview(interview: any){
    if (interview) {
      const stageNumber = Number(interview['interviewStage'] || 1);
      const sessionId = this.generateId(`session-${stageNumber}`);
      const panel = (interview.interviewPanel || []).length
        ? interview.interviewPanel || []
        : [{ id: this.generateId('panel'), name: 'Interview Panel', role: 'Interviewer', email: '' }];
      const scoreAssignments = [
        ...(interview.interviewScoreAssignments || []).filter((assignment: InterviewScoreAssignmentDTO) => assignment.stageNumber !== stageNumber),
        ...panel.map((member: InterviewPanelMemberDTO) => ({
          id: this.generateId('assignment'),
          sessionId,
          stageNumber,
          participantName: member.name,
          participantRole: member.role,
          participantEmail: member.email,
          status: 'Pending' as const
        }))
      ];

      this.updateInterviewRecord(interview['id'], {
        stage: ApplicationStage.InProgress,
        interviewCurrentSessionId: sessionId,
        scoreSheetStatus: 'Ready',
        interviewScoreAssignments: scoreAssignments,
        interviewHistory: [
          ...(interview.interviewHistory || []),
          this.createInterviewHistoryEntry(
            stageNumber,
            'Interview Started',
            `Interview ${stageNumber} started. ${panel.length} score sheet assignment(s) were created for the panel.`
          )
        ]
      });
      this.syncCandidateLifecycle(interview['id'], {
        interviewStatus: 'Invited'
      }, 'Interview Started', `Interview ${stageNumber} started and score sheets were created for the panel.`);
    }
  }
  endInterview(interview: any){
    if (interview) {
      const stageNumber = Number(interview['interviewStage'] || 1);
      const sessionId = interview.interviewCurrentSessionId || '';
      const assignments = interview.interviewScoreAssignments || [];
      const summary = this.buildStageSummary(interview, stageNumber, sessionId, assignments);

      this.updateInterviewRecord(interview['id'], {
        stage: ApplicationStage.Completed,
        scoreSheetStatus: 'Completed',
        latestInterviewOutcome: summary.outcome,
        interviewStageSummaries: this.upsertStageSummary(interview.interviewStageSummaries || [], {
          ...summary,
          completedAt: new Date().toISOString()
        }),
        interviewHistory: [
          ...(interview.interviewHistory || []),
          this.createInterviewHistoryEntry(
            stageNumber,
            'Interview Completed',
            `Interview ${stageNumber} completed with ${summary.averageScore?.toFixed(1) || '0.0'} average score and ${summary.outcome} outcome.`,
            [],
            summary.averageScore,
            summary.outcome
          )
        ]
      });
      this.syncCandidateLifecycle(interview['id'], {
        interviewStatus: 'Completed'
      }, 'Interview Completed', `Interview ${stageNumber} completed with ${summary.outcome} outcome.`);
    }
  }
// ======================================================================================

  close() {
    this.showInterviewList = true;
    this.showInterviewInvite = false;
    this.showScoreSheet = false;
    this.showOfferLetter = false;
    this.showAppointment = false;
    this.viewModal = false;
  }

  viewResume(resumeFile: string){

  }

  updateLocalStorage() {
    this.persistInterviews(this.interviews);
  }

// =========================Function to filter candidates by selected positions
  filterCandidatesByPosition() {
    this.applyFilters();
  }
  filterCandidates() {
    this.applyFilters();
  }
//====================================================================================== 



  getCandidateScore() {
    const storedData = localStorage.getItem('submittedCriteria');
    if (storedData) {
      this.candidateData = JSON.parse(storedData);
    }
  }

   getScoreClass(score: number): string {
    if (score >= 75) return 'score--high';
    if (score >= 50) return 'score--medium';
    return 'score--low';
  }


  // score on a single page
  // downloadScoresheet(candidateId: string) {
  //   const pdf = new jsPDF({
  //     orientation: 'portrait',
  //     unit: 'px',
  //     format: 'a4'
  //   });
  
  //   const pdfWidth = pdf.internal.pageSize.getWidth();
  //   const pdfHeight = pdf.internal.pageSize.getHeight();
  //   const padding = 20;
  //   let currentX = padding;
  //   let currentY = padding;
  
  //   // Add Title
  //   pdf.setFont('times', 'bold');
  //   pdf.setFontSize(18);
  //   pdf.text('Candidate Interview Scoresheet', pdfWidth / 2, currentY, { align: 'center' });
  //   currentY += 30;
  
  //   const candidateData = this.candidateData[candidateId];
  //   if (!candidateData) {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'No Interview Found',
  //       detail: `Candidate has not been interviewed yet`
  //     });
  //     return;
  //   }
  
  //   pdf.setFont('times', 'normal');
  //   pdf.setFontSize(12);
  
  //   for (const { criteria, requestDate, totalScore } of candidateData) {
  //     // Check if there’s enough space for a new criteria section
  //     if (currentY + 50 > pdfHeight) {
  //       pdf.addPage();
  //       currentY = padding; // Reset for new page
  //     }
  
  //     // Add Criteria Title
  //     pdf.setFont('times', 'bold');
  //     pdf.text(`Criteria: ${criteria.title}`, currentX, currentY);
  //     currentY += 20;
  
  //     // Add Submitted Date and Total Score
  //     pdf.setFont('times', 'normal');
  //     pdf.text(`Submitted At: ${requestDate}`, currentX, currentY);
  //     currentY += 15;
  
  //     // Add table if questions exist
  //     if (Array.isArray(criteria.questions) && criteria.questions.length > 0) {
  //       const columns = ['Question', 'Score'];
  //       const data = criteria.questions.map((q: { text: string; score: number; }) => [q.text, q.score]);
  
  //       (pdf as any).autoTable({
  //         startY: currentY,
  //         head: [columns],
  //         body: data,
  //         theme: 'grid',
  //         headStyles: { fillColor: [0, 0, 255], textColor: [255, 255, 255], fontSize: 12 },
  //         bodyStyles: { fontSize: 10 },
  //         columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 'auto' } }
  //       });
  
  //       // Update Y position after table
  //       currentY = (pdf as any).lastAutoTable.finalY + 10;
  //     }
  
  //     pdf.text(`Total Score: ${totalScore}`, currentX, currentY);
  //     currentY += 20;
  //   }
  
  //   // Footer: Add page numbers
  //   const totalPages = (pdf as any).internal.getNumberOfPages();
  //   for (let i = 1; i <= totalPages; i++) {
  //     pdf.setPage(i);
  //     pdf.setFont('times', 'italic');
  //     pdf.setFontSize(10);
  //     pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - 50, pdfHeight - 10);
  //   }
  
  //   pdf.save(`${this.candidateData.candidateName} scoresheet.pdf`);

  //   this.messageService.add({
  //     severity: 'success',
  //     summary: 'Download Complete',
  //     detail: `Scoresheet for ${this.candidateData.candidateName} has been downloaded successfully.`,
  //   });
  // }
  

  // every score loop on a new page
  downloadScoresheet(candidateId: string) {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: 'a4',
    });
  
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const padding = 20;
    let currentX = padding;
    let currentY = padding;
  
    // Add Title
    pdf.setFont('times', 'bold');
    pdf.setFontSize(18);
    pdf.text('Candidate Interview Scoresheet', pdfWidth / 2, currentY, { align: 'center' });
    currentY += 30;
  
    const candidateData = this.candidateData[candidateId];
    if (!candidateData) {
      this.messageService.add({
        severity: 'error',
        summary: 'No Interview Found',
        detail: `Candidate has not been interviewed yet`,
      });
      return;
    }
  
    pdf.setFont('times', 'normal');
    pdf.setFontSize(12);
  
    candidateData.forEach((entry: { criteria: any; requestDate: any; totalScore: any; }, index: number) => {
      const { criteria, requestDate, totalScore } = entry;
  
      if (index > 0) {
        pdf.addPage(); // Start a new page for each subsequent iteration
        currentY = padding; // Reset Y position for new page
      }
  
      // Add Criteria Title
      pdf.setFont('times', 'bold');
      pdf.text(`Criteria: ${criteria.title}`, currentX, currentY);
      currentY += 20;
  
      // Add Submitted Date and Total Score
      pdf.setFont('times', 'normal');
      pdf.text(`Submitted At: ${requestDate}`, currentX, currentY);
      currentY += 15;
  
      // Add table if questions exist
      if (Array.isArray(criteria.questions) && criteria.questions.length > 0) {
        const columns = ['Question', 'Score'];
        const data = criteria.questions.map((q: { text: string; score: number }) => [q.text, q.score]);
  
        (pdf as any).autoTable({
          startY: currentY,
          head: [columns],
          body: data,
          theme: 'grid',
          headStyles: { fillColor: [0, 0, 255], textColor: [255, 255, 255], fontSize: 12 },
          bodyStyles: { fontSize: 10 },
          columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 'auto' } },
        });
  
        currentY = (pdf as any).lastAutoTable.finalY + 10;
      }
  
      pdf.text(`Total Score: ${totalScore}`, currentX, currentY);
      currentY += 20;
    });
  
    // Footer: Add page numbers
    const totalPages = (pdf as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFont('times', 'italic');
      pdf.setFontSize(10);
      pdf.text(`Page ${i} of ${totalPages}`, pdfWidth - 50, pdfHeight - 10);
    }
  
    const candidateName = this.getCandidateName(this.interviews.find(candidate => candidate['id'] === candidateId)) || 'Candidate';

    pdf.save(`${candidateName} scoresheet.pdf`);

    this.messageService.add({
      severity: 'success',
      summary: 'Download Complete',
      detail: `Scoresheet for ${candidateName} has been downloaded successfully.`,
    });
  }





  getDynamicKeys(): string[] {
    const predefinedKeys = [
      'id', 'candidateName', 'contactNo', 'email', 'position',
      'dateApplied', 'stage', 'interviewStage', 'firstName', 'firstname', 'lastName', 'lastname', 'fullName', 'fullname',
      'interviewSubject', 'interviewInvite', 'interviewType', 'inviteAttachments',
      'offerSubject', 'offerLetter', 'offerAttachments',
      'appointmentSubject', 'appointmentLetter', 'appointmentAttachments'
    ];
    
    return Object.keys(this.activeItem).filter(key => !predefinedKeys.includes(key));
  }

  getDisplayStage(interview: InterviewRecord): string {
    return interview?.stage || 'Awaiting Response';
  }

  canStartInterview(interview: InterviewRecord): boolean {
    return ['Accepted', ApplicationStage.Scheduled].includes(this.getDisplayStage(interview));
  }

  canCreateScoreSheet(interview: InterviewRecord): boolean {
    return [ApplicationStage.InProgress, ApplicationStage.Completed].includes(this.getDisplayStage(interview) as ApplicationStage);
  }

  canEndInterview(interview: InterviewRecord): boolean {
    return this.getDisplayStage(interview) === ApplicationStage.InProgress;
  }

  canMoveToNextStage(interview: InterviewRecord): boolean {
    return this.getDisplayStage(interview) === ApplicationStage.Completed && this.getLatestSummary(interview)?.outcome === 'Pass';
  }

  canSendOffer(interview: InterviewRecord): boolean {
    return this.getDisplayStage(interview) === ApplicationStage.Completed && this.getLatestSummary(interview)?.outcome === 'Pass';
  }

  canSendAppointmentLetter(interview: InterviewRecord): boolean {
    return [ApplicationStage.OfferSent, ApplicationStage.OfferAccepted].includes(this.getDisplayStage(interview) as ApplicationStage);
  }

  canDownloadScoreSheet(interview: InterviewRecord): boolean {
    return [ApplicationStage.InProgress, ApplicationStage.Completed, ApplicationStage.OfferSent, ApplicationStage.AppointmentLetterSent].includes(
      this.getDisplayStage(interview) as ApplicationStage
    );
  }

  getInterviewHistory(): InterviewHistoryItemDTO[] {
    return [...(this.activeItem?.interviewHistory || [])].reverse();
  }

  getInterviewStageSummaries(): InterviewStageSummaryDTO[] {
    return [...(this.activeItem?.interviewStageSummaries || [])].sort((left, right) => right.stageNumber - left.stageNumber);
  }

  getScoreAssignmentsForActiveStage(): InterviewScoreAssignmentDTO[] {
    const stageNumber = Number(this.activeItem?.['interviewStage'] || 1);
    return (this.activeItem?.interviewScoreAssignments || []).filter((assignment: InterviewScoreAssignmentDTO) => assignment.stageNumber === stageNumber);
  }

  getOutcomeClass(outcome?: InterviewOutcomeDTO): string {
    switch (outcome) {
      case 'Pass':
        return 'badge badge-lightgreen';
      case 'Borderline':
        return 'badge badge-lightyellow';
      case 'Fail':
        return 'badge badge-lightred';
      default:
        return 'badge badge-lightgrey';
    }
  }

  getHistoryIcon(action: string): string {
    if (action.includes('Scheduled')) return 'fas fa-calendar-check';
    if (action.includes('Started')) return 'fas fa-play-circle';
    if (action.includes('Score Sheet')) return 'fas fa-clipboard-check';
    if (action.includes('Completed')) return 'fas fa-flag-checkered';
    if (action.includes('Offer')) return 'fas fa-envelope-open-text';
    if (action.includes('Appointment')) return 'fas fa-file-signature';
    return 'fas fa-circle';
  }

  private applyFilters(): void {
    const searchTerm = this.searchTerm.trim().toLowerCase();

    this.filteredCandidates = [...this.interviews]
      .filter(interview => {
        const matchesPosition =
          this.selectedPositions.length === 0 || this.selectedPositions.includes(interview.position || '');
        const matchesSearchTerm =
          !searchTerm ||
          this.getCandidateName(interview).toLowerCase().includes(searchTerm) ||
          (interview['email'] || '').toLowerCase().includes(searchTerm) ||
          (interview.position || '').toLowerCase().includes(searchTerm);

        return matchesPosition && matchesSearchTerm;
      })
      .reverse();
  }

  private updateInterviewRecord(candidateId: string | undefined, updates: Partial<InterviewRecord>): void {
    if (!candidateId) {
      return;
    }

    const interviews = this.getStoredInterviews();
    const index = interviews.findIndex(interview => interview['id'] === candidateId);

    if (index === -1) {
      return;
    }

    interviews[index] = {
      ...interviews[index],
      ...updates,
    };

    this.persistInterviews(interviews);

    if (this.activeItem?.id === candidateId) {
      this.activeItem = this.interviews.find(interview => interview['id'] === candidateId) || this.activeItem;
    }
  }

  private getStoredInterviews(): InterviewRecord[] {
    const storedInterviews = localStorage.getItem(this.interviewStorageKey);

    if (!storedInterviews) {
      return [];
    }

    try {
      return JSON.parse(storedInterviews) || [];
    } catch {
      return [];
    }
  }

  private persistInterviews(interviews: InterviewRecord[]): void {
    localStorage.setItem(this.interviewStorageKey, JSON.stringify(interviews));
    this.interviews = interviews.map(interview => this.normalizeInterviewRecord(interview));
    this.positions = [...new Set(this.interviews.map(interview => interview.position).filter(Boolean) as string[])];
    this.applyFilters();
  }

  private normalizeInterviewRecord(interview: InterviewRecord): InterviewRecord {
    const fullName = this.getCandidateName(interview);
    const appliedDate = interview.appliedDate || interview['dateApplied'] || '';
    const position = this.getCandidatePosition(interview);
    const stage = this.resolveInterviewStage(interview);

    return {
      ...interview,
      appliedDate,
      candidateName: interview['candidateName'] || fullName,
      contactNo: interview['contactNo'] || interview.phone || '',
      dateApplied: interview['dateApplied'] || appliedDate,
      documents: interview.documents || [],
      formResponses: interview.formResponses || [],
      fullName,
      fullname: interview['fullname'] || fullName,
      phone: interview.phone || interview['contactNo'] || '',
      position,
      meetingDetails: interview.meetingDetails || {
        date: interview['scheduledDate'] || '',
        time: '',
        location: '',
        interviewType: interview['interviewType'] || '',
        notes: ''
      },
      interviewPanel: interview.interviewPanel || [],
      interviewHistory: interview.interviewHistory || [],
      interviewStageSummaries: interview.interviewStageSummaries || [],
      interviewScoreAssignments: interview.interviewScoreAssignments || [],
      latestInterviewOutcome: interview.latestInterviewOutcome || 'Pending',
      scoreSheetStatus: interview.scoreSheetStatus || 'Not Started',
      aiVetting: interview.aiVetting || null,
      stage,
    };
  }

  private resolveInterviewStage(interview: InterviewRecord): InterviewStage {
    const stage = interview.stage?.toString();

    if (stage && ['Accepted', 'Declined', 'Awaiting Response', ...Object.values(ApplicationStage)].includes(stage)) {
      return stage as InterviewStage;
    }

    const response = interview.candidateResponse?.toLowerCase();
    if (response === 'accept') {
      return 'Accepted';
    }

    if (response === 'decline') {
      return 'Declined';
    }

    return (stage || 'Awaiting Response') as InterviewStage;
  }

  private getCandidateName(candidate?: InterviewRecord): string {
    if (!candidate) {
      return '';
    }

    return (
      candidate.fullName ||
      candidate['fullname'] ||
      candidate['candidateName'] ||
      `${candidate['firstname'] || candidate['firstName'] || ''} ${candidate['lastname'] || candidate['lastName'] || ''}`.trim()
    );
  }

  private getCandidatePosition(candidate?: InterviewRecord): string {
    if (!candidate) {
      return '';
    }

    return (
      candidate.position ||
      candidate['jobVacancy']?.jobTitle ||
      candidate['job']?.title ||
      candidate['jobVacancy']?.jobCategory?.name ||
      candidate['job']?.jobVacancy?.jobCategory?.name ||
      ''
    );
  }

  private buildStageSummary(
    interview: InterviewRecord,
    stageNumber: number,
    sessionId: string,
    assignments: InterviewScoreAssignmentDTO[]
  ): InterviewStageSummaryDTO {
    const submissions = this.getScoreSubmissions(interview['id'] || '', stageNumber, sessionId);
    const averageScore = submissions.length
      ? submissions.reduce((total, submission) => total + Number(submission.totalScore || 0), 0) / submissions.length
      : 0;

    return {
      stageNumber,
      sessionId,
      startedAt: interview.interviewStageSummaries?.find(summary => summary.stageNumber === stageNumber)?.startedAt || new Date().toISOString(),
      averageScore,
      totalSubmissions: submissions.length,
      panelSize: assignments.filter(assignment => assignment.stageNumber === stageNumber).length,
      submittedBy: submissions.map(submission => submission.interviewerName || submission.interviewerEmail || 'Interviewer'),
      outcome: submissions.length ? this.getOutcomeForScore(averageScore) : 'Pending'
    };
  }

  private getScoreSubmissions(candidateId: string, stageNumber: number, sessionId: string): ScoreSheetDTO[] {
    const allSubmittedCriteria = JSON.parse(localStorage.getItem('submittedCriteria') || '{}');
    const candidateSubmissions: ScoreSheetDTO[] = allSubmittedCriteria[candidateId] || [];
    return candidateSubmissions.filter(submission =>
      submission.interviewStage === stageNumber && (!sessionId || submission.sessionId === sessionId)
    );
  }

  private upsertStageSummary(existing: InterviewStageSummaryDTO[], summary: InterviewStageSummaryDTO): InterviewStageSummaryDTO[] {
    const summaryIndex = existing.findIndex(item => item.stageNumber === summary.stageNumber);
    if (summaryIndex === -1) {
      return [...existing, summary];
    }

    const updated = [...existing];
    updated[summaryIndex] = {
      ...updated[summaryIndex],
      ...summary
    };
    return updated;
  }

  private updateAssignmentsWithSubmission(interview: InterviewRecord, submission: ScoreSheetDTO): InterviewScoreAssignmentDTO[] {
    const existingAssignments = [...(interview.interviewScoreAssignments || [])];
    const assignmentIndex = existingAssignments.findIndex(assignment =>
      assignment.stageNumber === submission.interviewStage &&
      assignment.sessionId === submission.sessionId &&
      (assignment.participantEmail === submission.interviewerEmail || assignment.participantName === submission.interviewerName)
    );

    if (assignmentIndex === -1) {
      existingAssignments.push({
        id: this.generateId('assignment'),
        sessionId: submission.sessionId || '',
        stageNumber: submission.interviewStage || Number(interview['interviewStage'] || 1),
        participantName: submission.interviewerName || 'Interviewer',
        participantRole: submission.interviewerRole || 'Interviewer',
        participantEmail: submission.interviewerEmail || '',
        status: 'Submitted',
        submittedAt: submission.requestDate,
        totalScore: submission.totalScore
      });
      return existingAssignments;
    }

    existingAssignments[assignmentIndex] = {
      ...existingAssignments[assignmentIndex],
      status: 'Submitted',
      submittedAt: submission.requestDate,
      totalScore: submission.totalScore
    };
    return existingAssignments;
  }

  private createInterviewHistoryEntry(
    stageNumber: number,
    action: string,
    details: string,
    documents: AttachmentDTO[] = [],
    averageScore?: number,
    outcome?: InterviewOutcomeDTO
  ): InterviewHistoryItemDTO {
    return {
      id: this.generateId('history'),
      date: new Date().toISOString(),
      action,
      details,
      stageNumber,
      documents,
      averageScore,
      outcome
    };
  }

  private syncCandidateLifecycle(
    candidateId: string | undefined,
    updates: {
      status?: string;
      interviewStatus?: string;
      interviewDetails?: { scheduledDate?: string; location?: string; format?: string; notes?: string; };
    },
    historyAction: string,
    details: string
  ): void {
    if (!candidateId) {
      return;
    }

    const storedCandidates = localStorage.getItem('candidateData');
    if (!storedCandidates) {
      return;
    }

    try {
      const candidates = JSON.parse(storedCandidates);
      const candidateIndex = candidates.findIndex((candidate: any) => candidate.id === candidateId);

      if (candidateIndex === -1) {
        return;
      }

      if (updates.status) {
        candidates[candidateIndex].status = updates.status;
      }

      if (updates.interviewStatus) {
        candidates[candidateIndex].interviewStatus = updates.interviewStatus;
      }

      if (updates.interviewDetails) {
        candidates[candidateIndex].interviewDetails = {
          ...(candidates[candidateIndex].interviewDetails || {}),
          ...updates.interviewDetails
        };
      }

      if (!candidates[candidateIndex].decisionHistory) {
        candidates[candidateIndex].decisionHistory = [];
      }

      candidates[candidateIndex].decisionHistory.push({
        date: new Date().toISOString(),
        action: historyAction,
        details
      });

      localStorage.setItem('candidateData', JSON.stringify(candidates));
    } catch (error) {
      console.error('Error syncing candidate lifecycle:', error);
    }
  }

  private getLatestSummary(interview: InterviewRecord, stageNumber?: number): InterviewStageSummaryDTO | undefined {
    const summaries = interview.interviewStageSummaries || [];
    if (typeof stageNumber === 'number') {
      return summaries.find(summary => summary.stageNumber === stageNumber);
    }

    return [...summaries].sort((left, right) => right.stageNumber - left.stageNumber)[0];
  }

  private getOutcomeForScore(score: number): InterviewOutcomeDTO {
    if (score >= 70) return 'Pass';
    if (score >= 50) return 'Borderline';
    return 'Fail';
  }

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
  generateBlobUrl(dataUrl: string): string {
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeType = dataUrl.split(';')[0].split(':')[1];
  
    const byteNumbers = new Array(byteString.length);
    for (let i = 0; i < byteString.length; i++) {
      byteNumbers[i] = byteString.charCodeAt(i);
    }
  
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  }
  
  isDocument(value: any): boolean {
    return typeof value === 'string' && 
           (value.startsWith('data:application/pdf') || value.startsWith('data:application/vnd.openxmlformats-officedocument.wordprocessingml.document'));
  }
  
  getDocumentUrl(key: string): string {
    return this.isDocument(this.activeItem[key]) ? this.generateBlobUrl(this.activeItem[key]) : '';
  }


  getSubmittedCriteria() {
    const activeItemId = this.activeItem.id; // Get the active item's ID
    
    // Step 1: Retrieve all the submitted criteria data from localStorage
    const allSubmittedCriteria = JSON.parse(localStorage.getItem('submittedCriteria') || '{}');
    
    // Step 2: Retrieve the candidate's submissions for the activeItem.id
    const candidateData = allSubmittedCriteria[activeItemId] || [];
  
    // Step 3: Check if there is any data for the candidate
    if (candidateData.length === 0) {
      return []; // Return empty array if no data found
    }
  
    // Step 4: Map the data to return the relevant criteria and totalScore
    return candidateData.map((item: any) => ({
      criteria: item.criteria ? `${item.criteria.title} (Interview ${item.interviewStage || 1})` : 'Unknown Criteria',
      totalScore: item.totalScore || 0,
    }));
  }
  
  calculateAverageScore(scores: { totalScore: number }[]): number {
    if (!scores.length) return 0; // Return 0 if no scores are provided
    
    // Step 1: Calculate the total sum of all totalScores
    const totalSum = scores.reduce((sum, score) => sum + score.totalScore, 0);
    
    // Step 2: Calculate and return the average score
    return totalSum / scores.length;
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
       const fullName = `${candidate?.firstname || candidate?.firstName || ''} ${candidate?.lastname || candidate?.lastName || ''}`.trim() || candidate?.fullName || candidate?.candidateName || '';
      return fullName
        .split(' ')
        .map((namePart: string) => namePart[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
    }

  
  
}
