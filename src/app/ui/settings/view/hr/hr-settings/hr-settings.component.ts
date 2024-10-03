import { Component } from '@angular/core';
import { SalaryComponent } from '../salary/salary.component';

@Component({
  selector: 'app-hr-settings',
  templateUrl: './hr-settings.component.html',
  styleUrl: './hr-settings.component.scss',
 
})
export class HrSettingsComponent {
  sidebar: boolean = false

  settings = [{name: "Salary", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt', component: SalaryComponent  }, {name: "Employee management", subSetting: ["Salary Structure", "Deductions and Overtime"],  icon: 'pi pi-receipt', component: null},
  {name: "Attendance", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt',component: null }, {name: "Leave", subSetting: ["Salary Structure", "Deductions and Overtime"],  icon: 'pi pi-receipt', component: null},{name: "Recruitment", subSetting: ["Salary Structure", "Payslip"],  icon: 'pi pi-receipt',component: null }, {name: "Employee management", subSetting: ["Salary Structure", "Deductions and Overtime"],  icon: 'pi pi-receipt', component: null},{name: "Salary", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt', component: null}, {name: "Salary", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt', component: null} ]

selectedComp = null
openSideBar = (setting: any) => {
  this.sidebar = true
  this.selectedComp = setting.component
}
}
 