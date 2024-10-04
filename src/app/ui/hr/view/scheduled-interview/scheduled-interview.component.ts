import { Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-scheduled-interview',
  templateUrl: './scheduled-interview.component.html',
  styleUrl: './scheduled-interview.component.scss',
  providers: [MessageService, ConfirmationService]
})
export class ScheduledInterviewComponent {
  activeItem: any = {};
  searchTerm: string = '';
  interviews:any[] = [];
  showInterviewList: boolean = true;
  showInterviewInvite: boolean = false;
  showScoreSheet: boolean = false;

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
      case `Offer Sent`:
        return 'badge badge-lightgreen';  
      case 'Cancelled':
        return 'badge badge-lightred';
      case 'Next-Stage':
        return 'badge badge-lightblue';
      case 'Offer-Rejected':
        return 'badge badge-lightpurple';
      default:
        return '';
    }
  }

  ngOnInit(): void {
    // Retrieve candidates from localStorage
    const storedCandidates = localStorage.getItem('scheduledCandidate');
    if (storedCandidates) {
      this.interviews = JSON.parse(storedCandidates);
    }
    this.positions = [...new Set(this.interviews.map(c => c.position))];
    this.filteredCandidates = [...this.interviews];
    console.log(this.filteredCandidates)
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

  }

  openScoreSheet(interview: any){
    this.activeItem = interview
    // console.log(interview)
    this.showInterviewList = false;
    this.showScoreSheet = true;
  }

  SaveScoreSheet(){
    this.close();
  }

  sendInvite(): void {
    if (this.activeItem) {
      // Update the candidate's stage to "shortlisted"
      this.activeItem.stage = 'Scheduled';
  
      // Retrieve scheduledCandidate from localStorage
      const storedCandidates = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
  
      // Find the candidate to update
      const updatedCandidates = storedCandidates.map((candidate: any) => {
        if (candidate.id === this.activeItem.id) {
          return { ...candidate, stage: 'Scheduled' };  // Update the stage
        }
        return candidate;
      });
  
      // Update localStorage with the modified candidates
      // localStorage.setItem('candidates', JSON.stringify(updatedCandidates));
      
      // const scheduledInterview = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
      //  const newInterview =    { id: this.activeItem.id, candidate: this.activeItem.candidate, position: this.activeItem.position, email: this.activeItem.email, contactNo: this.activeItem.contactNo, dateApplied: this.activeItem.dateApplied, stage: 'Scheduled', resume: this.activeItem.resume, coverLetter: this.activeItem.coverLetter, interviewStage: 1 }

      // scheduledInterview.push(newInterview)
      // localStorage.setItem('scheduledCandidate', JSON.stringify(scheduledInterview));


      // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Scheduled For Interview',
        detail: `${this.activeItem.candidate} has been successfully scheduled for next interview stage.`
      });
    }
    this.close();
  }

  decline(interview: any){
    if (interview) {
      interview.stage = 'Cancelled';
      this.updateLocalStorage()
    }
  }
  sendOffer(interview: any){
    if (interview) {
      interview.stage = 'Offer Sent';
      this.updateLocalStorage()
    }
  }
  sendRejected(interview: any){
    if (interview) {
      interview.stage = 'Cancelled';
      this.updateLocalStorage()
    }
  }

  positions: any[] =[]; // Extract unique positions
  selectedPositions: string[] = [];
  filteredCandidates: any[] = [];

  // Function to filter candidates by selected positions
  filterCandidatesByPosition() {
    if (this.selectedPositions.length > 0) {
      this.filteredCandidates = this.interviews.filter(interview =>
        this.selectedPositions.includes(interview.position)
      );
    } else {
      this.filteredCandidates = [...this.interviews]; // Show all if no position is selected
    }
  }
  
  filterCandidates() {
    this.filteredCandidates = this.interviews.filter(interview => {
      // Check if the candidate matches the search term
      const matchesSearchTerm = interview.candidate.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(interview.position);
  
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
