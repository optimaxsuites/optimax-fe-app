import { Component } from '@angular/core';
import { DataService } from '../../../service/data.service';
import { TableAction, TableColumn } from '../../../shared-component/view/table/table.component';
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
  selector: 'app-employee-payslip-list',
  templateUrl: './employee-payslip-list.component.html',
  styleUrl: './employee-payslip-list.component.scss'
})
export class EmployeePayslipListComponent {
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
  payslipColumns: TableColumn[] = [
    {
      header: 'Period',
      sortable: true,
      sortField: 'month',
      className: 'table-item',
      formatter: (row) => `${this.monthNames[(row?.month || 1) - 1]} ${row?.year ?? ''}`.trim()
    },
    {
      header: 'Total Allowance',
      className: 'table-item',
      formatter: (row) => `₦${this.calculatePayrollSummary(row).totalAllowances.toFixed(2)}`
    },
    {
      header: 'Total Bonuses',
      className: 'table-item',
      formatter: (row) => `₦${this.calculatePayrollSummary(row).totalBonuses.toFixed(2)}`
    },
    {
      header: 'Total Deductions',
      className: 'table-item',
      formatter: (row) => `₦${this.calculatePayrollSummary(row).totalDeductions.toFixed(2)}`
    },
    {
      header: 'Gross Pay',
      className: 'table-item',
      formatter: (row) => `₦${this.calculatePayrollSummary(row).totalGross.toFixed(2)}`
    },
    {
      header: 'Net Pay',
      className: 'table-item',
      formatter: (row) => `₦${this.calculatePayrollSummary(row).totalNetPayable.toFixed(2)}`
    }
  ];
  payslipActions: TableAction[] = [
    { id: 'view', label: 'View', icon: 'pi pi-eye' }
  ];
  constructor(private dataService: DataService){

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

  viewPayrollDetails(slip: any, op?: any) {
    this.viewSlip = true
    op?.hide?.();
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

  handlePayslipAction(event: { actionId: string; row: any }) {
    if (event.actionId === 'view') {
      this.viewPayrollDetails(event.row);
    }
  }
}
