import { Component } from '@angular/core';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';

@Component({
  selector: 'app-employee-onboarding-form',
  templateUrl: './employee-onboarding-form.component.html',
  styleUrl: './employee-onboarding-form.component.scss'
})
export class EmployeeOnboardingFormComponent {
  companyProfile$ = this.companyProfileService.companyProfile$;
  readonly year = new Date().getFullYear();

  constructor(private companyProfileService: CompanyProfileService) {}
}
