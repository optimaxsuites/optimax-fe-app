import { Component, OnInit } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataService } from '../../../service/data.service';

interface BranchDTO {
  id?: number;
  name: string;
  description: string;
  address: string;
  phoneNo: string;
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
  
    name: '',
    description: '',
    address: '',
    phoneNo: '',
  };
  showAddForm: boolean = false;

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private dataService: DataService
  ) {}

  ngOnInit() {
    this.loadBranches();
  }

  // Load branches from localStorage
  loadBranches() {
    this.dataService.getBranches().subscribe({
      next: (data: any) => {
        console.log(data)
        const formattedData = data.map((branch: any) => ({
          ...branch,
          isEditing: false
        }));
  
        this.branches = formattedData;
      },
      error: (error: any) => {
        console.log(error)
      },
    })
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
      phoneNo: '',
    };
  }

  submitBranch() {
    if (this.newBranch.name.trim() === '') {
      return;
    }

    this.dataService.addBranch(this.newBranch).subscribe({
      next: (data: any) => {
        this.branches.push(data);

        this.messageService.add({
          severity:'success',
          summary: 'Success',
          detail: 'Branch added successfully!',
        });
        this.toggleForm();
        this.resetForm();
      },
      error: (error: any) => {

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to add branch, please try again.',
        });
      },
    })
   
  }

  editBranch(branch: BranchDTO, event: Event) {
    event.stopPropagation();
    branch.isEditing = !branch.isEditing;
this.newBranch= branch
    if (!branch.isEditing) {
    //   this.saveBranchesToLocalStorage();

    //   this.messageService.add({
    //     severity: 'success',
    //     summary: 'Success',
    //     detail: 'Branch updated successfully!',
    //   });
    // }
    const data: BranchDTO = {
      id: branch.id,
      ...this.newBranch
    }
    this.dataService.addBranch(data).subscribe({
      next: (data: any) => {
        // this.branches.push(data);

        this.messageService.add({
          severity:'success',
          summary: 'Success',
          detail: 'Branch updated successfully!',
        });
        // this.toggleForm();
        this.resetForm();
      },
      error: (error: any) => {

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update branch, please try again.',
        });
      },
    })
  }
  }

  confirmBranchDelete(branch: BranchDTO, event: Event) {
    event.stopPropagation();

    this.confirmationService.confirm({
      target: event.target as EventTarget,
      message: `Are you sure you want to delete the branch "${branch.name}"?`,
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
      this.dataService.deleteBranch(branch.id || 0).subscribe({
        next: (data: any) => {
          // this.branches.push(data);
        this.branches = this.branches.filter((b) => b.id !== branch.id);

  
          this.messageService.add({
            severity:'success',
            summary: 'Success',
            detail: 'Branch deleted successfully!',
          });
          // this.toggleForm();
          this.resetForm();
        },
        error: (error: any) => {
  
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to delete branch, please try again.',
          });
        },
      })
       
      },
      reject: () => {
      
        this.messageService.add({
          severity: 'info',
          summary: 'Cancelled',
          detail: 'Branch deletion cancelled.',
        });
      },
    });
  }
}
