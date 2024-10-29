import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ApplicantDTO, ApplicationStage } from '../../../domain/applicant.dto';

@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class CandidateComponent implements OnInit {
  showCandidate: boolean = true;
  showInterviewInvite: boolean = false;
  searchTerm: string = '';
  activeItem: ApplicantDTO = {}
  viewModal: boolean = false;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService 
  ) {}


  openViewModal(candidate: any, op: any) {
    this.activeItem = candidate
    // this.tableSection =!this.tableSection
    this.viewModal = !this.viewModal;
    op.hide();
  }
  closeViewModal() {
    this.viewModal = false;
  }

  openInterviewInvite(candidate: any){
    this.activeItem = candidate
    console.log(candidate)
    this.showCandidate = false;
    this.showInterviewInvite = true;
  }
  closeInterviewInvite() {
    this.showCandidate = true;
    this.showInterviewInvite = false;
  }

  viewResume(resumeFile: string){

  }

  getStatusClass(stage: string) {
    switch (stage) {
      case 'Application Received':
        return 'badge badge-lightgrey';
      case 'Shortlisted':
        return 'badge badge-lightblue';
      default:
        return '';
    }
  }



  ngOnInit(): void {
    // Store myCandidates in localStorage if not already present
    if (!localStorage.getItem('candidates')) {
      localStorage.setItem('candidates', JSON.stringify(this.myCandidates));
    }

    this.getCandidate();
  }

  getCandidate(){
    // Retrieve candidates from localStorage
    const storedCandidates = localStorage.getItem('candidates');
    if (storedCandidates) {
      this.candidates = JSON.parse(storedCandidates);
    }

    // Initialize positions and filteredCandidates after candidates are loaded
    this.positions = [...new Set(this.candidates.map(c => c.position))]; // Extract unique positions
    this.filteredCandidates = [...this.candidates].reverse(); // Initially, show all candidates

    console.log(this.candidates)
  }


  stages = ['Application Received', 'Shortlisted'];
  
  myCandidates: any[] = [
    { id: 1, candidate: 'Damilola Awe', position: 'Frontend Dev', email: 'damilola.awe@hotmail.com', contactNo: '202-555-0181', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 1', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. luptatum cumque,',  },
    { id: 2, candidate: 'Awe Williams', position: 'Sales Personel', email: 'Awe.williams@gmail.com', contactNo: '+1(970)333-3833', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 2', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. quam, ' },
    { id: 3, candidate: 'Anthony Awe', position: 'Frontend Dev', email: 'anthony.Awe@gmail.com', contactNo: '+1(970)888-3866', dateApplied: '2023-06-03', stage: 'Application Received', resume: 'resume 3', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluia voluptas ' },
    { id: 4, candidate: 'Kevin Awe', position: 'Backend Dev', email: 'kevin.Awe@gmail.com', contactNo: '202-555-0120', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 4', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, ' },
    { id: 5, candidate: 'Christopher Awe', position: 'CEO', email: 'christopher.Awe@gmail.com', contactNo: '+49800600600', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 5', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru' }
  ];

  candidates: ApplicantDTO[] = JSON.parse(localStorage.getItem('candidates') || '[]');

  positions: any[] =[]; // Extract unique positions

  // positions = [...new Set(this.candidates.map(c => c.position))]; // Extract unique positions
  selectedPositions: string[] = [];
  filteredCandidates: ApplicantDTO[] = [];

  // Function to filter candidates by selected positions
  filterCandidatesByPosition() {
    if (this.selectedPositions.length > 0) {
      this.filteredCandidates = this.candidates.filter(candidate =>
      this.selectedPositions.includes(candidate.position!)
      );
    } else {
      this.filteredCandidates = [...this.candidates]; // Show all if no position is selected
    }
  }

  // Function to handle stage selection
  updateStage(candidate: any, newStage: string) {
    candidate.stage = newStage;
  }
  
  filterCandidates() {
    this.filteredCandidates = this.candidates.filter(candidate => {
      // Check if the candidate matches the search term
      const matchesSearchTerm = candidate.candidate!.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(candidate.position!);
  
      return matchesSearchTerm && matchesPosition;
    });
  }

  confirmCandidateDelete(candidate: any): void {
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${candidate.candidate}'s application`,
      header: `Delete Candidate - ${candidate.candidate}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteCandidate(candidate);
      },
      reject: () => {

      }
    });
  }

  deleteCandidate(candidate: any): void {
  // Retrieve the candidates from localStorage
  const storedCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');

  // Filter out the candidate to delete
  const updatedCandidates = storedCandidates.filter((c: any) => c.id !== candidate.id);

  // Update the localStorage with the new candidates array
  localStorage.setItem('candidates', JSON.stringify(updatedCandidates));

  // Update the table data to reflect the deletion
  this.filteredCandidates = updatedCandidates;

  // Update the localStorage with the new candidates array
  localStorage.setItem('candidates', JSON.stringify(updatedCandidates));
    this.messageService.add({
      severity: 'success',
      summary: 'Candidate Deleted',
      detail: `${candidate.candidate} application has been successfully deleted.`
    });
  }

  // Function to handle sending interview invite  
  sendInvite(interviewDetails: ApplicantDTO) {
    // Update the candidate's stage to "Scheduled"
    const interviewCandidate: ApplicantDTO[] = JSON.parse(localStorage.getItem('candidates') || '[]');
    const scheduledInterview: ApplicantDTO[] = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
    
    // Find the candidate to update
    const index = interviewCandidate.findIndex((c: ApplicantDTO) => c.id === this.activeItem?.id);
    if (index !== -1 && this.activeItem) {
      // Increment the interviewStage
      const currentStage = this.activeItem.interviewStage || 0; // Default to 0 if undefined
      const updatedCandidate: ApplicantDTO = {
        ...interviewCandidate[index],
        stage: ApplicationStage.Scheduled,
        interviewStage: currentStage + 1,  // Increment the interview stage
        interviewInvite: interviewDetails.interviewInvite,
        interviewType: interviewDetails.interviewType,
        inviteAttachments: interviewDetails.inviteAttachments,
      };

      // Remove the candidate from the candidates array
      interviewCandidate.splice(index, 1);
      
      // Update local storage
      localStorage.setItem('candidates', JSON.stringify(interviewCandidate));
      scheduledInterview.push(updatedCandidate);
      console.log("candidate-Job Application Info", updatedCandidate.interviewInvite, updatedCandidate.interviewType)
      localStorage.setItem('scheduledCandidate', JSON.stringify(scheduledInterview));

          // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Candidate Invited',
        detail: `${this.activeItem.candidate} has been successfully invited for the interview.`
      });
      
      // Close the interview invite component
      this.closeInterviewInvite();
      this.getCandidate();
    }
  }
  
  updateInterviewStatus(inviteData: any) {
    // Your logic to save or handle the interview data
    console.log('Updating interview status:', inviteData);
  }
}
