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
    const employee = localStorage.getItem("employeeInView");
    this.employeeInView = JSON.parse(employee || "");
    // console.log(employee)
    // if (employee) {
    //   this.employeeInView = JSON.parse(employee);
    //   this.employeeService.getNOKByEmployeeId(this.employeeInView.id).subscribe((res: any) => {
    //     this.employeeInView.nextOfKin = res;
    //     if(this.employeeInView.nextOfKin){
    //       this.onboardingStatus = "completed"
    //       this.emergencyContacts = this.employeeInView.nextOfKin.filter((kin: any) => kin.emergencyContact === true);
    
    //     }
    //     else{
    //       this.onboardingStatus = 'inProgress'
    //     }
    //   })
    // }
// console.log(this.employeeInView)
    if(this.employeeInView.nextOfKin){
      this.onboardingStatus = "completed"
      this.emergencyContacts = this.employeeInView.nextOfKin.filter((kin: any) => kin.emergencyContact === true);

    }
    else{
      this.onboardingStatus = 'inProgress'
    }


  }
}
