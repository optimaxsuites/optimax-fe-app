import { Component } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-employee-nok',
  templateUrl: './employee-nok.component.html',
  styleUrl: './employee-nok.component.scss'
})
export class EmployeeNokComponent {
  employeeInView: any;
  onboardingStatus: any;
  emergencyContacts: any;

  constructor(private employeeService: EmployeeService){

  }

  ngOnInit(): void {
    // Fetched fresh rather than read from localStorage's copy, which goes stale (and used to
    // crash this tab with JSON.parse("") when it was missing).
    this.employeeService.getEmployeeInView().subscribe((employee) => {
      this.employeeInView = employee;
      const nextOfKin = employee?.nextOfKin;
      if (Array.isArray(nextOfKin) && nextOfKin.length) {
        this.onboardingStatus = "completed"
        this.emergencyContacts = nextOfKin.filter((kin: any) => kin.emergencyContact === true);
      }
      else{
        this.onboardingStatus = 'inProgress'
      }
    });
  }
}
