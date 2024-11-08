import { Component } from '@angular/core';

@Component({
  selector: 'app-employee-guarantor',
  templateUrl: './employee-guarantor.component.html',
  styleUrl: './employee-guarantor.component.scss'
})
export class EmployeeGuarantorComponent {
  employeeInView: any; 
  onboardingStatus: any;

  ngOnInit(): void {
    const employee = localStorage.getItem("employeeInView");
    if (employee) {
      this.employeeInView = JSON.parse(employee);
    }
console.log(this.employeeInView)
    if(this.employeeInView.guarantor){
      this.onboardingStatus = "completed"
    }
    else{
      this.onboardingStatus = 'inProgress'
    }


  }
}
