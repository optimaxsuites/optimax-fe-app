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
  readonly AVAILABLE_ACTIONS = ['CREATE', 'UPDATE', 'DELETE'];
  selectedAction: { [key: string]: string } = {}

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
    // 1. Fetch Roles for the Who dropdown
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
      // Create the exact key: "Point of Sale (POS)_Inventory"
      const controlName = `${module.title}_${app.appName}`;
      
      this.selectedAction[controlName] = 'CREATE';

      const actionsGroup = this.fb.group({});
      this.AVAILABLE_ACTIONS.forEach(action => {
        actionsGroup.addControl(action, this.fb.group({
          isEnabled: [true],
          stages: this.fb.array([]) 
        }));
      });

      // Add the control to the 'submodules' group
      submodulesGroup.addControl(controlName, this.fb.group({
        submoduleId: [app.id],
        isEnabled: [false], // The master toggle
        actions: actionsGroup
      }));
    });
  });
  this.cdr.detectChanges();
}

addStage(moduleTitle: string, appName: string, actionKey: string) {
  // 1. Get the array
  const stages = this.getStages(moduleTitle, appName, actionKey);
  
  if (!stages) {
    console.error(`Target FormArray not found: submodules.${moduleTitle}_${appName}.actions.${actionKey}.stages`);
    return;
  }

  // 2. Create the group
  const stageGroup = this.fb.group({
    name: [`${actionKey} Stage ${stages.length + 1}`, Validators.required],
    orderIndex: [stages.length + 1],
    approvalType: ['ANY', Validators.required],
    rejectionPolicy: ['STOP', Validators.required],
    isOptional: [false],
    minApprovals: [1, [Validators.min(1)]],
    allowSelfApproval: [false],
    assignment: this.fb.array([])
  });

  // 3. Push and Force Detection
  stages.push(stageGroup);
  this.cdr.markForCheck(); 
  this.cdr.detectChanges();
}

getStages(moduleTitle: string, appName: string, actionKey: string): FormArray {
  const controlName = `${moduleTitle}_${appName}`;
  // Use dot notation and wrap the control name in quotes if it contains special characters
  const path = `submodules.${controlName}.actions.${actionKey}.stages`;
  return this.approvalForm.get(path) as FormArray;
}

// Update this helper to include actionKey
getAssignments(moduleTitle: string, appName: string, actionKey: string, stageIndex: number): FormArray {
  return this.getStages(moduleTitle, appName, actionKey).at(stageIndex).get('assignment') as FormArray;
}

// Update removeAssignment to include actionKey
removeAssignment(moduleTitle: string, appName: string, actionKey: string, stageIndex: number, assignIndex: number) {
  this.getAssignments(moduleTitle, appName, actionKey, stageIndex).removeAt(assignIndex);
}

// Update addAssignment to include actionKey
addAssignment(moduleTitle: string, appName: string, actionKey: string, stageIndex: number) {
  const assignments = this.getAssignments(moduleTitle, appName, actionKey, stageIndex);
  
  const assignmentGroup = this.fb.group({
    userId: [null],
    roleId: [null],
  });

  // Enforce "Either/Or" logic
  assignmentGroup.get('userId')?.valueChanges.subscribe(val => {
    if (val) assignmentGroup.get('roleId')?.setValue(null, { emitEvent: false });
  });
  assignmentGroup.get('roleId')?.valueChanges.subscribe(val => {
    if (val) assignmentGroup.get('userId')?.setValue(null, { emitEvent: false });
  });

  assignments.push(assignmentGroup);
}

// Update removeStage to include actionKey
removeStage(moduleTitle: string, appName: string, actionKey: string, stageIndex: number) {
  const stages = this.getStages(moduleTitle, appName, actionKey);
  stages.removeAt(stageIndex);
}

  saveSettings(module: any, app: any) {
    const controlName = `${module.title}_${app.appName}`;
    const settings = this.approvalForm.get(`submodules.${controlName}`)?.value;
    console.log(`Saving Approval Flow for ${app.appName}:`, settings);

    const date = new Date();
    const now = date.toISOString();
    const payload = {
      id: 0,
      name: controlName,
      description: controlName,
      module: module.id,
      submoduleId: app.id,
      createdAt: now,
      updatedAt: now,
      isActive: true,
      version: 1,
      stages: settings.stages.map((stage: any, index: number) => ({
        name: stage.name,
        orderIndex: stage.orderIndex,
        approvalType: stage.approvalType,
        rejectionPolicy: stage.rejectionPolicy,
        isOptional: stage.isOptional,
        minApprovals: stage.minApprovals,
        allowSelfApproval: stage.allowSelfApproval,
        assignment: stage.assignment.map((assign: any) => ({
          userId: assign.userId,
          roleId: assign.roleId,
          position: assign.position
        }))
      }))
    }
    console.log(payload)
  }
}