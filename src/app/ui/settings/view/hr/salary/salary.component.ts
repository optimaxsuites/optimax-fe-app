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


@Component({
  selector: 'app-salary',
  templateUrl: './salary.component.html',
  styleUrl: './salary.component.scss'
})
export class SalaryComponent {
  salaryStructure: SalaryStructure[] = [
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
  editSalary(salary: SalaryStructure) {
    console.log('Edit clicked for:', salary);
  }

  // Placeholder for the delete action
  deleteSalary(salary: SalaryStructure) {
    console.log('Delete clicked for:', salary);
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
}
