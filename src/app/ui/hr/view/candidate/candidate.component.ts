import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

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
  activeItem: any = {}
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

  downloadResume(resumeFile: string){

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

    // Retrieve candidates from localStorage
    const storedCandidates = localStorage.getItem('candidates');
    if (storedCandidates) {
      this.candidates = JSON.parse(storedCandidates);
    }

    // Initialize positions and filteredCandidates after candidates are loaded
  this.positions = [...new Set(this.candidates.map(c => c.position))]; // Extract unique positions
  this.filteredCandidates = [...this.candidates]; // Initially, show all candidates

    console.log(this.candidates)
  }



  // stages = ['Application Received', 'Shortlisted'];
  
  myCandidates: any[] = [
    { id: 1, candidate: 'Damilola Awe', position: 'Frontend Dev', email: 'damilola.awe@hotmail.com', contactNo: '202-555-0181', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 1', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { id: 2, candidate: 'Awe Williams', position: 'Sales Personel', email: 'Awe.williams@gmail.com', contactNo: '+1(970)333-3833', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 2', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { id: 3, candidate: 'Anthony Awe', position: 'Frontend Dev', email: 'anthony.Awe@gmail.com', contactNo: '+1(970)888-3866', dateApplied: '2023-06-03', stage: 'Application Received', resume: 'resume 3', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { id: 4, candidate: 'Kevin Awe', position: 'Backend Dev', email: 'kevin.Awe@gmail.com', contactNo: '202-555-0120', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 4', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { id: 5, candidate: 'Christopher Awe', position: 'CEO', email: 'christopher.Awe@gmail.com', contactNo: '+49800600600', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 5', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' }
  ];

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

  // Function to handle stage selection
  updateStage(candidate: any, newStage: string) {
    candidate.stage = newStage;
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
  markCandidateAsShortlisted(): void {
    if (this.activeItem) {
      // Update the candidate's stage to "shortlisted"
      this.activeItem.stage = 'Shortlisted';
  
      // Retrieve candidates from localStorage
      const storedCandidates = JSON.parse(localStorage.getItem('candidates') || '[]');
  
      // Find the candidate to update
      const updatedCandidates = storedCandidates.map((candidate: any) => {
        if (candidate.id === this.activeItem.id) {
          return { ...candidate, stage: 'Shortlisted' };  // Update the stage
        }
        return candidate;
      });
  
      // Update localStorage with the modified candidates
      localStorage.setItem('candidates', JSON.stringify(updatedCandidates));
      
      const scheduledInterview = JSON.parse(localStorage.getItem('scheduledCandidate') || '[]');
       const newInterview =    { id: this.activeItem.id, candidate: this.activeItem.candidate, position: this.activeItem.position, email: this.activeItem.email, contactNo: this.activeItem.contactNo, dateApplied: this.activeItem.dateApplied, stage: 'Scheduled', resume: this.activeItem.resume, coverLetter: this.activeItem.coverLetter, interviewStage: 1 }

      scheduledInterview.push(newInterview)
      localStorage.setItem('scheduledCandidate', JSON.stringify(scheduledInterview));


      // Optionally, show a success message
      this.messageService.add({
        severity: 'success',
        summary: 'Candidate Shortlisted',
        detail: `${this.activeItem.candidate} has been successfully shortlisted.`
      });
    }
    this.closeInterviewInvite();
  }
  

}
