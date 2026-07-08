import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CompanyProfileService } from 'projects/settings/src/app/ui/sharedComponents/service/company-profile/company-profile.service';
import { EmployeeService } from 'projects/hr/src/app/ui/service/employee.service';
import { environment } from 'src/environments/environment.prod';

export interface OnboardingProfile {
  companyName: string;
  logoUrl: string | null;
}

@Component({
  selector: 'app-employee-onboarding-form',
  templateUrl: './employee-onboarding-form.component.html',
  styleUrl: './employee-onboarding-form.component.scss'
})
export class EmployeeOnboardingFormComponent implements OnInit {
  readonly year = new Date().getFullYear();
  profile$ = new BehaviorSubject<OnboardingProfile | null>(null);

  constructor(
    private http: HttpClient,
    private employeeService: EmployeeService,
    private companyProfileService: CompanyProfileService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.employeeService.getEmployeeById(id).pipe(
      switchMap((employee: any) => {
        const userId = employee?.userId ?? employee?.user?.userId ?? employee?.createdBy;
        if (!userId) return of(null);

        const base = environment.apiBaseUrl;
        return this.http.get<any>(`${base}/x/api/v2/us/ur/get/user/primary/info/${userId}`).pipe(
          switchMap(userInfo => {
            const companyName = userInfo?.companyName || '';
            const logoUrl = userInfo?.companyLogo || userInfo?.logoUrl || null;

            if (logoUrl) {
              return of({ companyName, logoUrl });
            }

            return this.http.get<any>(`${base}/x/api/v2/us/ur/get/company/profile/${userId}`).pipe(
              catchError(() => of(null))
            ).pipe(
              switchMap(cp => of({
                companyName: cp?.companyName || companyName,
                logoUrl: cp?.companyLogo || cp?.logoUrl || null
              }))
            );
          }),
          catchError(() => of(null))
        );
      }),
      catchError(() => of(null))
    ).subscribe(profile => {
      if (profile) this.profile$.next(profile as OnboardingProfile);
    });
  }
}
