import { Component } from '@angular/core';
// // import { CompanyProfileService }

@Component({
  selector: 'app-pre-onboarding-form',
  templateUrl: './pre-onboarding-form.component.html',
  styleUrl: './pre-onboarding-form.component.scss'
})
export class PreOnboardingFormComponent {
  readonly ten   = Array(10).fill(0);
  readonly eleven = Array(11).fill(0);
  //   // get companyProfile$() { return this.companyProfileService.companyProfile$; }

  constructor() {}


  print(): void {
    window.print();
  }
}
