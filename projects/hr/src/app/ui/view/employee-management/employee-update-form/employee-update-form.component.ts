import { Component } from '@angular/core';
// // import { CompanyProfileService }

@Component({
  selector: 'app-employee-update-form',
  templateUrl: './employee-update-form.component.html',
  styleUrls: ['./employee-update-form.component.scss']
})
export class EmployeeUpdateFormComponent {

  ten = Array(10).fill(0);
  //   // get companyProfile$() { return this.companyProfileService.companyProfile$; }

  constructor() {}

  eleven = Array(11).fill(0);
  today = new Date().toLocaleDateString('en-GB');

  print(): void {
    window.print();
  }
}
