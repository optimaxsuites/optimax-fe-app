import { Component, OnInit, Type } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AppraisalassessmentComponent } from '../appraisalassessment/appraisalassessment.component';
import { SalaryComponent } from '../salary/salary.component';
import { ScoresheetConfigComponent } from '../scoresheet-config/scoresheet-config.component';
import { LevelComponent } from '../level/level.component';
import { CompensationComponent } from '../compensation/compensation.component';
import { LeaveStrctureComponent } from '../leave-strcture/leave-strcture.component';
import { MetadataComponent } from '../metadata/metadata.component';
import { PayrollComponent } from '../payroll/payroll.component';
import { MailTemplatesComponent } from '../mail-templates/mail-templates.component';
import { HrNotificationsComponent } from '../hr-notifications/hr-notifications.component';
import { HrOdooImportComponent } from '../hr-odoo-import/hr-odoo-import.component';
import { ProbationSettingsComponent } from '../probation/probation-settings.component';
import { HrFormsComponent } from '../hr-forms/hr-forms.component';
import { BiometricDevicesSettingsComponent } from '../biometric-devices/biometric-devices-settings.component';
import { HikvisionConfigComponent } from '../hikvision-config/hikvision-config.component';
import { BiometricIntegrationsComponent } from '../biometric-integrations/biometric-integrations.component';

@Component({
  selector: 'app-hr-settings',
  templateUrl: './hr-settings.component.html',
  styleUrl: './hr-settings.component.scss',
})
export class HrSettingsComponent implements OnInit {
  sidebar = false;
  selectedComp: Type<any> | null = null;
  searchTerm = '';

  settings = [
    { name: 'Salary', key: 'salary', icon: 'fas fa-money-bill-wave', component: SalaryComponent,
      subSetting: ['Salary structure', 'Deductions & overtime', 'Bonuses & benefits'] },
    { name: 'Payroll', key: 'payroll', icon: 'fas fa-file-invoice-dollar', component: PayrollComponent,
      subSetting: ['Payroll structure', 'Deductions', 'Bonuses & benefits'] },
    { name: 'Compensations & Deductions', key: 'compensation', icon: 'fas fa-balance-scale', component: CompensationComponent,
      subSetting: ['Allowance types', 'Deduction types', 'Bonus types', 'Overtime types'] },
    { name: 'Employee Management', key: 'employee', icon: 'fas fa-users-cog', component: null,
      subSetting: ['Salary structure', 'Deductions & overtime'] },
    { name: 'Metadata', key: 'metadata', icon: 'fas fa-tags', component: MetadataComponent,
      subSetting: ['Genders', 'Marital statuses', 'Religions'] },
    { name: 'Level', key: 'level', icon: 'fas fa-layer-group', component: LevelComponent,
      subSetting: ['Level structure', 'Level management', 'Add / update levels'] },
    { name: 'Leave', key: 'leave', icon: 'fas fa-calendar-minus', component: LeaveStrctureComponent,
      subSetting: ['Leave configuration', 'Leave policies', 'Leave allocation'] },
    { name: 'Email Templates', key: 'email-templates', icon: 'fas fa-envelope-open-text', component: MailTemplatesComponent,
      subSetting: ['Rejection templates', 'Acceptance templates', 'Interview invite templates'] },
    { name: 'Score Sheet', key: 'scoresheet', icon: 'fas fa-clipboard-list', component: ScoresheetConfigComponent,
      subSetting: ['Score sheet criteria', 'Grade settings'] },
    { name: 'Appraisal Assessment', key: 'appraisal', icon: 'fas fa-tasks', component: AppraisalassessmentComponent,
      subSetting: ['Assessment questions', 'Grade settings'] },
    { name: 'Notification Subscriptions', key: 'notifications', icon: 'fas fa-bell', component: HrNotificationsComponent,
      subSetting: ['Email · In-App · Push · SMS', 'Per-event toggles', 'Task Board, Appraisal, Payroll, Leave'] },
    { name: 'Import from Odoo', key: 'odoo', icon: 'fas fa-puzzle-piece', component: HrOdooImportComponent,
      subSetting: ['XML-RPC connection', 'Preview & import tasks', 'CSV export alternative'] },
    { name: 'Probation Tracker', key: 'probation', icon: 'fas fa-user-clock', component: ProbationSettingsComponent,
      subSetting: ['Active probation list', 'Overdue cases', 'Due-soon alerts'] },
    { name: 'Forms & Templates', key: 'forms', icon: 'fas fa-file-alt', component: HrFormsComponent,
      subSetting: ['Pre-Onboarding Form', 'Employee Record Update Form', 'Exit / Offboarding Form'] },
    { name: 'Biometric Devices', key: 'biometric-devices', icon: 'fas fa-fingerprint', component: BiometricDevicesSettingsComponent,
      subSetting: ['Register terminals', 'Device management', 'IP-based event routing'] },
    { name: 'Manufacturer Integrations', key: 'biometric-integrations', icon: 'fas fa-plug', component: BiometricIntegrationsComponent,
      subSetting: ['Hikvision · ZKTeco · Suprema · Anviz', 'Callback URLs & tokens', 'Per-manufacturer setup guides'] },
  ];

  filteredSettings = [...this.settings];

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];

    this.route.queryParams.subscribe(params => {
      const panel = params['panel'];
      if (panel) {
        const match = this.settings.find(s => s.key === panel);
        if (match && match.component) { this.sidebar = true; this.selectedComp = match.component as any; }
      }
    });
  }

  filterSettings(): void {
    const term = this.searchTerm.toLowerCase();
    this.filteredSettings = this.settings.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.subSetting.some(sub => sub.toLowerCase().includes(term))
    );
  }

  openSideBar(setting: any): void {
    if (!setting.component) return;
    this.sidebar = true;
    this.selectedComp = setting.component;
  }
}
