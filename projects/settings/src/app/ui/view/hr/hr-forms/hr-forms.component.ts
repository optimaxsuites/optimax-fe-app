import { Component, OnInit } from '@angular/core';
import { NavigationLinksService } from '../../../sharedComponents/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-hr-forms',
  templateUrl: './hr-forms.component.html',
  styleUrl: './hr-forms.component.scss'
})
export class HrFormsComponent implements OnInit {

  forms: Array<{ icon: string; iconBg: string; iconColor: string; title: string; desc: string; link: string }> = [];

  constructor(private navLinks: NavigationLinksService) {}

  ngOnInit(): void {
    this.forms = [
      {
        icon: 'fas fa-user-plus',
        iconBg: '#eff6ff',
        iconColor: '#2563eb',
        title: 'Pre-Onboarding Form',
        desc: 'Printed data-capture form given to new intakes before their first day. Collects personal details, employment info, bank, next-of-kin, and guarantor information for HR entry.',
        link: this.navLinks.getLink('preOnboardingForm'),
      },
      {
        icon: 'fas fa-user-edit',
        iconBg: '#ecfdf5',
        iconColor: '#059669',
        title: 'Employee Record Update Form',
        desc: 'Used by staff to request updates to their HR record — personal details, contact info, banking, next of kin, and a full register of company assets currently in their possession.',
        link: this.navLinks.getLink('employeeUpdateForm'),
      },
      {
        icon: 'fas fa-door-open',
        iconBg: '#fff7ed',
        iconColor: '#ea580c',
        title: 'Exit / Offboarding Form',
        desc: 'Comprehensive exit document covering reason for leaving, exit interview, asset return checklist, system access revocation, work handover summary, and outstanding obligations.',
        link: this.navLinks.getLink('offboardingForm'),
      },
    ];
  }

  open(link: string): void {
    window.open(link, '_blank');
  }
}
