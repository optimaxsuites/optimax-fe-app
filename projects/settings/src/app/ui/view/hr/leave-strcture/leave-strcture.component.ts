
import { Component } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LevelService } from '../../../service/level.service';
import { SalaryService } from '../../../service/salary.service';
import { AllowanceDTO, AllowanceTypeDTO, BonusTypeDTO, DeductionsTypeDTO, OvertimeTypeDTO, SalaryDTO } from '../../../domain/salary.dto';
import { LevelDTO } from '../../../domain/level.dto';
import { LeaveService } from '../../../service/leave.service';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
  selector: 'app-leave-strcture',
  templateUrl: './leave-strcture.component.html',
  styleUrl: './leave-strcture.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class LeaveStrctureComponent {
  showAddForm: boolean = false 
  
  isEditMode = false; 
  leaveForm!: FormGroup
  editIndex: number | null = null

  leaveStructure: any[] = []

  newTypeForm: FormGroup;
  
  levels: LevelDTO[] = []

  overtimeType: OvertimeTypeDTO[] = []
  availableOverTimeTypes: OvertimeTypeDTO[] = []
  openTypeForm:boolean = false
  typeForm:string = ""
  selectedLeaves: {
    name: number,
    amount: number,
    id: number
  }[] = []
  selectedLeaveTypeIds: number[] = []

  totalLeaveDays: number = 0;
  errorMessage: string = "";
  isAmountTouched: boolean = false
  leaves: any[] = []
  levelInView: number | undefined;

  leaveDataByLevel: { [key: number]: any } = {};
  constructor(private fb: FormBuilder, private confirmationService: ConfirmationService, private salaryService: SalaryService, private levelService: LevelService, private leaveService: LeaveService, 
    private messageService: MessageService  ) {
   

    this.leaveForm = this.fb.group({
      // leaveDays: [null, Validators.required],
      leaveType: [null, [Validators.pattern("^[0-9]*$"), Validators.min(1)]],
      leaveAmount: [null, [Validators.pattern("^[0-9]*$"), Validators.min(1)]],
    
    });

    this.newTypeForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      code: [''],
      isTax: [false, []]
    });
  }
  async ngOnInit() {
    
    this.levelService.getAllLevels().subscribe(data => {
      this.levels = data;
      this.loadLeaveData();
    });

    this.leaveService.getAllLeave().subscribe({
      next: data => {
        this.leaveStructure = Array.isArray(data) ? data : [];
        this.mapLeaveByLevel(this.leaveStructure);
      },
      error: (error) => console.error('Error fetching leaves', error)
    })
   

    this.leaveService.getAllLeaveType().subscribe({
      next: (data) => this.leaves = data,
      error: (error) => console.error('Error fetching leaves type', error)
    })

     this.loadLeaveData()
   
    
  }
 
  
  loadLeaveData(): void {
    // TODO: replace with getLeaveByLevel when endpoint is available.
    this.levels.forEach((level) => {
      this.leaveService.getLeaveByLevel(level.id).subscribe({
        next: (data) => {
          this.leaveDataByLevel[level.id ? level.id : 0] = Array.isArray(data) ? data : [];
        },
        error: (err) => {
          console.error(`Error fetching leave data for level ID ${level.id}:`, err);
          this.leaveDataByLevel[level.id ? level.id : 0] = [];
        },
      });
    });

    // this.leaveService.getAllLeave().subscribe({
    //   next: (data) => {
    //     this.leaveStructure = Array.isArray(data) ? data : [];
    //     this.mapLeaveByLevel(this.leaveStructure);
    //   },
    //   error: (err) => {
    //     console.error('Error fetching leaves', err);
    //     this.leaveDataByLevel = {};
    //     this.levels.forEach((level) => {
    //       if (level.id !== undefined) {
    //         this.leaveDataByLevel[level.id] = [];
    
    //       }
    //     });
    //   },
    // });
  }

  private mapLeaveByLevel(leaves: any[]): void {
    const map: { [key: number]: any[] } = {};
    this.levels.forEach((level) => {
      if (level.id !== undefined) {
        map[level.id] = [];
      }
    });

    leaves.forEach((leave) => {
      const levelId = leave?.levelId ?? leave?.level?.id;
      if (levelId === undefined || levelId === null) return;
      if (!map[levelId]) {
        map[levelId] = [];
      }
      map[levelId].push(leave);
    });

    this.leaveDataByLevel = map;
  }



  onSubmit() {
    if (!this.levelInView || this.selectedLeaves.length === 0) {
      return;
    }

    const requests = this.selectedLeaves.map((leave) => {
      const payload = {
        leaveTypeId: leave.name,
        allocatedDays: leave.amount,
        levelId: this.levelInView,
      };
      const request = leave.id
        ? this.leaveService.updateLeaveAllocation(leave.id, payload)
        : this.leaveService.addLeaveAllocation(payload);
      return request.pipe(catchError((error) => of({ error })));
    });

    forkJoin(requests).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: this.isEditMode ? 'Updated successfully!' : 'Added Successfully',
          key: 'tl',
          life: 3000,
        });
        this.showAddForm = false;
        this.loadLeaveData();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Unable to save leave allocations',
          key: 'tl',
          life: 3000,
        });
      },
    });
  }

  syncSelectedLeaves(ids: number[]) {
    const nextIds = new Set(ids || []);
    const existingByType = new Map<number, { name: number; amount: number; id: number }>();
    this.selectedLeaves.forEach((leave) => existingByType.set(leave.name, leave));

    const removed = this.selectedLeaves.filter((leave) => !nextIds.has(leave.name));
    removed.forEach((leave) => {
      if (leave.id) {
        this.leaveService.deleteLeavesByLevel(leave.id).subscribe({
          next: () => {
            this.loadLeaveData();
          },
          error: (err) => console.error(`Failed to delete leave with ID ${leave.id}:`, err),
        });
      }
    });

    this.selectedLeaves = Array.from(nextIds).map((id) => {
      const existing = existingByType.get(id);
      return existing ?? { name: id, amount: 0, id: 0 };
    });

    this.selectedLeaveTypeIds = Array.from(nextIds);
    this.calculateTotalLeaveDays();
  }

  populateForm(leaveStructure: any, index: number) {
    this.isEditMode = true;
    // this.editIndex = salaryStructure.id;
    const structuredLeave = leaveStructure.map((leave: { leaveTypeId: any; allocatedDays: any; id: number }) => {
     return { 
      name: leave.leaveTypeId,
      amount: leave.allocatedDays,
      id: leave.id
      }
    })
    this.selectedLeaves = structuredLeave
    this.selectedLeaveTypeIds = structuredLeave.map((leave: { name: number }) => leave.name)
    this.calculateTotalLeaveDays()

  }

  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editLevelLeave(levelId: number | undefined, index:number, event: Event) {
   
    event.stopPropagation();
    const leave = this.getLeaveByLevelId(levelId)
    this.showAddForm = true
    this.editIndex = index
    this.levelInView = levelId
    this.populateForm(leave, index)
  }

  deleteSalary(leave: any[], index: number | undefined, event: Event) {
    leave.forEach((l: { id: number | undefined }, i: number) => {
      const isLast = i === leave.length - 1;
      this.leaveService.deleteLeavesByLevel(l.id).subscribe({
        next: () => {
          if (isLast) {
          this.loadLeaveData();
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Level allocated for ${this.getLevelName(index)} cleared successfully!`, key: 'tl', life: 3000  }); 

          }
        },
        error: (err) => {
          console.error(`Failed to delete leave with ID ${l.id}:`, err);
          if (isLast) {
            this.loadLeaveData(); 
          }
        },
      });
    });
  }
  

  confrimLevelDelete(levelId: number | undefined, i: number , event: Event): void {
    event.stopPropagation();
    const leave = this.getLeaveByLevelId(levelId)
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to clearing of all leave's allocated to ${this.getLevelName(levelId)}`,
      header: `Delete Leave Structure - ${this.getLevelName(levelId)}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancel p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        
        this.deleteSalary(leave, levelId , event);
      },
      reject: () => {

      }
    });
  }

  toogleForm() {
    
    this.showAddForm = !this.showAddForm
    if(this.showAddForm){
      this.isEditMode = false
    this.selectedLeaves = []
    this.selectedLeaveTypeIds = []
    }
  }
  getLeaveByLevelId(levelId: number | undefined): any[] {
    if (levelId === undefined) {
      return [];
    }
    return this.leaveDataByLevel[levelId] || [];
  }
  

  getLevelName(levelId: number | undefined): string {
    const level = this.levels.find((lvl) => lvl.id === levelId);
    return level ? level.name : '';
  }

  createNewStructure(levelId: number | undefined ){
    this.toogleForm()
    this.levelInView = levelId
    this.selectedLeaves = []
    this.selectedLeaveTypeIds = []
    this.totalLeaveDays = 0
    this.leaveForm.reset()
    // this.salaryForm.patchValue({
    //   level: levelId
    // })
  }


  getErrorMessage(control: AbstractControl | null, controlName: string): string {
    // const control = this.basicForm.get(controlName);
    if (control?.hasError('required')) {
      return `${this.toTitleCaseWithSpace(controlName)} is required.`;
    }
  
    if (control?.hasError('email')) {
      return 'Enter a valid email address.';
    }
  
    if (control?.hasError('minlength')) {
      const requiredLength = control.getError('minlength').requiredLength;
      return `${this.toTitleCaseWithSpace(controlName)} must be at least ${requiredLength} characters long.`;
    }
  
    if (control?.hasError('maxlength')) {
      const maxLength = control.getError('maxlength').requiredLength;
      return `${this.toTitleCaseWithSpace(controlName)} cannot be more than ${maxLength} characters long.`;
    }
  
    if (control?.hasError('invalidFileType')) {
      return `${this.toTitleCaseWithSpace(controlName)} must be a valid image file (PNG, JPG, JPEG).`;
    }
  
    return '';
  }


  calculateTotalLeaveDays(): void {
    this.totalLeaveDays = Object.values(this.selectedLeaves).reduce((sum: number, leave) => sum + Number(leave.amount || 0), 0);
  }

  hasInvalidLeaveAllocations(): boolean {
    return this.selectedLeaves.some((leave) => !leave.amount || leave.amount < 1);
  }

 

  getLeaveNameWithId(id: number){
    const leave = this.leaves.find((item) => item.id === id);
    return leave ? leave.name : 'Unknown';
  }

  getLeaveAmountErrorMessage(): string {
    const control = this.leaveForm.get('leaveAmount');
  
   
    if (control?.value <= 0 && typeof control?.value === 'number') {
      return 'Value must be at least 1.';
    }
  
    if (!isNaN(control?.value)) {
      return 'Please enter a positive number.';
    }
  
    return '';
  }

  removeLeave(leave: { name: number; id: number }) {
    if (leave.id) {
      this.leaveService.deleteLeavesByLevel(leave.id).subscribe({
        next: () => {
          this.selectedLeaves = this.selectedLeaves.filter((item) => item.name !== leave.name);
          this.selectedLeaveTypeIds = this.selectedLeaveTypeIds.filter((id) => id !== leave.name);
          this.calculateTotalLeaveDays();
          this.loadLeaveData();
        },
        error: (err) => {
          console.error(`Failed to delete leave with ID ${leave.id}:`, err);
        },
      });
      return;
    }

    this.selectedLeaves = this.selectedLeaves.filter((item) => item.name !== leave.name);
    this.selectedLeaveTypeIds = this.selectedLeaveTypeIds.filter((id) => id !== leave.name);
    this.calculateTotalLeaveDays();
  }
  
}
