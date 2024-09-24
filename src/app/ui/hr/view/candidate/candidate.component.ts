import { Component } from '@angular/core';

@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateComponent {
  showCandidate: boolean = true;
  showInterviewInvite: boolean = false;



  openInterviewInvite(){
    this.showCandidate = false;
    this.showInterviewInvite = true;
  }










  stages = ['Application Received', 'Shortlisted'];
  
  candidates: any[] = [
    { candidate: 'Rissa Quan', position: 'Frontend Dev', email: 'rissaquan@hotmail.com', contactNo: '202-555-0181', dateApplied: '2023-06-04', stage: 'Shortlisted' },
    { candidate: 'Susan Williams', position: 'Sales Personel', email: 'susan.williams@gmail.com', contactNo: '+1(970)333-3833', dateApplied: '2023-06-04', stage: 'Application Received' },
    { candidate: 'Anthony Davies', position: 'Frontend Dev', email: 'anthony.davies@gmail.com', contactNo: '+1(970)888-3866', dateApplied: '2023-06-03', stage: 'Shortlisted' },
    { candidate: 'Kevin Scott', position: 'Backend Dev', email: 'kevinscott@gmail.com', contactNo: '202-555-0120', dateApplied: '2023-06-02', stage: 'Application Received' },
    { candidate: 'Christopher Morgan', position: 'CEO', email: 'christopher.morgan@gmail.com', contactNo: '+49800600600', dateApplied: '2023-06-02', stage: 'Application Received' }
  ];

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

  // Function to handle stage selection
  updateStage(candidate: any, newStage: string) {
    candidate.stage = newStage;
  }



}
