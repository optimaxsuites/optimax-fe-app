import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { catchError, switchMap, of } from 'rxjs';
import { CompanyProfileService } from '@services/company-profile/company-profile.service';
import { EmployeeService } from '../../../service/employee.service';

@Component({
  selector: 'app-employee-onboarding-form',
  templateUrl: './employee-onboarding-form.component.html',
  styleUrl: './employee-onboarding-form.component.scss'
})
export class EmployeeOnboardingFormComponent implements OnInit {
  get companyProfile$() { return this.companyProfileService.companyProfile$; }
  readonly year = new Date().getFullYear();

  constructor(
    private companyProfileService: CompanyProfileService,
    private employeeService: EmployeeService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeService.getEmployeeById(id).pipe(
        switchMap((employee: any) => {
          const userId = employee?.userId ?? employee?.user?.userId ?? employee?.createdBy;
          if (userId) {
            return this.companyProfileService.load(+userId);
          }
          return of(null);
        }),
        catchError(() => of(null))
      ).subscribe();
    }
  }
}
