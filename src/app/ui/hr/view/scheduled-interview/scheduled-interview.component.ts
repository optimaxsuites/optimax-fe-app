import { Component } from '@angular/core';

@Component({
  selector: 'app-scheduled-interview',
  templateUrl: './scheduled-interview.component.html',
  styleUrl: './scheduled-interview.component.scss'
})
export class ScheduledInterviewComponent {

  searchTerm: string = '';

interviews:any = []
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
  candidates:any[] = [];


  positions = [...new Set(this.candidates.map(c => c.position))]; // Extract unique positions
  selectedPositions: string[] = [];
  filteredCandidates: any[] = [...this.candidates];

  // Function to filter candidates by selected positions
  filterCandidatesByPosition() {
    if (this.selectedPositions.length > 0) {
      this.filteredCandidates = this.candidates.filter(candidate =>
        this.selectedPositions.includes(candidate.position)
      );
    } else {
      this.filteredCandidates = [...this.candidates]; // Show all if no position is selected
    }
  }
  
  filterCandidates() {
    this.filteredCandidates = this.candidates.filter(candidate => {
      // Check if the candidate matches the search term
      const matchesSearchTerm = candidate.candidate.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(candidate.position);
  
      return matchesSearchTerm && matchesPosition;
    });
  }

  updateLocalStorage() {
    localStorage.setItem('scheduledCandidate', JSON.stringify(this.interviews));
  }


  startInterview(candidate: { stage: string; }){
    if (candidate) {
      candidate.stage = 'In-Progress';
      this.updateLocalStorage()
    }
  }
  endInterview(candidate: any){
    if (candidate) {
      candidate.stage = `Completed Stage-${candidate.interviewStage}-Interview`;
      this.updateLocalStorage()
    }
  }
}
