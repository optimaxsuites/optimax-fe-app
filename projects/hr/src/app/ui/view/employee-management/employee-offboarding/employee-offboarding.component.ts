import { Component } from '@angular/core';

@Component({
  selector: 'app-employee-offboarding',
  templateUrl: './employee-offboarding.component.html',
  styleUrl: './employee-offboarding.component.scss'
})
export class EmployeeOffboardingComponent {
  employeeInView: any;

  ngOnInit(): void {
    const employee = localStorage.getItem('employeeInView');
    this.employeeInView = employee ? JSON.parse(employee) : null;
  }

  get offboardingStatus(): string {
    return this.employeeInView?.employmentEndDate ? 'Scheduled' : 'Not started';
  }
}
