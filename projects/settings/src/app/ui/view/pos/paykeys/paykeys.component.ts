import { ChangeDetectorRef, Component } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DataService } from '../../../service/data.service';
import { getLimitsForModule } from '../branches/branches.component';
import { forkJoin } from 'rxjs';

interface BranchDTO {
  id?: number;
  name: string;
  description: string;
  address: string;
  phoneNo: string;
  key: string;
  isEditing?: boolean;
  keyId?: number
}

@Component({
  selector: 'app-paykeys',
  templateUrl: './paykeys.component.html',
  styleUrl: './paykeys.component.scss'
})
export class PaykeysComponent {
branches: BranchDTO[] = [];
  newBranch: BranchDTO = {
    id: 0,
    name: '',
    description: '',
    address: '',
    phoneNo: '',
    key: ''
  };
  showAddForm: boolean = false;
  branchLimit = 0
  loading:boolean = false

  constructor(
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private dataService: DataService,
    private cdr: ChangeDetectorRef
    // private subscriptionService: SubscriptionService
  ) {}

  ngOnInit() {
    this.loadBranches();
     this.branchLimit = getLimitsForModule('optimaXPOS').branches || 0;
    console.log(this.branchLimit)

  }

  // Load branches from localStorage
  loadBranches() {
    this.dataService.getBranches().subscribe({
      next: (data: any) => {
        console.log(data)
        this.dataService.getPaymentKeys().subscribe((key) => {
          // next: (key: any) => {
            const formattedData = data.map((branch: any) => ({
          ...branch,
          isEditing: false,
          key: key.find((k: any) => k.branchId === branch.id)?.publicKey || 'N/A',
          keyId: key.find((k: any) => k.branchId === branch.id)?.id || 0
        }));
        this.branches = formattedData;
          
          // }

      this.cdr.detectChanges();

        })
        // const formattedData = data.map((branch: any) => ({
        //   ...branch,
        //   isEditing: false
        // }));
  
      },
      error: (error: any) => {
        console.log(error)
      }


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
      key: ''
    };
  }



  editBranch(branch: BranchDTO, event: Event) {
      
    branch.isEditing = !branch.isEditing;

    if(branch.isEditing) {this.newBranch.key = branch.key}

     if (this.newBranch.key.trim() === '' || this.newBranch.key.trim() === 'N/A') {
      return;
    }
// this.newBranch= branch
    if (!branch.isEditing) {
    event.stopPropagation();

    //   this.saveBranchesToLocalStorage();

    //   this.messageService.add({
    //     severity: 'success',
    //     summary: 'Success',
    //     detail: 'Branch updated successfully!',
    //   });
    // }
    const data: any = {
      id: branch.keyId,
      branchId: branch.id,
      publicKey: this.newBranch.key
    }

    console.log("key: ", data)
    this.dataService.addPaymentKeys(data).subscribe({
      next: (data: any) => {
        // this.branches.push(data);
        branch.key = data.publicKey;
        console.log(branch)
        this.messageService.add({
          severity:'success',
          summary: 'Success',
          detail: `Payment key set up for ${branch.name} successfully!`,
          key: 'tl'
        });

      this.cdr.detectChanges();

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




applyKeyToAll() {
  this.loading = true
  const requests = this.branches.map(branch => {
    const data = {
      id: branch.keyId,
      branchId: branch.id,
      publicKey: this.newBranch.key
    };

    return this.dataService.addPaymentKeys(data);
  });

  forkJoin(requests).subscribe({
    next: (results: any[]) => {
      results.forEach((res, i) => {
        this.branches[i].key = res.publicKey;
      });

      this.newBranch.key = '';
  this.loading = false

      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: `Payment key applied to all branches successfully!`,
        key: 'tl'
      });
    },
    error: () => {
  this.loading = false

      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to update all branches, please try again.'
      });
    }
  });
}
}
