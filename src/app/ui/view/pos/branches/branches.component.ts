import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';

interface BranchDTO {
  id: number;
  name: string;
  description: string;
  address: string;
  phoneNo: number;
  isEditing?: boolean;
}

@Component({
  selector: 'app-branches',
  templateUrl: './branches.component.html',
  styleUrls: ['./branches.component.scss'],
  providers: [ConfirmationService, MessageService], // Add ConfirmationService and MessageService here
})
export class BranchesComponent implements OnInit {
  branches: BranchDTO[] = [];
  newBranch: BranchDTO = {
    id: 0,
    name: '',
    description: '',
    address: '',
    phoneNo: 0,
  };
  showAddForm: boolean = false;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    this.loadBranchesFromLocalStorage();
  }

  // Load branches from localStorage
  loadBranchesFromLocalStorage() {
    const savedBranches = localStorage.getItem('branches');
    if (savedBranches) {
      this.branches = JSON.parse(savedBranches);
    }
  }

  // Save branches to localStorage
  saveBranchesToLocalStorage() {
    localStorage.setItem('branches', JSON.stringify(this.branches));
  }

  toggleForm() {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.resetForm();
    }
  }

  resetForm() {
    this.newBranch = {
      id: 0,
      name: '',
      description: '',
      address: '',
      phoneNo: 0,
    };
  }

  submitBranch() {
    if (this.newBranch.name.trim() === '') {
      return;
    }

    // Generate a unique ID for the new branch
    this.newBranch.id = this.branches.length + 1;

    // Add the new branch to the list
    this.branches.push({ ...this.newBranch });

    // Save to localStorage
    this.saveBranchesToLocalStorage();

    // Show success message
    this.messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'Branch added successfully!',
    });

    // Reset the form and hide the add form
    this.toggleForm();
    this.resetForm();
  }

  editBranch(branch: BranchDTO, event: Event) {
    event.stopPropagation();
    branch.isEditing = !branch.isEditing;

    if (!branch.isEditing) {
      // Save changes to localStorage
      this.saveBranchesToLocalStorage();

      // Show success message
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Branch updated successfully!',
      });
    }
  }

  confirmBranchDelete(branch: BranchDTO, event: Event) {
    event.stopPropagation();

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to delete the branch "${branch.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        // Remove the branch from the list
        this.branches = this.branches.filter((b) => b.id !== branch.id);

        // Save to localStorage
        this.saveBranchesToLocalStorage();

        // Show success message
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Branch deleted successfully!',
        });
      },
      reject: () => {
        // Optional: Show a message if the user cancels
        this.messageService.add({
          severity: 'info',
          summary: 'Cancelled',
          detail: 'Branch deletion cancelled.',
        });
      },
    });
  }
}
