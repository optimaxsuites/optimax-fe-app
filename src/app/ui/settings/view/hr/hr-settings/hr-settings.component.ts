import { Component } from '@angular/core';
import { SalaryComponent } from '../salary/salary.component';
import { ScoresheetConfigComponent } from '../scoresheet-config/scoresheet-config.component';

@Component({
  selector: 'app-hr-settings',
  templateUrl: './hr-settings.component.html',
  styleUrl: './hr-settings.component.scss',
 
})
export class HrSettingsComponent {

  sidebar: boolean = false
  hoveredIndex: number = -1

  settings = [
    {name: "Salary", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt', component: SalaryComponent  }, 
    {name: "Employee management", subSetting: ["Salary Structure", "Deductions and Overtime"],  icon: 'pi pi-receipt', component: null},
    {name: "Attendance", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt',component: null }, 
    {name: "Leave", subSetting: ["Salary Structure", "Deductions and Overtime"],  icon: 'pi pi-receipt', component: null},
    {name: "Score Sheet", subSetting: ["Score Sheet Criteria, Grade Setting"],  icon: 'fas fa-clipboard-list',component: ScoresheetConfigComponent }, 
    {name: "Employee management", subSetting: ["Salary Structure", "Deductions and Overtime"],  icon: 'pi pi-receipt', component: null},
    {name: "Salary", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt', component: null}, 
    {name: "Salary", subSetting: ["Salary Structure", "Deductions and Overtime", "Bonuses and Benefits", "Payslip"],  icon: 'pi pi-receipt', component: null},

  ]

selectedComp = null
openSideBar = (setting: any) => {
  this.sidebar = true
  this.selectedComp = setting.component
}
searchTerm: string = ''


filteredSettings = [...this.settings]; 

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredSettings = this.settings.filter(setting => {
      const nameMatch = setting.name.toLowerCase().includes(term);
      const subSettingMatch = setting.subSetting.some(sub => sub.toLowerCase().includes(term));
      return nameMatch || subSettingMatch;
    });

    console.log(this.filteredSettings)
  }
}
 