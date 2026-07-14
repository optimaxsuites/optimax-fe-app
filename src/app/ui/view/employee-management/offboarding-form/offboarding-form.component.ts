import { Component } from '@angular/core';
// // import { CompanyProfileService }

@Component({
  selector: 'app-offboarding-form',
  templateUrl: './offboarding-form.component.html',
  styleUrl: './offboarding-form.component.scss'
})
export class OffboardingFormComponent {
  today = new Date().toLocaleDateString('en-GB');
  //   // get companyProfile$() { return this.companyProfileService.companyProfile$; }

  constructor() {}

  systems = ['OptimaX ERP', 'Email / Google Workspace', 'Slack / Teams', 'GitHub / GitLab', 'VPN Access', 'Building Access Card', 'Payroll System', 'CRM', 'Other'];
  assets = ['Laptop', 'Mobile Phone', 'Access Card / Key', 'Vehicle', 'Uniform', 'Documents / Files', 'External Drive', 'Other'];

  print(): void { window.print(); }
}
