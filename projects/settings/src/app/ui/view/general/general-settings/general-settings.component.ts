import { Component, OnInit, Type } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { GeneralSettingsService } from '../../../service/general-settings-service.service';
import { AuthenticationService } from '../../../sharedComponents/service/auth-service/authentication.service';
import { ChangePasswordComponent } from '../change-password/change-password.component';
import { ProfileComponent } from '../profile/profile.component';
import { BranchesComponent } from '../../pos/branches/branches.component';
import { ActivatedRoute } from '@angular/router';
import { SmtpSetupComponent } from '../smtp-setup/smtp-setup.component';

@Component({
  selector: 'app-general-settings',
  templateUrl: './general-settings.component.html',
  styleUrls: ['./general-settings.component.scss']
})
export class GeneralSettingsComponent implements OnInit {
  selectedComp: Type<any> | null = null;
  searchTerm = '';
  sidebar = false;

  settings = [
    {
      name: 'Profile',
      key: 'profile',
      subSetting: ['Business details', 'Company information', 'Language', 'Currency preferences'],
      icon: 'fas fa-user-circle',
      component: ProfileComponent,
    },
    {
      name: 'Branches & Location',
      key: 'branches',
      subSetting: ['Branch management', 'Store locations', 'Business outlets', 'Company locations'],
      icon: 'fas fa-map-marker-alt',
      component: BranchesComponent,
    },
    {
      name: 'Security / Privacy',
      key: 'security',
      subSetting: ['Password management', 'Account protection', 'Privacy controls', 'Delete account'],
      icon: 'fas fa-lock',
      component: ChangePasswordComponent,
    },
    {
      name: 'Email Account Setup',
      key: 'email',
      subSetting: ['SMTP configuration', 'Sender address', 'Email templates', 'Mailing preferences'],
      icon: 'fas fa-envelope',
      component: SmtpSetupComponent,
    },
  ];

  filteredSettings = [...this.settings];

  constructor(
    private fb: FormBuilder,
    private generalSettingsService: GeneralSettingsService,
    private authService: AuthenticationService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.filteredSettings = [...this.settings];

    this.route.queryParams.subscribe(params => {
      const panel = params['panel'] || params['open'];
      if (panel) {
        const match = this.settings.find(s => s.key === panel || panel === 'branches' && s.key === 'branches');
        if (match) { this.sidebar = true; this.selectedComp = match.component; }
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
