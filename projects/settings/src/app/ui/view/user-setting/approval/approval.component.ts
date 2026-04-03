import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModulesService } from '../../../service/modules.service';
import { UserService } from '../../../sharedComponents/service/user.service';

type ApprovalStrategy = 'ANY' | 'ALL' | 'QUORUM' | 'SEQUENTIAL';

@Component({
  selector: 'app-approval',
  templateUrl: './approval.component.html',
  styleUrl: './approval.component.scss'
})
export class ApprovalComponent implements OnInit {
  // This main form will hold all submodules as dynamic groups
  approvalForm: FormGroup;
  modules: any[] = [];
  roles: any[] = [];
  users: any[] = [];

  constructor(
    private fb: FormBuilder, 
    private moduleService: ModulesService, 
    private cdr: ChangeDetectorRef,
    private userService: UserService
  ) {
    this.approvalForm = this.fb.group({
      submodules: this.fb.group({}) // Container for dynamic submodules
    });
    
  }

  ngOnInit() {
    // 1. Fetch Roles for the "Who" dropdown
    this.moduleService.getRoles().subscribe(apiRoles => {
      this.roles = apiRoles;
    });

    // 2. Fetch Modules and Build the Form
    this.moduleService.getModules().subscribe({
      next: (data) => {
        this.modules = data;
        this.buildApprovalForm();
      }
    });

     this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.cdr.markForCheck(); // Ensure view updates after async data load
      }
     })
  }

  buildApprovalForm() {
    const submodulesGroup = this.approvalForm.get('submodules') as FormGroup;

    this.modules.forEach(module => {
      module.appRegister.forEach((app: any) => {
        // Create a unique key for each submodule (e.g., 'Inventory_Items')
        const controlName = `${module.title}_${app.appName}`;
        
        submodulesGroup.addControl(controlName, this.fb.group({
          isEnabled: [false],
          strategy: ['ANY' as ApprovalStrategy, Validators.required], 
          quorumCount: [1, [Validators.min(1)]], // Only used if strategy is QUORUM
          approvers: this.fb.array([]) 
        }));
      });
    });
  }

  // Helper to get the FormArray for approvers
  getApprovers(moduleTitle: string, appName: string): FormArray {
    const controlName = `${moduleTitle}_${appName}`;
    return this.approvalForm.get(`submodules.${controlName}.approvers`) as FormArray;
  }

  addApprover(moduleTitle: string, appName: string) {
    this.getApprovers(moduleTitle, appName).push(this.fb.control('', Validators.required));
  }

  removeApprover(moduleTitle: string, appName: string, index: number) {
    this.getApprovers(moduleTitle, appName).removeAt(index);
  }

  saveSettings(moduleTitle: string, appName: string) {
    const controlName = `${moduleTitle}_${appName}`;
    const settings = this.approvalForm.get(`submodules.${controlName}`)?.value;
    console.log(`Saving Approval Flow for ${appName}:`, settings);
    // [Inference] Send this to your backend service to update the Workflow Policy table
    //todo: this.moduleService.updateApprovalPolicy(moduleTitle, appName, settings).subscribe(...);
  }
}