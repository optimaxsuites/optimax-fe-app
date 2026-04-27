import { Component } from '@angular/core';
interface Allowances {
  housingAllowance: number;
  transportationAllowance: number;
  mealAllowance: number;
  healthAllowance: number;
  carAllowance: number;
  securityAllowance: number;
  travelAllowance: number;
  [key: string]: number; 
}
@Component({
  selector: 'app-employee-payslips-list',
  templateUrl: './employee-payslips-list.component.html',
  styleUrl: './employee-payslips-list.component.scss'
})
export class EmployeePayslipsListComponent {
  viewSlip: boolean = false
  activeSlip: any = {}
filterPayroll() {
throw new Error('Method not implemented.');
}
searchTerm: any;
filterBySelectedYear() {
throw new Error('Method not implemented.');
}
year: any[] = ["2024"];
selectedYear: any;
filterBySelectedMonth() {
throw new Error('Method not implemented.');
}
  data: any = []
selectedEmployees: any;
monthNames = [
  "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
paySummary: any = {}
selectedMonth: any;
  constructor(){

  }

  ngOnInit(){
    const dataFromStorage = localStorage.getItem("sharedData")
    this.data =  dataFromStorage ? JSON.parse(dataFromStorage): null
    console.log(this.paySummary)
  }


  calculatePayrollSummary(detail: any) {
    const payrollSummary = {
      totalSalary: 0,
      totalBonuses: 0,
      totalDeductions: 0,
      totalAllowances: 0,
      totalNetPayable: 0,
      totalTax: 0, 
      totalInsurance: 0,
      totalPension: 0,
      totalGross: 0
    };
  console.log(detail)

   
        if (this.data.type === "salaried") {
            payrollSummary.totalSalary += detail.salary;
        } else if (this.data.type === "project-based") {
            payrollSummary.totalSalary += detail.totalProjectPay;
        }



      (detail?.bonuses || []).forEach((bonus: { amount: number; }) => {
        payrollSummary.totalBonuses += bonus.amount;
      });
  

      (detail?.deductions || []).forEach((deduction: { amount: number; reason: string }) => {
        payrollSummary.totalDeductions += deduction.amount;

        if (deduction.reason.toLocaleLowerCase().includes("tax")) {
            payrollSummary.totalTax += deduction.amount || 0;
          }
    
          if (deduction.reason.toLocaleLowerCase().includes("insurance") ) {
            payrollSummary.totalInsurance += deduction.amount || 0;
          }

          if (deduction.reason.toLocaleLowerCase().includes("pension") ) {
            payrollSummary.totalPension += deduction.amount || 0;
          }
      });
  

      for (let key in detail?.allowances) {
        payrollSummary.totalAllowances += detail?.allowances[key as keyof Allowances];
      }
  
     


      payrollSummary.totalNetPayable += detail?.netPayable;


    const totalGrossForEmployee = (payrollSummary?.totalSalary || 0)
    + payrollSummary.totalBonuses
    + payrollSummary.totalAllowances

  payrollSummary.totalGross += totalGrossForEmployee;
  
    return payrollSummary;
  }

  viewPayrollDetails(slip: any, op: any) {
    this.viewSlip = true
    op.hide();
    this.activeSlip = {
      empId:this.data.id,
      name: this.data.name,
      type: this.data.type,
      level: this.data.level,
      department: this.data.department,
      accountNumber: this.data.accountNumber,
      bank: this.data.bank,
      ...slip
    }
    }
}
