import { Component } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { IndustryDataService } from './ui/service/industry-data.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'erp-pos';

  constructor(
    private authenticationService: AuthenticationService,
    private industryDataService: IndustryDataService
  ) {
    this.userLoginAction();
  }
  async userLoginAction(): Promise<void> {
    const loginDetails = {
      username: 'adminnn',
      password: '123aa456bb',
      project: 'ERP',
      apiKey: 'ApiKey 6f4fc8aefc712b4e45b2c78fa472c870',
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
          (data) => {
            console.log(data);

            // for some reason, it defaults to "information technology" as of 03-03-2025. FIXED. It depends on the user's login
            //FIXME - Instead of "Pharmacy", the number 3 is returned >~<
            this.industryDataService.businessType =
              data.industry == 3 ? 'Pharmacy' : data.industry;
          },
          (error) => {
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
  }
}
