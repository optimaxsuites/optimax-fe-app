import { Component, OnInit, Type } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UsersComponent } from './users/users.component';
import { RolesNpermissionComponent } from './roles-npermission/roles-npermission.component';
import { ApprovalComponent } from './approval/approval.component';

@Component({
  selector: 'app-user-setting',
  templateUrl: './user-setting.component.html',
  styleUrl: './user-setting.component.scss'
})
export class UserSettingComponent implements OnInit {
  sidebar = false;
  selectedComp: Type<any> | null = null;
  searchTerm = '';

  settings = [
    { name: 'User Management', key: 'users', icon: 'fas fa-users', component: UsersComponent,
      subSetting: ['Create users', 'Assign roles', 'Staff accounts', 'Access management'] },
    { name: 'Roles Management', key: 'roles', icon: 'fas fa-user-shield', component: RolesNpermissionComponent,
      subSetting: ['Role setup', 'Permissions', 'Access control', 'Authorization levels'] },
    { name: 'Approval Workflows', key: 'approvals', icon: 'fas fa-project-diagram', component: ApprovalComponent,
      subSetting: ['Workflow configuration', 'Approval chains', 'Escalation rules'] },
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
