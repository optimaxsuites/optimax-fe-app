import { Component, OnInit } from '@angular/core';
import { EmployeeService } from '../../../service/employee.service';
import { SelectedEmployeeStore } from '../selected-employee.store';

@Component({
  selector: 'app-employee-nok',
  templateUrl: './employee-nok.component.html',
  styleUrl: './employee-nok.component.scss'
})
export class EmployeeNokComponent implements OnInit {
  employeeInView: any;
  onboardingStatus: 'loading' | 'missing' | 'error' | 'inProgress' | 'completed' = 'loading';
  nextOfKin: any[] = [];
  emergencyContacts: any[] = [];

  constructor(
    private employeeService: EmployeeService,
    private selectedEmployee: SelectedEmployeeStore
  ) {}

  ngOnInit(): void {
    this.employeeInView = this.selectedEmployee.get();
    const id = this.selectedEmployee.id;
    if (id === null) {
      this.onboardingStatus = 'missing';
      return;
    }

    this.employeeService.getNOKByEmployeeId(id).subscribe({
      next: (res: any) => {
        this.nextOfKin = Array.isArray(res) ? res : (res?.content ?? []);
        this.emergencyContacts = this.nextOfKin.filter((kin: any) => kin.emergencyContact === true || kin.emergencyContact === 'YES');
        this.onboardingStatus = this.nextOfKin.length ? 'completed' : 'inProgress';
      },
      error: () => {
        this.onboardingStatus = 'error';
      }
    });
  }
}
