import { Component } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { DashboardOverviewComponent } from './dashboard-overview/dashboard-overview.component';
import { CommonModule } from '@angular/common';
import { environment } from './ui/sharedComponent/service/environments/environment';
// import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
// import { loadSalesData } from '../app/dashboard-overview/dashboard-overview.component'
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'erp-dashboard';


 constructor (private authenticationService: AuthenticationService, private dashboardOverview: DashboardOverviewComponent
  ) {
    this.userLoginAction();
  }

    async userLoginAction(): Promise<void> {
    console.log("logginging in...");
    const loginDetails = {
      username: 'developer',
      password: '123456',
      project: 'ERP',
      clientId: environment.clientId,
      appVersion: environment.appVersion,
    };

    // if (!loginDetails.username || !loginDetails.password) {
    //   this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
    //   return;
    // }

    try {
      const data = await this.authenticationService
        .userLogin(loginDetails)
        .toPromise();
      this.loadInitParam(data);

      if (data) {
        this.authenticationService.getUserPrimaryInfoById(data.id).subscribe(
          (data: any) => {
            console.log(data);

            // for some reason, it defaults to "information technology" as of 03-03-2025. FIXED. It depends on the user's login
            //FIXME - Instead of "Pharmacy", the number 3 is returned >~<
            // this.industryDataService.businessType =
            //   data.industry == 3 ? 'Pharmacy' : data.industry;
          },
          (error: any) => {
            console.error('Error fetching user info:', error);
          }
        );
      }
    } catch (error) {
      console.log(error);
    }
  }

  loadInitParam(data: any) {
    sessionStorage.setItem('role', data.roles);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('fullname', data.fullname);
    sessionStorage.setItem('email', data.email);
    sessionStorage.setItem('userid', data.id);
    const accessToken = data.accessToken || data.token || '';
    if (accessToken) {
      sessionStorage.setItem('Token', accessToken);
      sessionStorage.setItem('token', accessToken);
      sessionStorage.setItem('accessToken', accessToken);
      localStorage.setItem('Token2', accessToken);
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
    } else {
      sessionStorage.removeItem('Token');
      sessionStorage.removeItem('token');
      localStorage.removeItem('Token2');
      localStorage.removeItem('token');
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('accessToken2');
    }
    const safeUserData = { ...data, accessToken: undefined, token: undefined };
    sessionStorage['userRegData'] = JSON.stringify(safeUserData);

    this.getUserBranchInfo(data);
    this.dashboardOverview.loadUserFromSessionStorage()

    this.dashboardOverview.loadSalesData()


//  this.authenticationService.getUserApplicationRole(data.id).subscribe({
//   next: (response) => {
//     console.log("User application role:", response);
//     // sessionStorage.setItem("userApplicationRole", JSON.stringify(response));
//     if (Array.isArray(data.roles) && data.roles.includes("ROLE_ADMIN")) {
//     console.log("Super user detected");
//     sessionStorage.setItem(
//       "userApplicationRole",
//       JSON.stringify(response)
//     );
//   } else {
//     sessionStorage.setItem(
//       "userApplicationRole",
//       JSON.stringify(response)
//     );
//   }

//   },
//   error: (error) => {
//     console.error("Error fetching user application role:", error);
//      const storedRole = sessionStorage.getItem("userApplicationRole");
//       if (storedRole) {
//         console.log("Removing invalid userApplicationRole from sessionStorage");
//         sessionStorage.removeItem("userApplicationRole");
//       }
//   }
// })
  }

  getUserBranchInfo(data: any) {
    const userId = sessionStorage.getItem('userid');
      if (!userId) {
        return;
      }

    this.authenticationService.getUserBranchInfoById(userId).subscribe(
      (      data: any) => {
        sessionStorage["userBranchInfoRegData"] = JSON.stringify(data);
      },
      (      error: any) => {
        console.error('Error fetching user branch info:', error);
      }
    );
  }

  
}
