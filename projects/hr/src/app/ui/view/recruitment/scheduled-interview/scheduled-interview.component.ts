import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO, ApplicationStage } from '../../../domain/applicant.dto';
import { TableColumn } from '../../../shared-component/view/table/table.component';
import {jsPDF} from 'jspdf';
import 'jspdf-autotable';
// import autoTable from "jspdf-autotable";

@Component({
  selector: 'app-scheduled-interview',
  templateUrl: './scheduled-interview.component.html',
  styleUrl: './scheduled-interview.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class ScheduledInterviewComponent {
  activeItem: any = {};
  searchTerm: string = '';
  interviews: ApplicantDTO[] = [];
  showInterviewList: boolean = true;
  showInterviewInvite: boolean = false;
  showScoreSheet: boolean = false;
  showOfferLetter: boolean = false;
  viewModal: boolean = false;
  showAppointment: boolean = false;
  positions: any[] =[]; // Extract unique positions
  selectedPositions: string[] = [];
  filteredCandidates: ApplicantDTO[] = [];
  candidateData: any = {};
  interviewColumns: TableColumn[] = [
    { header: 'Name', field: 'candidateName', sortable: true, className: 'table-item' },
    { header: 'Email', field: 'email', sortable: true, className: 'table-item' },
    { header: 'Position', field: 'position', sortable: true, className: 'table-item' },
    { header: 'Date Applied', field: 'dateApplied', sortable: true, className: 'table-item' },
    { header: 'Interview Type', field: 'interviewType', sortable: true, className: 'table-item' },
    { header: 'Interview Stage', field: 'interviewStage', sortable: true, className: 'table-item' },
    { header: 'Stage', field: 'stage', sortable: true, className: 'table-item' },
    { header: 'Actions', className: 'table-item' },
  ];


  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {
    this.getCandidateScore()
  }

  getStatusClass(stage: string) {
    switch (stage) {
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
    // Retrieve candidates from localStorage
    const storedCandidates = localStorage.getItem('scheduledCandidate');
    if (storedCandidates) {
      this.interviews = JSON.parse(storedCandidates);
    }

    // Extract unique positions
    this.positions = [...new Set(this.interviews.map(c => c.position))];

    // Reverse the order of candidates to implement LIFO
    this.filteredCandidates = [...this.interviews].reverse();

    console.log(this.filteredCandidates);

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
    const offerLetterSent: ApplicantDTO[] = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    
    // Find the candidate to update
    const index = offerLetterSent.findIndex((c: ApplicantDTO) => c.id === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      const updatedOfferLetterSent: ApplicantDTO = {
        ...offerLetterSent[index],
        stage:  ApplicationStage.OfferSent,
        offerSubject: offerDetails.offerSubject,
        offerLetter: offerDetails.offerLetter,
        offerAttachments: offerDetails.offerAttachments
      };

      // Update the existing candidate at the found index
      offerLetterSent[index] = updatedOfferLetterSent;
      console.log("Inteview-Candidate Info", offerLetterSent)
      localStorage.setItem('scheduledCandidate', JSON.stringify(offerLetterSent));

      // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Offer Letter Sent',
        detail: `${this.activeItem.candidateName} has successfully been sent an offer letter.`
      });
      
    }
      
    
    // Close the interview invite component
    this.close();
    this.getCandidateData();

  }
// ============================================================

// ====================================================view modal
  openViewModal(candidate: any, op?: any) {
    this.activeItem = candidate
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
    // Update the candidate's stage to "Scheduled"
    // const candidates: ApplicantDTO[] = JSON.parse(localStorage.getItem('candidates') || '[]');
    const scheduledCandidates: ApplicantDTO[] = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    
    // Find the candidate to update
    const index = scheduledCandidates.findIndex((c: ApplicantDTO) => c.id === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      // Increment the interviewStage
      const currentStage = this.activeItem.interviewStage || 0; // Default to 0 if undefined
      const updatedCandidate: ApplicantDTO = {
        ...scheduledCandidates[index],
        stage: ApplicationStage.Scheduled,
        interviewStage: currentStage + 1,  // Increment the interview stage
        interviewInvite: interviewDetails.interviewInvite,
        interviewType: interviewDetails.interviewType,
        inviteAttachments: interviewDetails.inviteAttachments
      };

      // Update the existing candidate at the found index
      scheduledCandidates[index] = updatedCandidate;
      console.log("Inteview-Candidate Info", scheduledCandidates)
      localStorage.setItem('scheduledCandidate', JSON.stringify(scheduledCandidates));

      // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Candidate Invited',
        detail: `${this.activeItem.candidate} has been successfully invited for the interview.`
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
  SaveScoreSheet(){
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
    const offerLetterSent: ApplicantDTO[] = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    
    // Find the candidate to update
    const index = offerLetterSent.findIndex((c: ApplicantDTO) => c.id === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      const updatedOfferLetterSent: ApplicantDTO = {
        ...offerLetterSent[index],
        stage:  ApplicationStage.AppointmentLetterSent,
        appointmentSubject: appointmentDetails.appointmentSubject,
        appointmentLetter: appointmentDetails.appointmentLetter,
        appointmentAttachments: appointmentDetails.appointmentAttachments
      };

      // Update the existing candidate at the found index
      offerLetterSent[index] = updatedOfferLetterSent;
      console.log("Inteview-Candidate Info", offerLetterSent)
      localStorage.setItem('scheduledCandidate', JSON.stringify(offerLetterSent));

      // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Offer Letter Sent',
        detail: `${this.activeItem.candidate} has successfully been sent an offer letter.`
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
      interview.stage = 'In-Progress';
      this.updateLocalStorage()
    }
  }
  endInterview(interview: any){
    if (interview) {
      interview.stage = `Completed`;
      this.updateLocalStorage()
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
    localStorage.setItem('scheduledCandidate', JSON.stringify(this.interviews));
  }

// =========================Function to filter candidates by selected positions
  filterCandidatesByPosition() {
    if (this.selectedPositions.length > 0) {
      this.filteredCandidates = this.interviews.filter(interview =>
        this.selectedPositions.includes(interview.position!)
      );
    } else {
      this.filteredCandidates = [...this.interviews]; // Show all if no position is selected
    }
  }
  filterCandidates() {
    this.filteredCandidates = this.interviews.filter(interview => {
      // Check if the candidate matches the search term
      const matchesSearchTerm = interview.candidateName!.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(interview.position!);
  
      return matchesSearchTerm && matchesPosition;
    });
  }
//====================================================================================== 



  getCandidateScore() {
    const storedData = localStorage.getItem('submittedCriteria');
    if (storedData) {
      this.candidateData = JSON.parse(storedData);
    }
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
  
    pdf.save(`${this.candidateData.candidateName} scoresheet.pdf`);

    this.messageService.add({
      severity: 'success',
      summary: 'Download Complete',
      detail: `Scoresheet for ${this.candidateData.candidateName} has been downloaded successfully.`,
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
      criteria: item.criteria ? item.criteria.title : 'Unknown Criteria',
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
  
  
  
  
}
