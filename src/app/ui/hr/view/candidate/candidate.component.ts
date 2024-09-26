import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-candidate',
  templateUrl: './candidate.component.html',
  styleUrl: './candidate.component.scss'
})
export class CandidateComponent {
  showCandidate: boolean = true;
  showInterviewInvite: boolean = false;
  searchTerm: string = '';
  activeItem: any = {}
  viewModal: boolean = false;


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







  stages = ['Application Received', 'Shortlisted'];
  
  candidates: any[] = [
    { candidate: 'Damilola Awe', position: 'Frontend Dev', email: 'damilola.awe@hotmail.com', contactNo: '202-555-0181', dateApplied: '2023-06-04', stage: 'Shortlisted', resume: 'resume 1', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { candidate: 'Awe Williams', position: 'Sales Personel', email: 'Awe.williams@gmail.com', contactNo: '+1(970)333-3833', dateApplied: '2023-06-04', stage: 'Application Received', resume: 'resume 2', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { candidate: 'Anthony Awe', position: 'Frontend Dev', email: 'anthony.Awe@gmail.com', contactNo: '+1(970)888-3866', dateApplied: '2023-06-03', stage: 'Shortlisted', resume: 'resume 3', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { candidate: 'Kevin Awe', position: 'Backend Dev', email: 'kevin.Awe@gmail.com', contactNo: '202-555-0120', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 4', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' },
    { candidate: 'Christopher Awe', position: 'CEO', email: 'christopher.Awe@gmail.com', contactNo: '+49800600600', dateApplied: '2023-06-02', stage: 'Application Received', resume: 'resume 5', coverLetter: 'Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, aliquam officiis. Maiores dolore quod quia voluptas adipisci atque assumenda. Possimus tempora maxime odio adipisci amet dolor labore. Ratione nemo vel unde minus ullam reiciendis commodi esse iste sunt voluptatum cumque, veritatis dignissimos totam pariatur perspiciatis enim? Labore sapiente dignissimos quo nostrum ex ducimus doloremque. Deserunt minus explicabo dolorum asperiores facere eos minima iusto laborum quas quia? Accusantium similique ducimus fuga harum labore maxime eveniet deserunt placeat laudantium numquam, quae vero est ullam quia odit enim minus debitis sunt atque alias! Repudiandae sunt voluptas in explicabo accusamus, eaque sequi, consectetur totam quibusdam ipsa blanditiis beatae illo at ratione eius, harum ex natus neque molestiae saepe tempore corrupti praesentium! Ullam alias quidem ad architecto illo adipisci, assumenda id non necessitatibus culpa, dolorem voluptates. Quaerat magnam ex fuga dolorum temporibus doloribus officiis dicta voluptatem quis officia, veniam esse obcaecati neque a tempora tenetur eligendi, magni natus facere iste provident. Deserunt porro quo, dignissimos, molestiae laborum minima doloribus quasi, nostrum debitis provident dolorem ex illo! Necessitatibus perferendis consectetur sit vero, ea fugit voluptatem quae commodi minima ullam modi perspiciatis? Quo itaque possimus, laudantium rerum facere, odit quis, sunt fuga veritatis atque blanditiis expedita inventore ad optio tenetur quisquam qui in quam neque dolorem nihil consequuntur nulla ex sequi. Facilis aut natus, beatae ea quos optio ab dignissimos aliquid. Possimus sequi assumenda earum voluptatibus ad quod! Fugiat mollitia quo quos sunt minus possimus magnam sapiente aperiam modi quaerat optio voluptate aspernatur, odit pariatur impedit corrupti!' }
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
  
  filterCandidates() {
    this.filteredCandidates = this.candidates.filter(candidate => {
      // Check if the candidate matches the search term
      const matchesSearchTerm = candidate.candidate.toLowerCase().includes(this.searchTerm.toLowerCase());
  
      // Check if the candidate matches one of the selected positions (if any)
      const matchesPosition = this.selectedPositions.length === 0 || this.selectedPositions.includes(candidate.position);
  
      return matchesSearchTerm && matchesPosition;
    });
  }



}
