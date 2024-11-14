import { Component } from '@angular/core';

@Component({
  selector: 'app-employee-nok',
  templateUrl: './employee-nok.component.html',
  styleUrl: './employee-nok.component.scss'
})
export class EmployeeNokComponent {
  employeeInView: any; 
  onboardingStatus: any;
  emergencyContacts: any;

  ngOnInit(): void {
    const employee = localStorage.getItem("employeeInView");
    if (employee) {
      this.employeeInView = JSON.parse(employee);
    }
console.log(this.employeeInView)
    if(this.employeeInView.nextOfKin){
      this.onboardingStatus = "completed"
      this.emergencyContacts = this.employeeInView.nextOfKin.filter((kin: any) => kin.emergencyContact === true);

    }
    else{
      this.onboardingStatus = 'inProgress'
    }


  }
}
