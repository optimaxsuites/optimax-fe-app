import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { ModulesService } from '../../../service/modules.service';
import { UserService } from '../../../sharedComponents/service/user.service';
import { ApprovalWorkflowService } from '../../../service/approval-workflow.service';
import { MessageService } from 'primeng/api';

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
    private userService: UserService,
    private workflowService: ApprovalWorkflowService,
    private messageService: MessageService
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
        next: (modules) => {
          this.modules = modules;
          this.buildApprovalForm();
          
          // Load existing configurations from backend
          this.workflowService.getWorkflows().subscribe(existingWorkflows => {
            this.patchExistingWorkflows(existingWorkflows);
          });
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
            id: [0],
            isEnabled: [true],
            stages: this.fb.array([]) 
          }));
        });

        // Add the control to the 'submodules' group
        submodulesGroup.addControl(controlName, this.fb.group({
          id: [0],
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

  patchExistingWorkflows(workflows: any[]) {
  workflows.forEach(flow => {
    // 1. Identify the correct submodule control name
    const controlName = `${flow.module.title}_${flow.submodule.appName}`;
    const submoduleGroup = this.approvalForm.get(`submodules.${controlName}`) as FormGroup;

    if (submoduleGroup) {
      const actionGroup = submoduleGroup.get(`actions.${flow.actionKey}`) as FormGroup;
      
      if (actionGroup) {
        // Patch high-level flow data including ID for updates
        actionGroup.patchValue({
          id: flow.id, // Store the workflow ID
          isEnabled: flow.isActive
        }, { emitEvent: false });

        // Master toggle logic: If any action is active, submodule is enabled
        if (flow.isActive) {
          submoduleGroup.patchValue({ isEnabled: true }, { emitEvent: false });
        }

        // 2. Clear and Rebuild Stages
        const stagesArray = actionGroup.get('stages') as FormArray;
        stagesArray.clear();

        flow.stages.forEach((stage: any) => {
          const stageGroup = this.fb.group({
            id: [stage.id], // ID for the stage
            name: [stage.name, Validators.required],
            orderIndex: [stage.orderIndex],
            approvalType: [stage.approvalType, Validators.required],
            rejectionPolicy: [stage.onReject, Validators.required],
            isOptional: [stage.isOptional || false],
            minApprovals: [stage.minApprovals, [Validators.min(1)]],
            allowSelfApproval: [stage.allowSelfApproval],
            isDocumentRequired: [stage.isDocumentRequired],
            canEditRecord: [stage.canEditRecord],
            assignment: this.fb.array([])
          });

          // 3. Patch Assignments
          const assignmentsArray = stageGroup.get('assignment') as FormArray;
          stage.assignment.forEach((assign: any) => {
            assignmentsArray.push(this.fb.group({
              id: [assign.id], // ID for the assignment
              userId: [assign.userId ? assign.userId.id : null],
              roleId: [assign.roleId ? assign.roleId.id : null]
            }));
          });

          stagesArray.push(stageGroup);
        });
      }
    }
  });
  this.cdr.detectChanges();
}

  saveSettings(module: any, app: any) {
    const controlName = `${module.title}_${app.appName}`;
    const submoduleGroup = this.approvalForm.get(`submodules.${controlName}`);
    
    if (!submoduleGroup) return;

    const actionsData = submoduleGroup.get('actions')?.value;
    const now = new Date().toISOString();

    this.AVAILABLE_ACTIONS.forEach(actionKey => {
      const actionSettings = actionsData[actionKey];

      // Filter: Only proceed if the action is enabled AND has at least one stage
      const hasStages = actionSettings.stages && actionSettings.stages.length > 0;

      if (actionSettings.isEnabled && hasStages) {
        const payload = {
          id: actionSettings.id || 0,
          moduleId: module.id , 
          submoduleId: app.id ,
          actionKey: actionKey, 
          isActive: true,
          version: 1,
          createdAt: now,
          updatedAt: now,
          stages: actionSettings.stages.map((stage: any, index: number) => ({
            id: stage.id || 0,
            name: stage.name,
            orderIndex: index + 1,
            minApprovals: stage.minApprovals || 0,
            approvalType: stage.approvalType,
            allowSelfApproval: stage.allowSelfApproval || false,
            isDocumentRequired: stage.isDocumentRequired || false,
            canEditRecord: stage.canEditRecord || false,
            onReject: stage.rejectionPolicy || 'STOP',
            createdAt: now,
            updatedAt: now,
            assignment: stage.assignment.map((assign: any, aIndex: number) => ({
              id:  assign.id || 0,
              userId: assign.userId ? assign.userId : null,
              roleId: assign.roleId ? assign.roleId : null,
              position: aIndex + 1,
              createdAt: now,
              updatedAt: now
            }))
          }))
        };

        console.log(`Saving workflow for ${actionKey}...`, payload);
        
        this.workflowService.createWorkflow(payload).subscribe({
          next: (res) => {
            console.log(`${actionKey} saved successfully`)
            this.messageService.add({ severity: 'success', summary: 'Success', detail: 'SMTP Configuration saved successfully', key: 'tl'});

          },
          error: (err) => {
            console.error(`Error saving ${actionKey}`, err)
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save SMTP Configuration', key: 'tl'});
          }
        });
      } else if (actionSettings.isEnabled && !hasStages) {
        console.warn(`Action ${actionKey} is enabled but has no stages. Skipping save.`);
      }
    });
  }
}