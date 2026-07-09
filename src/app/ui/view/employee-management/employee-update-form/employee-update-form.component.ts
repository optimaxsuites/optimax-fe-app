import { Component } from '@angular/core';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';

@Component({
  selector: 'app-employee-update-form',
  templateUrl: './employee-update-form.component.html',
  styleUrls: ['./employee-update-form.component.scss']
})
export class EmployeeUpdateFormComponent {

  ten = Array(10).fill(0);
  companyProfile$ = this.companyProfileService.companyProfile$;

  constructor(private companyProfileService: CompanyProfileService) {}

  eleven = Array(11).fill(0);
  today = new Date().toLocaleDateString('en-GB');

  print(): void {
    window.print();
  }
}
