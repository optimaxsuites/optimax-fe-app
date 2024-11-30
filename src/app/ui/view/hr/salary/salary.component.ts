
import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { LevelService } from '../../../service/level.service';
import { SalaryService } from '../../../service/salary.service';
import { AllowanceDTO, AllowanceTypeDTO, BonusTypeDTO, DeductionsTypeDTO, OvertimeTypeDTO, SalaryDTO } from '../../../domain/salary.dto';
import { LevelDTO } from '../../../domain/level.dto';


@Component({
  selector: 'app-salary',
  templateUrl: './salary.component.html',
  styleUrl: './salary.component.scss',
  providers: [MessageService, ConfirmationService],
})
export class SalaryComponent {
  showAddForm: boolean = false 
  isEditMode = false; 
  editIndex: number | null = null

salaryStructure: any[] = []
  salaryForm: FormGroup;
  newTypeForm: FormGroup;
  allowanceForm: FormGroup;
  bonusForm: FormGroup;
  deductionForm: FormGroup;
  overtimeForm: FormGroup;
  levels: LevelDTO[] = []
  allowanceType: AllowanceTypeDTO[] = []
  availableAllowanceTypes: AllowanceTypeDTO[] = [];
  deductionType: DeductionsTypeDTO[] = []
  availableDeductionTypes: DeductionsTypeDTO[] = [];
  bonusType: BonusTypeDTO[] = []
  availableBonusesTypes: BonusTypeDTO[] = [];
  isAllowanceTouched = false;
  isDeductionTouched = false;
  isBonusTouched = false;
  isOverTimeTouched = false
  overtimeType: OvertimeTypeDTO[] = []
  availableOverTimeTypes: OvertimeTypeDTO[] = []
  openTypeForm:boolean = false
  typeForm:string = ""
 allowances: {
  id: number;
  allowanceTypeId: number,
  amount: number
 }[] = []
 deductions: {
  id: number;
  deductionsTypeId: number,
  amount: number
 }[] = []
 bonuses: {
  id: number;
  bonusTypeId: number,
  amount: number
 }[] = []
 overtImes: {
  id: number;
  overtimeTypeId: number,
  rate: number,
  maxHours: number
 }[] =[]

  constructor(private fb: FormBuilder, private confirmationService: ConfirmationService, private salaryService: SalaryService, private levelService: LevelService, 
    private messageService: MessageService  ) {
    this.salaryForm = this.fb.group({
      level: [null, Validators.required],
      baseSalary: ['', [Validators.required, Validators.min(0)]],
    });

    this.allowanceForm =this.fb.group({
      type: [0, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]]
    }),
    this.deductionForm = this.fb.group({
      type: [0, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]]
    }),
    this.bonusForm = this.fb.group({
      type: [0, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]] 
    }),
    this.overtimeForm = this.fb.group({
      type: [0, Validators.required],
      amount: [0, [Validators.required, Validators.min(1)]],
      maxHour: [0, [Validators.required, Validators.min(1)]]
    })

    this.newTypeForm = this.fb.group({
      name: ['', [Validators.required]],
      description: [''],
      code: [''],
      isTax: [false, []]
    });
  }
  ngOnInit() {
    const salariesFromStorage = localStorage.getItem("salaryStructure");
    this.levelService.getAllLevels().subscribe(data => {
      this.levels = data
    })

    this.salaryService.getAllSalaries().subscribe(data => {
      this.salaryStructure = data.map((salary: any) => ({
       ...salary,
        // netSalary: function () {
        //   const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
        //   return grossSalary - (this.deductions.tax + (this.deductions.pension || 0));
        // }
      }));
    })
    this.salaryService.getAllAllowanceTypes().subscribe(data => {
      this.allowanceType = data.sort((a: { name: string; }, b: { name: any; }) => a.name.localeCompare(b.name))
      this.availableAllowanceTypes = [...this.allowanceType];
    })
    this.salaryService.getAllDeductionsTypes().subscribe(data => {
      this.deductionType = data.sort((a: { name: string; }, b: { name: any; }) => a.name.localeCompare(b.name))
      this.availableDeductionTypes = [...this.deductionType]
    })
    this.salaryService.getAllBonusTypes().subscribe(data => {
      this.bonusType = data.sort((a: { name: string; }, b: { name: any; }) => a.name.localeCompare(b.name))
      this.availableBonusesTypes = [...this.bonusType]
    })
    this.salaryService.getAllOverTimeTypes().subscribe(data => {
      this.overtimeType = data.sort((a: { name: string; }, b: { name: any; }) => a.name.localeCompare(b.name))
      this.availableOverTimeTypes = [...this.overtimeType]
    })
    
  }
  addAllowanceToTotal(event?: Event) {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const allowanceGroup = this.allowanceForm

    // Check if the allowances form is valid
    if (allowanceGroup.valid) {
      const formValue = allowanceGroup.value;

   

      const newAllowance = {
        amount: formValue.amount,
        allowanceTypeId: formValue.type
      }
      this.salaryService.addAllowance(newAllowance).subscribe((data) => {
        this.allowances.push(data);
      })
      const selectedTypes = this.allowances.map(a => this.getAllowanceName(a.allowanceTypeId));
      this.availableAllowanceTypes = this.availableAllowanceTypes.filter(
        option => !selectedTypes.includes(option.name)
      );
      allowanceGroup.reset();
      this.isAllowanceTouched = false; 
    } else {
      allowanceGroup.markAllAsTouched();
      this.isAllowanceTouched = true; 
    }

  }

  removeAllowance(index:number, id: number){
    this.salaryService.deleteAllowance(id).subscribe(() => {
      this.allowances.splice(index, 1)

    })

  }

  addBonusToTotal(event? : Event) {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const bonusGroup = this.bonusForm

    // Check if the allowances form is valid
    if (bonusGroup.valid) {
      const formValue = bonusGroup.value;

      const newBonus = {
        bonusTypeId: formValue.type,
        amount: formValue.amount,
      };

      this.salaryService.addBonus(newBonus).subscribe((data) => {
        this.bonuses.push(data)
      })
      const selectedTypes = this.bonuses.map(a => this.getBonusName(a.bonusTypeId));
      this.availableBonusesTypes = this.availableBonusesTypes.filter(
        option => !selectedTypes.includes(option.name)
      );
      bonusGroup.reset();
      this.isBonusTouched = false
    } else {
      bonusGroup.markAllAsTouched();
      this.isBonusTouched = true

    }

  }

  removeBonus(index:number, id: number){
    this.salaryService.deleteBonus(id).subscribe(() =>{
    this.bonuses.splice(index, 1)

    })
  }

  addDeductionToTotal(event?: Event) {
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const deductionGroup = this.deductionForm

    // Check if the allowances form is valid
    if (deductionGroup.valid) {
      const formValue = deductionGroup.value;

      const newDeduction ={
        deductionsTypeId: formValue.type,
        amount: formValue.amount,
      };

      this.salaryService.addDeductions(newDeduction).subscribe(data => {
        this.deductions.push(data)
      })
      const selectedTypes = this.deductions.map(a => this.getDeductionName(a.deductionsTypeId));
      this.availableDeductionTypes = this.availableDeductionTypes.filter(
        option => !selectedTypes.includes(option.name)
      );
      deductionGroup.reset();
      this.isDeductionTouched = false;
    } else {
      deductionGroup.markAllAsTouched();
      this.isDeductionTouched = true;

    }

  }

  addOverTimeToTotal(event?: Event){
    const keyboardEvent = event as KeyboardEvent;
    keyboardEvent.preventDefault();
    const overtimeGroup = this.overtimeForm

    // Check if the allowances form is valid
    if (overtimeGroup.valid) {
      const formValue = overtimeGroup.value;

     const newOvertime ={
        overtimeTypeId: formValue.type,
        rate: formValue.amount,
        maxHours: formValue.maxHour
      }

      this.salaryService.addOverTime(newOvertime).subscribe(data => {
        this.overtImes.push(data)
      })
      const selectedTypes = this.overtImes.map(a => this.getOvertimeName(a.overtimeTypeId));
      this.availableOverTimeTypes = this.availableOverTimeTypes.filter(
        option => !selectedTypes.includes(option.name)
      );
      overtimeGroup.reset();
      this.isOverTimeTouched = false;
    } else {
      overtimeGroup.markAllAsTouched();
      this.isOverTimeTouched = true;
    }
  }

  removeOvertime(index:number, id: number){
    this.salaryService.deleteOvertime(id).subscribe(() => {
      this.overtImes.splice(index, 1)

    })
  }

  removeDeduction(index:number, id: number){
    this.salaryService.deleteDeduction(id).subscribe(() => {
      this.deductions.splice(index, 1)
    })
  }
  getAllowanceName(id: number): string {
    const allowance = this.allowanceType.find((item) => item.id === id);
    return allowance ? allowance.name : 'Unknown';
  }

  getBonusName(id: number): string {
    const allowance = this.bonusType.find((item) => item.id === id);
    return allowance ? allowance.name : 'Unknown';
  }

  getDeductionName(id: number): string {
    const deduction = this.deductionType.find((item) => item.id === id);
    
    return deduction ? deduction.name : 'Unknown';
  }

  getOvertimeName(id: number): string {
    const deduction = this.overtimeType.find((item) => item.id === id);
    return deduction ? deduction.name : 'Unknown';
  }

  openNewTypeForm(type: string){
    this.typeForm = type
    this.openTypeForm = !this.openTypeForm
    this.newTypeForm.reset()
  }

  addNewType(type: string, event: Event){
    event.preventDefault()
    
    const formValue = this.newTypeForm.value;
    
    if(type === 'allowance'){
      const newType = {
        name: formValue.name,
        code: formValue.code,
        description: formValue.description,
      }

      this.salaryService.addAllowanceType(newType).subscribe((data) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `New allowance type added successfully!`, key: 'tl', life: 3000  }); 
        this.allowanceType.push(data)
        this.availableAllowanceTypes.push(data)
        this.openNewTypeForm('')
      })
    } else if(type === 'deduction'){
      const newType = {
        name: formValue.name,
        description: formValue.description,
        isTax: formValue.isTax,
      }

      this.salaryService.addDeductionsType(newType).subscribe((data) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `New deduction type added successfully!`, key: 'tl', life: 3000  }); 
        this.deductionType.push(data)
        this.availableDeductionTypes.push(data)
        this.openNewTypeForm('')
      })
    }
    else if(type === 'bonus'){
      const newType = {
        name: formValue.name,
        description: formValue.description,
      }

      this.salaryService.addBonusType(newType).subscribe((data) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `New bonus type added successfully!`, key: 'tl', life: 3000  }); 

        this.bonusType.push(data)
        this.availableBonusesTypes.push(data)
        this.openNewTypeForm('')
      })
    }
    else if(type === 'overtime'){
      const newType = {
        name: formValue.name,
        description: formValue.description,
      }

      this.salaryService.addOverTimeType(newType).subscribe((data) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `New overtime type added successfully!`, key: 'tl', life: 3000  }); 

        this.overtimeType.push(data)
        this.availableOverTimeTypes.push(data)
        this.openNewTypeForm('')
      })
    }
  }

  onSubmit() {
    console.log('New Salary Structure:', this.salaryForm.value);

    if (this.salaryForm.valid) {
      const formValue = this.salaryForm.value;
  
  
      const newSalaryStructure = {
        levelId: formValue.level,
        baseSalary: formValue.baseSalary,
        allowance: this.allowances,
        deductions: this.deductions,
        bonus: this.bonuses,
        // overtime: this.overtImes
      };
  
      if (this.isEditMode && this.editIndex !== null) {
        this.salaryService.addSalary({
          id: this.editIndex,
          ...newSalaryStructure
        }).subscribe((data) => {
          this.messageService.add({ severity: 'success', summary: 'Success', detail: `Salary structure for ${this.getSalaryByLevelId(data.levelId)} updated successfully!`, key: 'tl', life: 3000  }); 
          this.toogleForm()
          // this.salaryStructure[this.editIndex] = newSalaryStructure;
        })
      } else {
        this.salaryService.addSalary(newSalaryStructure).subscribe((data) => {
        this.messageService.add({ severity: 'success', summary: 'Success', detail: `Salary structure for ${this.getSalaryByLevelId(data.levelId)} added successfully!`, key: 'tl', life: 3000  }); 
        this.isEditMode = false
        this.salaryForm.reset();
        this.allowances = []
        this.bonuses= []
        this.deductions = []
        this.overtImes = []

          this.salaryStructure.push(data);
        })
      }
  
      console.log('New Salary Structure:', newSalaryStructure);
    } else {
      console.error('Form is invalid');
    }
  }

  populateForm(salaryStructure: any, index: number) {
    this.isEditMode = true;
    this.editIndex = salaryStructure.id;
    this.salaryForm.patchValue({
      level: salaryStructure.levelId,
      baseSalary: salaryStructure.baseSalary,
     
    });
    this.allowances = salaryStructure.allowance
    this.deductions = salaryStructure.deductions
    this.bonuses = salaryStructure.bonus
  }

  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editSalary(levelId: number|undefined, index:number, event: Event) {
   
    event.stopPropagation();
    const salary = this.getSalaryByLevelId(levelId)
    this.showAddForm = true
    this.editIndex = index
    this.populateForm(salary, index)
  }

  deleteSalary(salary: SalaryDTO, index:number, event: Event) {
    this.salaryService.deleteSalry(salary.id).subscribe(() => {
      // this.salaryStructure.splice(index, 1);
      const salaryIndex = this.salaryStructure.findIndex(s => s.id === salary.id);
      if (salaryIndex > -1) {
        this.salaryStructure.splice(salaryIndex, 1);
      }
      this.messageService.add({ severity: 'success', summary: 'Success', detail: `Salary structure for ${this.getSalaryByLevelId(salary.levelId)} cleared successfully!`, key: 'tl', life: 3000  }); 
    })

  }

  confirmSalaryDelete(levelId: number|undefined, i: number , event: Event): void {
    event.stopPropagation();
    const salary = this.getSalaryByLevelId(levelId)
    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to clearing of ${this.getLevelName(salary.levelId)}'s salary structure`,
      header: `Delete Salary Structure - ${this.getLevelName(salary.levelId)}`,
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass:"p-btn-danger p-button-text",
      rejectButtonStyleClass:"p-btn-cancle p-button-text",
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
      this.salaryForm.reset();
      this.allowances = []
      this.bonuses= []
      this.deductions = []
      this.overtImes = []
    }
  }

  getSalaryByLevelId(levelId: number | undefined): any {
    return this.salaryStructure.find((salary) => salary.levelId === levelId);
  }

  getLevelName(levelId: number): string {
    const level = this.levels.find((lvl) => lvl.id === levelId);
    return level ? level.name : '';
  }

  createNewStructure(levelId: number | undefined ){
    this.toogleForm()
    this.salaryForm.patchValue({
      level: levelId
    })
  }
}
