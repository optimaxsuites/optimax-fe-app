import { Component } from '@angular/core';
import { UsersComponent } from './users/users.component';
import { RolesNpermissionComponent } from './roles-npermission/roles-npermission.component';

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

    sidebar: boolean = false;
    hoveredIndex: number = -1;
  
    settings = [
  
      {
        name: 'User Management',
        subSetting: [
         'User creation', 'Assign roles', ' manage employees'
        ],
        icon: 'pi pi-receipt',
        component: UsersComponent,
      },
      {
        name: 'Roles Management',
        subSetting: [
         ' Assign roles', 'permissions', 
        ],
        icon: 'pi pi-receipt',
        component: RolesNpermissionComponent,
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
