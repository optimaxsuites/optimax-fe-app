
import { Component } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LevelService } from '../../../service/level.service';
import { SalaryService } from '../../../service/salary.service';
import { AllowanceDTO, AllowanceTypeDTO, BonusTypeDTO, DeductionsTypeDTO, OvertimeTypeDTO, SalaryDTO } from '../../../domain/salary.dto';
import { LevelDTO } from '../../../domain/level.dto';
import { LeaveService } from '../../../service/leave.service';

@Component({
  selector: 'app-leave-strcture',
  templateUrl: './leave-strcture.component.html',
  styleUrl: './leave-strcture.component.scss',
  providers: [MessageService, ConfirmationService, LevelService, SalaryService],
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
    amount: number
  }[] = []

  totalLeaveDays: number = 0;
  errorMessage: string = "";
  isAmountTouched: boolean = false
  leaves: any[] = []
  levelInView: number | undefined;


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
  ngOnInit() {
    
    this.levelService.getAllLevels().subscribe(data => {
      this.levels = data
    })

    this.leaveService.getAllLeave().subscribe( {
      next: data =>  this.leaveStructure = data,
      error: (error) => console.error('Error fetching leaves', error)
    })
   

    this.leaveService.getAllLeaveType().subscribe({
      next: (data) => this.leaves = data,
      error: (error) => console.error('Error fetching leaves type', error)
    })

    
  }
 
  

  onSubmit() {
    if(this.selectedLeaves.length > 0){
      this.selectedLeaves.map(leave => {
        const data = {
          leaveTypeId: leave.name,
          allocatedDays: leave.amount,
          levelId: this.levelInView,
        }
        this.leaveService.addLeaveAllocation(data).subscribe({
          next: (data) => {
            console.log(data)
          },
          error: (error) => this.errorMessage = error
        })
      })
    }
  }

  populateForm(salaryStructure: any, index: number) {
    this.isEditMode = true;
    this.editIndex = salaryStructure.id;
    
  }

  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editSalary(levelId: number|undefined, index:number, event: Event) {
   
    event.stopPropagation();
    const salary = this.getLeaveByLevelId(levelId)
    this.showAddForm = true
    this.editIndex = index
    this.populateForm(salary, index)
  }

  deleteSalary(salary: SalaryDTO, index:number, event: Event) {
    this.salaryService.deleteSalry(salary.id).subscribe(() => {
      // this.salaryStructure.splice(index, 1);
      const salaryIndex = this.leaveStructure.findIndex(s => s.id === salary.id);
      if (salaryIndex > -1) {
        this.leaveStructure.splice(salaryIndex, 1);
      }
      this.messageService.add({ severity: 'success', summary: 'Success', detail: `Salary structure for ${this.getLeaveByLevelId(salary.levelId)} cleared successfully!`, key: 'tl', life: 3000  }); 
    })

  }

  confirmSalaryDelete(levelId: number|undefined, i: number , event: Event): void {
    event.stopPropagation();
    const salary = this.getLeaveByLevelId(levelId)
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to clearing of ${this.getLevelName(salary.levelId)}'s salary structure`,
      header: `Delete Salary Structure - ${this.getLevelName(salary.levelId)}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancel p-button-text",
      acceptIcon:"none",
      rejectIcon:"none",
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      // styleClass: 'custom-confirm-dialog',
      accept: () => {
        this.deleteSalary(salary, i , event);
      },
      reject: () => {

      }
    });
  }

  toogleForm() {
    
    this.showAddForm = !this.showAddForm
    if(this.showAddForm){
      this.isEditMode = false
    this.leaveStructure = []
    }
  }

  getLeaveByLevelId(levelId: number | undefined): any {
    return this.leaveStructure.find((leave) => leave.levelId === levelId);
  }

  getLevelName(levelId: number): string {
    const level = this.levels.find((lvl) => lvl.id === levelId);
    return level ? level.name : '';
  }

  createNewStructure(levelId: number | undefined ){
    this.toogleForm()
    this.levelInView = levelId
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

  addLeave(){
    this.isAmountTouched = true
    const leaveType = this.leaveForm.value.leaveType;
    const leaveAmount = this.leaveForm.value.leaveAmount;
    if(  this.leaveForm.valid && 
      typeof leaveAmount === 'number' && 
      !isNaN(leaveAmount)){
      this.selectedLeaves.push({
        name: leaveType,
        amount: leaveAmount
      })
      this.calculateTotalLeaveDays()
      this.isAmountTouched =false
      this.leaveForm.reset()
    }else {
      this.isAmountTouched= true
      this.errorMessage = this.getLeaveAmountErrorMessage()
    }

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

  removeLeave(id: number){
    const leaveIndex = this.selectedLeaves.findIndex(s => s.name === id);
    this.selectedLeaves.splice(leaveIndex, 1)
    this.calculateTotalLeaveDays()
  }
  
}
