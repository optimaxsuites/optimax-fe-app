import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO, ApplicationStage } from '../../../domain/applicant.dto';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

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
  openViewModal(candidate: any, op: any) {
    this.activeItem = candidate
    this.showInterviewList = true;
    this.showInterviewInvite = false;
    this.viewModal = true;
    this.showScoreSheet = false;
    this.showOfferLetter = false;
    this.showAppointment = false;
    op.hide();
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


candidateData: any = {};

  getCandidateScore() {
    // Retrieve the data from localStorage
    const storedData = localStorage.getItem('submittedCriteria');
    
    // If data exists in localStorage, parse it, otherwise use an empty object
    if (storedData) {
      this.candidateData = JSON.parse(storedData);
    }
  }

  downloadScoresheet(candidateId: string) {
    const doc = new jsPDF();

    // Check if candidate data exists for the given candidateId
    const candidateData = this.candidateData[candidateId];

    if (!candidateData) {
      console.error('Candidate not found!');
      return;  // Exit if no data is found for the candidate
    }

    candidateData.forEach((criteriaData: { criteria: { title: any; }; submittedAt: any; totalScore: any; questions: any[]; }, index: number) => {
      // Add criteria title
      doc.text(`Criteria: ${criteriaData.criteria.title}`, 20, 30 + (index * 20));
      doc.text(`Submitted At: ${criteriaData.submittedAt}`, 20, 35 + (index * 20));
      doc.text(`Total Score: ${criteriaData.totalScore}`, 20, 40 + (index * 20));

      // Create a table for the criteria questions and scores
      const columns = ['Question', 'Score'];
      const data = criteriaData.questions.map(q => [q.text, q.score]);

      // Use jsPDF's autoTable method to create the table
      (doc as any).autoTable({
        startY: 45 + (index * 20),
        head: [columns],
        body: data
      });
    });

    // Save the generated PDF with a dynamic name
    doc.save('scoresheet.pdf');
  }

}
