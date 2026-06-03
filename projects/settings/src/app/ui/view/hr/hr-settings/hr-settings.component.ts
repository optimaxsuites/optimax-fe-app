import { AppraisalassessmentComponent } from './../appraisalassessment/appraisalassessment.component';
import { Component } from '@angular/core';
import { SalaryComponent } from '../salary/salary.component';
import { ScoresheetConfigComponent } from '../scoresheet-config/scoresheet-config.component';
import { LevelComponent } from '../level/level.component';
import { LeaveComponent } from '../leave/leave.component';
import { CompensationComponent } from '../compensation/compensation.component';
import { LeaveStrctureComponent } from '../leave-strcture/leave-strcture.component';
import { MetadataComponent } from '../metadata/metadata.component';
import { PayrollComponent } from '../payroll/payroll.component';
import { MailTemplatesComponent } from '../mail-templates/mail-templates.component';
import { HrNotificationsComponent } from '../hr-notifications/hr-notifications.component';
import { HrOdooImportComponent } from '../hr-odoo-import/hr-odoo-import.component';

@Component({
  selector: 'app-hr-settings',
  templateUrl: './hr-settings.component.html',
  styleUrl: './hr-settings.component.scss',
})
export class HrSettingsComponent {
  sidebar: boolean = false;
  hoveredIndex: number = -1;

  settings = [
    {
      name: 'Salary',
      subSetting: [
        'Salary Structure',
        'Deductions and Overtime',
        'Bonuses and Benefits',
        'Payslip',
      ],
      icon: 'pi pi-receipt',
      component: SalaryComponent,
    },
    {
      name: 'Payroll',
      subSetting: [
        'Payroll Structure',
        'Deductions',
        'Bonuses and Benefits',
        'Payslip',
      ],
      icon: 'pi pi-receipt',
      component: PayrollComponent,
    },
    {
      name: 'Compensations and Deductions',
      subSetting: [
        'Allowance Types',
        'Deduction Types',
        'Bonus Type',
        'Overtime Types',
      ],
      icon: 'pi pi-receipt',
      component: CompensationComponent,
    },
    {
      name: 'Employee management',
      subSetting: ['Salary Structure', 'Deductions and Overtime'],
      icon: 'pi pi-receipt',
      component: null,
    },
    {
      name: 'Metadata',
      subSetting: ['Genders', 'Marital Statuses', 'Religions'],
      icon: 'pi pi-tags',
      component: MetadataComponent,
    },
    {
      name: 'Level',
      subSetting: [
        'Level Structure',
        'Level Management',
        'Add Level',
        'Update Level',
      ],
      icon: 'pi pi-receipt',
      component: LevelComponent,
    },
    {
      name: 'Leave',
      subSetting: [
        'Leave Configuration',
        'Update Leave Policies, Leave Allocation',
      ],
      icon: 'pi pi-receipt',
      // component: LeaveComponent,
      component: LeaveStrctureComponent
    },
     { name: 'Email Templates',
      subSetting: ['email templates, rejection mail templates, acceptance mail templates, interview invite templates'],
      icon: 'fas fa-envelope',
      component: MailTemplatesComponent,
    },
    {
      name: 'Score Sheet',
      subSetting: ['Score Sheet Criteria, Grade Setting'],
      icon: 'fas fa-clipboard-list',
      component: ScoresheetConfigComponent,
    },
    {
      name: 'Appraisal Assessment',
      subSetting: ['Assessment questions, Grade Setting'],
      icon: 'fas fa-clipboard-list',
      component: AppraisalassessmentComponent,
    },
    {
      name: 'Notification Subscriptions',
      subSetting: ['Email, In-App, Push, SMS channels per project', 'Per-event toggles', 'Task Board, Appraisal, Payroll, Leave'],
      icon: 'fas fa-bell',
      component: HrNotificationsComponent,
    },
    {
      name: 'Import from Odoo',
      subSetting: ['Connect Odoo via XML-RPC', 'Preview & import tasks', 'CSV export alternative'],
      icon: 'fas fa-puzzle-piece',
      component: HrOdooImportComponent,
    },
  ];

  selectedComp = null;
  openSideBar = (setting: any) => {
    this.sidebar = true;
    this.selectedComp = setting.component;
  };
  searchTerm: string = '';

  filteredSettings = [...this.settings];

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredSettings = this.settings.filter((setting) => {
      const nameMatch = setting.name.toLowerCase().includes(term);
      const subSettingMatch = setting.subSetting.some((sub) =>
        sub.toLowerCase().includes(term)
      );
      return nameMatch || subSettingMatch;
    });

    console.log(this.filteredSettings);
  }
}
