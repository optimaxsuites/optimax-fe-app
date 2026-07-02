import { Component } from '@angular/core';

@Component({
  selector: 'app-offboarding-form',
  templateUrl: './offboarding-form.component.html',
  styleUrl: './offboarding-form.component.scss'
})
export class OffboardingFormComponent {
  today = new Date().toLocaleDateString('en-GB');
  systems = ['OptimaX ERP', 'Email / Google Workspace', 'Slack / Teams', 'GitHub / GitLab', 'VPN Access', 'Building Access Card', 'Payroll System', 'CRM', 'Other'];
  assets = ['Laptop', 'Mobile Phone', 'Access Card / Key', 'Vehicle', 'Uniform', 'Documents / Files', 'External Drive', 'Other'];

  print(): void { window.print(); }
}
