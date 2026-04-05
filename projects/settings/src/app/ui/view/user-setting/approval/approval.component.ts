import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModulesService } from '../../../service/modules.service';
import { UserService } from '../../../sharedComponents/service/user.service';

type ApprovalStrategy = 'ANY' | 'ALL' | 'QUORUM' | 'SEQUENTIAL';
interface StageForm {
  name: string;
  orderIndex: number;
  minApprovals: number;
  rejectionPolicy: string,
  approvalType: 'ANY' | 'ALL' | 'QUORUM';
  isOptional: boolean
  allowSelfApproval: boolean;
  assignment: any[]; // AssignmentDTO[] 
}

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

  // buildApprovalForm() {
  //   const submodulesGroup = this.approvalForm.get('submodules') as FormGroup;

  //   this.modules.forEach(module => {
  //     module.appRegister.forEach((app: any) => {
  //       // Create a unique key for each submodule (e.g., 'Inventory_Items')
  //       const controlName = `${module.title}_${app.appName}`;
        
  //       submodulesGroup.addControl(controlName, this.fb.group({
  //         isEnabled: [false],
  //         strategy: ['ANY' as ApprovalStrategy, Validators.required], 
  //         quorumCount: [1, [Validators.min(1)]], // Only used if strategy is QUORUM
  //         approvers: this.fb.array([]) 
  //       }));
  //     });
  //   });
  // }

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

buildApprovalForm() {
  const submodulesGroup = this.approvalForm.get('submodules') as FormGroup;

  this.modules.forEach(module => {
    module.appRegister.forEach((app: any) => {
      const controlName = `${module.title}_${app.appName}`;
      
      // Structure based on ApprovalDTO 
      submodulesGroup.addControl(controlName, this.fb.group({
        isEnabled: [false], // UI-only toggle
        isActive: [true],   // Backend boolean 
        submoduleId: [app.id], // Submodule Id 
        version: [1],       // Versioning 
        stages: this.fb.array([]) // StageDTO[] [cite: 37, 39]
      }));
    });
  });
  
  // Trigger change detection once the form is built
  this.cdr.detectChanges();
}

// Helper to get Stages FormArray
getStages(moduleTitle: string, appName: string): FormArray {
  const controlName = `${moduleTitle}_${appName}`;
  return this.approvalForm.get(`submodules.${controlName}.stages`) as FormArray;
}

addStage(moduleTitle: string, appName: string) {
  const stages = this.getStages(moduleTitle, appName);
  stages.push(this.fb.group({
    name: [`Stage ${stages.length + 1}`, Validators.required], // 
    orderIndex: [stages.length + 1], // 
    approvalType: ['ANY', Validators.required], // 
    rejectionPolicy: ['STOP', Validators.required],
    isOptional: [false],
    minApprovals: [1, [Validators.min(1)]], // 
    allowSelfApproval: [false], // 
    assignment: this.fb.array([]) // AssignmentDTO[] 
  }));
}

getAssignments(moduleTitle: string, appName: string, stageIndex: number): FormArray {
  return this.getStages(moduleTitle, appName).at(stageIndex).get('assignment') as FormArray;
}

addAssignment(moduleTitle: string, appName: string, stageIndex: number) {
  const assignments = this.getAssignments(moduleTitle, appName, stageIndex);
  
  const assignmentGroup = this.fb.group({
    userId: [null],
    roleId: [null],
    position: [assignments.length + 1] // Matches AssignmentDTO 'position'
  });

  // Watchers to ensure "OR" logic
  const userCtrl = assignmentGroup.get('userId');
  const roleCtrl = assignmentGroup.get('roleId');

  userCtrl?.valueChanges.subscribe(val => {
    if (val) roleCtrl?.setValue(null, { emitEvent: false });
  });

  roleCtrl?.valueChanges.subscribe(val => {
    if (val) userCtrl?.setValue(null, { emitEvent: false });
  });

  assignments.push(assignmentGroup);
}
removeStage(moduleTitle: string, appName: string, stageIndex: number) {
  this.getStages(moduleTitle, appName).removeAt(stageIndex);
}

removeAssignment(moduleTitle: string, appName: string, stageIndex: number, assignIndex: number) {
  this.getAssignments(moduleTitle, appName, stageIndex).removeAt(assignIndex);
}

  saveSettings(moduleTitle: string, appName: string) {
    const controlName = `${moduleTitle}_${appName}`;
    const settings = this.approvalForm.get(`submodules.${controlName}`)?.value;
    console.log(`Saving Approval Flow for ${appName}:`, settings);
    // [Inference] Send this to your backend service to update the Workflow Policy table
    //todo: this.moduleService.updateApprovalPolicy(moduleTitle, appName, settings).subscribe(...);
  }
}