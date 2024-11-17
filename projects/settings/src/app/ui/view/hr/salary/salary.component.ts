interface Allowances {
  transportationAllowance: number;
  mealAllowance: number;
  housingAllowance: number;
  healthAllowance?: number;
  carAllowance?: number;
  securityAllowance?: number;
  travelAllowance?: number;
}

interface Deductions {
  tax: number;
  healthInsurance?: number;
  retirementContribution?: number;
  pension: number
}

interface Bonuses {
  performanceBonus?: number;
  yearEndBonus?: number;
  internshipCompletionBonus?: number;
}

interface Overtime {
  hourlyRate: number;
  maxOvertimeHours: number;
}

interface SalaryStructure {
  level: string;
  baseSalary: number;
  allowances: Allowances;
  deductions: Deductions;
  bonuses: Bonuses;
  overtime: Overtime;
  netSalary: () => number;
}

import { Component } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';


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
  salaries: SalaryStructure[] = [
    {
      level: 'Intern',
      baseSalary: 20000,
      allowances: {
        transportationAllowance: 2000,
        mealAllowance: 1000,
        housingAllowance: 0,

      },
      deductions: {
        tax: 1000,
        pension: 0
      },
      bonuses: {
        internshipCompletionBonus: 5000,

      },
      overtime: {
        hourlyRate: 200,
        maxOvertimeHours: 10,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
        return grossSalary - this.deductions.tax;
      },
    },
    {
      level: 'Junior Staff',
      baseSalary: 35000,
      allowances: {
        housingAllowance: 3000,
        transportationAllowance: 2500,
        mealAllowance: 2000,
      },
      deductions: {
        tax: 2000,
        pension: 1500,
      },
      bonuses: {},
      overtime: {
        hourlyRate: 300,
        maxOvertimeHours: 15,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance;
        return grossSalary - (this.deductions.tax + this.deductions.pension);
      },
    },
    {
      level: 'Entry Level',
      baseSalary: 50000,
      allowances: {
        housingAllowance: 5000,
        transportationAllowance: 3000,
        mealAllowance: 2000,
      },
      deductions: {
        tax: 5000,
        pension: 3000,
      },
      bonuses: {
        performanceBonus: 3000,
      },
      overtime: {
        hourlyRate: 500,
        maxOvertimeHours: 20,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0);
        return grossSalary - (this.deductions.tax + this.deductions.pension);
      },
    },
    {
      level: 'Mid Level 1',
      baseSalary: 75000,
      allowances: {
        housingAllowance: 8000,
        transportationAllowance: 4000,
        mealAllowance: 3000,
      },
      deductions: {
        tax: 7000,
        pension: 3500,
      },
      bonuses: {
        performanceBonus: 5000,
      },
      overtime: {
        hourlyRate: 600,
        maxOvertimeHours: 18,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0);
        return grossSalary - (this.deductions.tax + this.deductions.pension);
      },
    },
    {
      level: 'Mid Level 2',
      baseSalary: 100000,
      allowances: {
        housingAllowance: 12000,
        transportationAllowance: 5000,
        mealAllowance: 3500,
      },
      deductions: {
        tax: 9000,
        pension: 5000,
      },
      bonuses: {
        performanceBonus: 8000,
      },
      overtime: {
        hourlyRate: 750,
        maxOvertimeHours: 15,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) ;
        return grossSalary - (this.deductions.tax + this.deductions.pension);
      },
    },
    {
      level: 'Senior Level 1',
      baseSalary: 150000,
      allowances: {
        housingAllowance: 15000,
        transportationAllowance: 7000,
        mealAllowance: 4000,
        healthAllowance: 5000,
      },
      deductions: {
        tax: 12000,
        pension: 6000,
      },
      bonuses: {
        performanceBonus: 10000,
      },
      overtime: {
        hourlyRate: 900,
        maxOvertimeHours: 12,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
        return grossSalary - (this.deductions.tax + this.deductions.pension );
      },
    },
    {
      level: 'Senior Level 2',
      baseSalary: 200000,
      allowances: {
        housingAllowance: 20000,
        transportationAllowance: 9000,
        mealAllowance: 5000,
        healthAllowance: 8000,
        carAllowance: 10000,
      },
      deductions: {
        tax: 15000,
        pension: 8000,
      },
      bonuses: {
        performanceBonus: 15000,
      },
      overtime: {
        hourlyRate: 1000,
        maxOvertimeHours: 10,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
        return grossSalary - (this.deductions.tax + this.deductions.pension );
      },
    },
    {
      level: 'Executive Level 1',
      baseSalary: 300000,
      allowances: {
        housingAllowance: 30000,
        transportationAllowance: 15000,
        mealAllowance: 10000,
        healthAllowance: 15000,
        carAllowance: 20000,
      },
      deductions: {
        tax: 30000,
        pension: 15000,
      },
      bonuses: {
        performanceBonus: 25000,
      },
      overtime: {
        hourlyRate: 1500,
        maxOvertimeHours: 8,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
        return grossSalary - (this.deductions.tax + this.deductions.pension );
      },
    },
    {
      level: 'Executive Level 2',
      baseSalary: 400000,
      allowances: {
        housingAllowance: 40000,
        transportationAllowance: 20000,
        mealAllowance: 15000,
        healthAllowance: 20000,
        carAllowance: 30000,
        securityAllowance: 15000,
      },
      deductions: {
        tax: 40000,
        pension: 20000,
      },
      bonuses: {
        performanceBonus: 35000,
        // signingBonus: 30000,
      },
      overtime: {
        hourlyRate: 2000,
        maxOvertimeHours: 6,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
        return grossSalary - (this.deductions.tax + this.deductions.pension );
      },
    },
    {
      level: 'C-Level',
      baseSalary: 500000,
      allowances: {
        housingAllowance: 50000,
        transportationAllowance: 30000,
        mealAllowance: 20000,
        healthAllowance: 30000,
        carAllowance: 40000,
        securityAllowance: 25000,
        travelAllowance: 20000,
      },
      deductions: {
        tax: 50000,
        pension: 30000,
      },
      bonuses: {
        performanceBonus: 50000,
        // signingBonus: 50000,
        // retentionBonus: 40000,
      },
      overtime: {
        hourlyRate: 3000,
        maxOvertimeHours: 4,
      },
      netSalary: function() {
        const grossSalary = this.baseSalary + this.allowances.housingAllowance + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.performanceBonus || 0) 
        return grossSalary - (this.deductions.tax + this.deductions.pension );
      },
    }
  ];
salaryStructure: SalaryStructure[] = []
  salaryForm: FormGroup;

  constructor(private fb: FormBuilder, private confirmationService: ConfirmationService,
    private messageService: MessageService  ) {
    this.salaryForm = this.fb.group({
      level: ['', Validators.required],
      baseSalary: ['', [Validators.required, Validators.min(0)]],
      allowances: this.fb.group({
        transportationAllowance: ['',  [Validators.min(0)]],
        mealAllowance: ['', [ Validators.min(0)]],
        housingAllowance: ['', [ Validators.min(0)]],
        customAllowances: this.fb.array([]) 
      }),
      deductions: this.fb.group({
        tax: ['', [ Validators.min(0)]],
        pension: ['', [ Validators.min(0)]],
        customDeductions: this.fb.array([]) 

      }),
      bonuses: this.fb.group({
        internshipCompletionBonus: ['', [ Validators.min(0)]],
        customBonuses: this.fb.array([]) 

      }),
      overtime: this.fb.group({
        hourlyRate: ['', [, Validators.min(0)]],
        maxOvertimeHours: ['', [ Validators.min(0)]]
      })
    });
  }
  ngOnInit() {
    const salariesFromStorage = localStorage.getItem("salaryStructure");
    
    if (salariesFromStorage) {

      const storedSalaries = JSON.parse(salariesFromStorage);
  

      this.salaryStructure = storedSalaries.map((salary: any) => ({
        ...salary,
        netSalary: function () {
          const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
          return grossSalary - (this.deductions.tax + (this.deductions.pension || 0));
        }
      }));
  
    }
  
  else {
    localStorage.setItem("salaryStructure", JSON.stringify(this.salaries))
    const salariesFromStorage = localStorage.getItem("salaryStructure");
    
    if (salariesFromStorage) {

      const storedSalaries = JSON.parse(salariesFromStorage);
  

      this.salaryStructure = storedSalaries.map((salary: any) => ({
        ...salary,
        netSalary: function () {
          const grossSalary = this.baseSalary + this.allowances.transportationAllowance + this.allowances.mealAllowance + (this.bonuses.internshipCompletionBonus || 0);
          return grossSalary - (this.deductions.tax + (this.deductions.pension || 0));
        }
      }));
  
    }
  }
  }
  
  get customAllowances(): FormArray {
    return this.salaryForm.get('allowances')?.get('customAllowances') as FormArray || this.fb.array([]);
  }

  get customDeductions(): FormArray {
    return this.salaryForm.get('deductions')?.get('customDeductions') as FormArray || this.fb.array([]);
  }

  get customBonuses(): FormArray {
    return this.salaryForm.get('bonuses.customBonuses') as FormArray || this.fb.array([]);
  }

  addCustomAllowance() {
 
    const allowanceGroup = this.fb.group({
      name: ['', Validators.required], 
      amount: ['', [Validators.required, Validators.min(0)]]
    });
    this.customAllowances.push(allowanceGroup);
  }

  removeCustomAllowance(index: number) {
    this.customAllowances.removeAt(index);
  }

  addCustomDeduction() {
    const deductionGroup = this.fb.group({
      name: ['', Validators.required], 
      amount: ['', [Validators.required, Validators.min(0)]]
    });
    this.customDeductions.push(deductionGroup);
  }

  removeCustomDeduction(index: number) {
    this.customDeductions.removeAt(index);
  } 
  
  addCustomBonus() {

    const bonusGroup = this.fb.group({
      name: ['', Validators.required], 
      amount: ['', [Validators.required, Validators.min(0)]]
    });
    
    this.customBonuses.push(bonusGroup);

  }

  removeCustomBonus(index: number) {
    this.customBonuses.removeAt(index);
  }

  onSubmit() {
    console.log('New Salary Structure:', this.salaryForm.value);

    if (this.salaryForm.valid) {
      const formValue = this.salaryForm.value;
  
      const mergedAllowances = {
        transportationAllowance: formValue.allowances.transportationAllowance,
      mealAllowance: formValue.allowances.mealAllowance,
      housingAllowance: formValue.allowances.housingAllowance,
        ...formValue.allowances.customAllowances.reduce((acc: { [x: string]: any; }, customAllowance: { name: string | number; amount: any; }) => {
          acc[customAllowance.name] = customAllowance.amount;
          return acc;
        }, {})
      };
  

      const mergedDeductions = {
        tax: formValue.deductions.tax,
      pension: formValue.deductions.pension,
        ...formValue.deductions.customDeductions.reduce((acc: { [x: string]: any; }, customDeduction: { name: string | number; amount: any; }) => {
          acc[customDeduction.name] = customDeduction.amount;
          return acc;
        }, {})
      };
  
   
      const mergedBonuses = {
        internshipCompletionBonus: formValue.bonuses.internshipCompletionBonus, 
        ...formValue.bonuses.customBonuses.reduce((acc: { [x: string]: any; }, customBonus: { name: string | number; amount: any; }) => {
          acc[customBonus.name] = customBonus.amount;
          return acc;
        }, {})
      };
  
      const newSalaryStructure = {
        level: formValue.level,
        baseSalary: formValue.baseSalary,
        allowances: mergedAllowances,
        deductions: mergedDeductions,
        bonuses: mergedBonuses,
        overtime: formValue.overtime,
        netSalary: function() {
          const grossSalary = this.baseSalary
            + this.allowances.transportationAllowance
            + this.allowances.mealAllowance
            + (this.bonuses.internshipCompletionBonus || 0);
          return grossSalary - this.deductions.tax;
        }
      };
  
      if (this.isEditMode && this.editIndex !== null) {
        this.salaryStructure[this.editIndex] = newSalaryStructure;
      } else {
        this.salaryStructure.push(newSalaryStructure);
      }

      localStorage.setItem('salaryStructure', JSON.stringify(this.salaryStructure));
      this.salaryForm.reset();
      this.showAddForm = false;
      this.isEditMode = false;
      this.editIndex = null;
  
      console.log('New Salary Structure:', newSalaryStructure);
    } else {
      console.error('Form is invalid');
    }
  }

  populateForm(salaryStructure: any, index: number) {
    this.isEditMode = true;
    this.editIndex = index;
    this.salaryForm.patchValue({
      level: salaryStructure.level,
      baseSalary: salaryStructure.baseSalary,
      allowances: {
        transportationAllowance: salaryStructure.allowances.transportationAllowance,
        mealAllowance: salaryStructure.allowances.mealAllowance,
        housingAllowance: salaryStructure.allowances.housingAllowance,
      },
      deductions: {
        tax: salaryStructure.deductions.tax,
        pension: salaryStructure.deductions.pension,
      },
      bonuses: {
        internshipCompletionBonus: salaryStructure.bonuses.internshipCompletionBonus,
      },
      overtime:  {
        hourlyRate: salaryStructure.overtime.hourlyRate,
        maxOvertimeHours: salaryStructure.overtime.maxOvertimeHours,
      },
    });

    this.customAllowances.clear(); 
    salaryStructure.allowances.customAllowances.forEach((allowance: any) => {
      this.customAllowances.push(this.createCustomAllowance(allowance));
    });

    this.customDeductions.clear();
    salaryStructure.deductions.customDeductions.forEach((deduction: any) => {
      this.customDeductions.push(this.createCustomDeduction(deduction));
    });

    this.customBonuses.clear(); 
    salaryStructure.bonuses.customBonuses.forEach((bonus: any) => {
      this.customBonuses.push(this.createCustomBonus(bonus));
    });

  }

  createCustomAllowance(allowance: any): FormGroup {
    return this.fb.group({
      name: [allowance.name || '', Validators.required],
      amount: [allowance.amount || 0, [Validators.required, Validators.min(0)]],
    });
  }

  createCustomDeduction(deduction: any): FormGroup {
    return this.fb.group({
      name: [deduction.name || '', Validators.required],
      amount: [deduction.amount || 0, [Validators.required, Validators.min(0)]],
    });
  }

  createCustomBonus(bonus: any): FormGroup {
    return this.fb.group({
      name: [bonus.name || '', Validators.required],
      amount: [bonus.amount || 0, [Validators.required, Validators.min(0)]],
    });
  }

  toTitleCaseWithSpace(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
  }
  
  editSalary(salary: SalaryStructure, index:number, event: Event) {
   
    event.stopPropagation();
    this.showAddForm = true
    this.editIndex = index
    this.populateForm(salary, index)
  }

  deleteSalary(salary: SalaryStructure, index:number, event: Event) {

    this.salaryStructure.splice(index, 1);
    localStorage.setItem('salaryStructure', JSON.stringify(this.salaryStructure));

  }
  getAllowanceKeys(allowances: object): string[] {
    return Object.keys(allowances);
  }

  getDeductionKeys(deductions: object): string[] {
    return Object.keys(deductions);
  }

  getBonusKeys(bonuses: object): string[] {
    return Object.keys(bonuses);
  }

  confirmSalaryDelete(salary: SalaryStructure, i: number , event: Event): void {
    event.stopPropagation();

    this.confirmationService.confirm({
      message: `Are You sure you want to carry out this action?  Clicking on DELETE, would lead to permanent removal of ${salary.level}'s salary structure`,
      header: `Delete Salary Structure - ${salary.level}`,
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
    if(this.isEditMode && this.showAddForm){
      this.salaryForm.reset();
    }
  }
}
