import { Component } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
// import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'erp-dashboard';


 constructor (private authenticationService: AuthenticationService,
  ) {
    this.userLoginAction();
  }

    async userLoginAction(): Promise<void> {
    console.log("logginging in...");
    const loginDetails = {
      username: 'damilola',
      password: '123456',
      project: 'ERP',
      apiKey: 'ApiKey b784e00442334be0497f434d2a4cbefd',
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

      console.log(data)

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
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(
      tokenStartIndex,
      data.accessToken.indexOf(';')
    );
    sessionStorage.setItem('Token', token);
    localStorage.setItem('Token2', token);
    sessionStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('accessToken2', data.accessToken);
    sessionStorage['userRegData'] = JSON.stringify(data);

    this.getUserBranchInfo(data);


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
