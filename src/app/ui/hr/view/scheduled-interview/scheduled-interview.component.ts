import { Component } from '@angular/core';

@Component({
  selector: 'app-scheduled-interview',
  templateUrl: './scheduled-interview.component.html',
  styleUrl: './scheduled-interview.component.scss'
})
export class ScheduledInterviewComponent {
  activeItem: any = {};
  searchTerm: string = '';
  interviews:any[] = [];
  showInterviewList: boolean = true;
  showInterviewInvite: boolean = false;


  getStatusClass(stage: string) {
    switch (stage) {
      case 'Scheduled':
        return 'badge badge-lightgrey';
      case 'In-Progress':
        return 'badge badge-lightblue';
      case `Completed`:
        return 'badge badge-lightblue';
      case 'Cancled':
        return 'badge badge-lightblue';
      case 'Next-Stage':
        return 'badge badge-lightblue';
      case 'Offer-Rejected':
        return 'badge badge-lightblue';
      default:
        return '';
    }
  }

  ngOnInit(): void {
    // Retrieve candidates from localStorage
    const storedCandidates = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    this.interviews = [...storedCandidates]
    this.positions = [...new Set(this.filteredCandidates.map(c => c.position))];
  }

  openInterviewInvite(interview: any){
    this.activeItem = interview
    // console.log(interview)
    this.showInterviewList = false;
    this.showInterviewInvite = true;
  }

  closeInterviewInvite() {
    this.showInterviewList = true;
    this.showInterviewInvite = false;
  }
  sendInvite(){

  }


  positions: any[] =[]; // Extract unique positions
  selectedPositions: string[] = [];
  filteredCandidates: any[] = [...this.interviews];

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


  startInterview(interview: { stage: string; }){
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
