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

  getDynamicKeys(): string[] {
    const predefinedKeys = [
      'id', 'candidateName', 'contactNo', 'email', 'position',
      'dateApplied', 'stage', 'interviewStage', 'firstname', 'lastname',
      'interviewSubject', 'interviewInvite', 'interviewType', 'inviteAttachments',
      'offerSubject', 'offerLetter', 'offerAttachments',
      'appointmentSubject', 'appointmentLetter', 'appointmentAttachments'
    ];
    
    return Object.keys(this.activeItem).filter(key => !predefinedKeys.includes(key));
  }
  
  isFile(value: any): boolean {
    return typeof value === 'string' && (value.startsWith('http') || value.startsWith('blob:'));
  }


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

  viewResume(resume: string | File): void {
    if (!resume) {
      console.error('No resume found.');
      return;
    }
  
    if (typeof resume === 'string') {
      // If resume is a base64 string
      const base64String = resume.split(',')[1];  // Strip the base64 prefix
      const blob = this.base64ToBlob(base64String, 'application/pdf');  // Assuming resume is a PDF
  
      // Open the file in a new window
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else if (resume instanceof File) {
      // If resume is a File object, create a URL from it
      const fileUrl = URL.createObjectURL(resume);
      window.open(fileUrl, '_blank');
    }
  }
  
  // Helper function to convert base64 to a Blob
  base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);  // Decode the base64 string
    const byteArrays = [];
  
    for (let offset = 0; offset < byteCharacters.length; offset += 1024) {
      const slice = byteCharacters.slice(offset, offset + 1024);
      const byteNumbers = new Array(slice.length);
  
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
  
      byteArrays.push(new Uint8Array(byteNumbers));
    }
  
    return new Blob(byteArrays, { type: mimeType });
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
    // if (!localStorage.getItem('candidates')) {
    //   localStorage.setItem('candidates', JSON.stringify(this.myCandidates));
    // }

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
  
  // myCandidates: any[] = [
  //   { id: 1, candidateName: 'Damilola Awe', position: 'Frontend Dev', email: 'damilola.awe@hotmail.com', contactNo: '202-555-0181', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 1', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. luptatum cumque,',  },
  //   { id: 2, candidateName: 'Awe Williams', position: 'Sales Personel', email: 'Awe.williams@gmail.com', contactNo: '+1(970)333-3833', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 2', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. quam, ' },
  //   { id: 3, candidateName: 'Anthony Awe', position: 'Frontend Dev', email: 'anthony.Awe@gmail.com', contactNo: '+1(970)888-3866', dateApplied: '2023-06-03', stage: 'Application Received', resume: 'resume 3', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluia voluptas ' },
  //   { id: 4, candidateName: 'Kevin Awe', position: 'Backend Dev', email: 'kevin.Awe@gmail.com', contactNo: '202-555-0120', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 4', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, ' },
  //   { id: 5, candidateName: 'Christopher Awe', position: 'CEO', email: 'christopher.Awe@gmail.com', contactNo: '+49800600600', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 5', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loruLorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas,loru' }
  // ];

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
      const matchesSearchTerm = candidate.candidateName!.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(candidate.position!);
  
      return matchesSearchTerm && matchesPosition;
    });
  }

  confirmCandidateDelete(candidate: any): void {
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${candidate.candidateName}'s application`,
      header: `Delete Candidate - ${candidate.candidateName}`,
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
      detail: `${candidate.candidateName} application has been successfully deleted.`
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
        detail: `${this.activeItem.candidateName} has been successfully invited for the interview.`
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

  // downloadFile(candidate: any) {
  //   // Retrieve existing candidates from localStorage
  //   const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');
    
  //   // Find the applicant by ID
  //   const applicant = existingCandidates.find((c: any) => c.id === candidate.id);
    
  //   if (applicant && applicant.resume) {
  //     // Extract the resume data
  //     const resumeData = applicant.resume;
  
  //     // Create a link element
  //     const link = document.createElement('a');
  //     link.href = resumeData;  // Base64 data URI
  //     link.download = `${applicant.candidateName} Resume`;  // Suggested file name
  
  //     // Trigger the download
  //     link.click();
  //   } else {
  //     this.messageService.add({
  //       severity: 'error',
  //       summary: 'Download Failed',
  //       detail: `Resume not found for ${candidate.candidateName}.`
  //     });
  //     // console.error('');
  //   }
  // }
  
  
  downloadFile(candidate: any) {
    // Retrieve existing candidates from localStorage
    const existingCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');
  
    // Find the applicant by ID
    const applicant = existingCandidates.find((c: any) => c.id === candidate.id);
  
    if (applicant) {
      const keywords = ['resume', 'cv', 'curriculum vitae'];
  
      // Filter out potential resume-related Base64 data
      const cvFiles = Object.entries(applicant).filter(([key, value]) => {
        if (typeof value === 'string' && value.startsWith('data:')) {
          // Attempt to decode Base64 metadata
          try {
            const decodedValue = atob(value.split(',')[1]);
            return keywords.some(keyword =>
              key.toLowerCase().includes(keyword) || decodedValue.toLowerCase().includes(keyword)
            );
          } catch {
            return false; // Skip if decoding fails
          }
        }
        return false;
      });
  
      if (cvFiles.length > 0) {
        cvFiles.forEach(([key, base64Data]) => {
          const link = document.createElement('a');
          link.href = base64Data as string; // Base64 data URI
          link.download = `${applicant.candidateName || 'Candidate'} - ${key}`; // Generate a meaningful filename
          link.click();
        });
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Download Failed',
          detail: `No CV or resume found for ${candidate.candidateName}.`
        });
      }
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Download Failed',
        detail: `Candidate not found.`
      });
    }
  }
  
  
}
