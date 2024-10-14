import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO } from '../../../domain/applicant.dto';

@Component({
  selector: 'app-scheduled-interview',
  templateUrl: './scheduled-interview.component.html',
  styleUrl: './scheduled-interview.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class ScheduledInterviewComponent {
  activeItem: any = {};
  searchTerm: string = '';
  interviews:ApplicantDTO[] = [];
  showInterviewList: boolean = true;
  showInterviewInvite: boolean = false;
  showScoreSheet: boolean = false;
  showOfferLetter: boolean = false;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {}

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

      case 'Employement-Letter-Sent':
        return 'badge badge-lightpink';

      default:
        return '';
    }
  }

  ngOnInit(): void {
    this.getCandidateData();
  }

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

  openInterviewInvite(interview: any){
    this.activeItem = interview
    // console.log(interview)
    this.showInterviewList = false;
    this.showInterviewInvite = true;
  }

  close() {
    this.showInterviewList = true;
    this.showInterviewInvite = false;
    this.showScoreSheet = false;
    this.showOfferLetter = false;
  }

  openScoreSheet(interview: any){
    this.activeItem = interview
    this.showInterviewList = false;
    this.showOfferLetter = false;
    this.showScoreSheet = true;
    this.showInterviewInvite = false;
  }

  ShowOfferLetter(interview: any){
    this.activeItem = interview;
    this.showOfferLetter = true;
    this.showInterviewList = false;
    this.showInterviewInvite = false;
    this.showScoreSheet = false;
  }

  sendOffer(offerDetails: any){
    // if (interview) {
    //   interview.stage = 'Offer-Sent';
    //   this.updateLocalStorage()
    // }
    const offerLetterSent: ApplicantDTO[] = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    
    // Find the candidate to update
    const index = offerLetterSent.findIndex((c: ApplicantDTO) => c.id === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      const updatedOfferLetterSent: ApplicantDTO = {
        ...offerLetterSent[index],
        stage: 'Offer-Sent',
        offerSubject: offerDetails.offerSubject,
        offerLetter: offerDetails.offerLetter,
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

  SaveScoreSheet(){
    this.close();
  }

  sendInvite(interviewDetails: { interviewType: string; interviewInvite: string }) {
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
        stage: 'Scheduled',
        interviewStage: currentStage + 1,  // Increment the interview stage
        interviewInvite: interviewDetails.interviewInvite,
        interviewType: interviewDetails.interviewType,
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

  decline(interview: any){
    if (interview) {
      interview.stage = 'Cancelled';
      this.updateLocalStorage()
    }
  }




  sendRejected(interview: any){
    if (interview) {
      interview.stage = 'Cancelled';
      this.updateLocalStorage()
    }
  }
  sendEmploymentLetter(interview: any){
    if (interview) {
      interview.stage = 'Employement-Letter-Sent';
      this.updateLocalStorage()
    }
  }

  positions: any[] =[]; // Extract unique positions
  selectedPositions: string[] = [];
  filteredCandidates: ApplicantDTO[] = [];

  // Function to filter candidates by selected positions
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
      const matchesSearchTerm = interview.candidate!.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(interview.position!);
  
      return matchesSearchTerm && matchesPosition;
    });
  }

  updateLocalStorage() {
    localStorage.setItem('scheduledCandidate', JSON.stringify(this.interviews));
  }


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
}
