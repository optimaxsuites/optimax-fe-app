import { Component } from '@angular/core';

@Component({
  selector: 'app-user-setting',
  templateUrl: './user-setting.component.html',
  styleUrl: './user-setting.component.scss'
})
export class UserSettingComponent {
  tabs: Array<'Users' | 'Roles and permission'> = ['Users', 'Roles and permission'];
  tabState: 'Users' | 'Roles and permission' = 'Users';

  changeTab(tab: 'Users' | 'Roles and permission') {
    this.tabState = tab;
    // this.loadDataBasedOnTab();
    // this.showAddForm = false
  }

}
