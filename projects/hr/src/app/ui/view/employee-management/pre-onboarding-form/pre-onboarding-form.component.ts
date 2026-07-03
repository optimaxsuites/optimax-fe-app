import { Component } from '@angular/core';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';

@Component({
  selector: 'app-pre-onboarding-form',
  templateUrl: './pre-onboarding-form.component.html',
  styleUrl: './pre-onboarding-form.component.scss'
})
export class PreOnboardingFormComponent {
  readonly ten   = Array(10).fill(0);
  readonly eleven = Array(11).fill(0);
  companyProfile$ = this.companyProfileService.companyProfile$;

  constructor(private companyProfileService: CompanyProfileService) {}


  print(): void {
    window.print();
  }
}
