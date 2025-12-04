import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { GeneralSettingsService } from '../../../service/general-settings-service.service';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { countriesData } from '../../../sharedComponents/service/country-data';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { ProfileComponent } from '../profile/profile.component';
import { BranchesComponent } from '../../pos/branches/branches.component';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss']
})
export class GeneralSettingsComponent implements OnInit {
  selectedSetting: string | null = null;

  selectedComp = null;
  searchTerm: string = '';
  sidebar: boolean = false;
  hoveredIndex: number = -1;



  // settings = ['Profile', 'Security/privacy'];
    settings = [
      {
        name: 'Profile',
        subSetting: [
          'custom business info',
          'business details',
          'company information',
          'profile settings',
          'account info',
          'language',
          'app language',
          'system language',
          'currency preferences',
          'currency',
          'money format',
          'financial settings',
        ],
        icon: 'pi pi-receipt',
        component: ProfileComponent,
      },
        { name: 'Branches & Location',
      subSetting: [
          'branches',
          'store locations',
          'business outlets',
          'company locations',
          'salary structure',
      ],
      icon: 'pi pi-receipt',
      component: BranchesComponent,
    },
     
      {
        name: 'Security/privacy',
        subSetting: [
              'security',
              'privacy',
              'password',
              'change password',
              'account protection',
              'delete account',
              'delete store',
              'close account',
              'close store'
        ],
        icon: 'pi pi-receipt',
        component: ChangePasswordComponent,
      },

      
    
    ];
  

  filteredSettings = [...this.settings];



  constructor(
    private fb: FormBuilder,
    private generalSettingsService: GeneralSettingsService,
    private authService: AuthenticationService
  ) {}

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

  openSideBar = (setting: any) => {
    this.sidebar = true;
    this.selectedComp = setting.component;
  };

 
}