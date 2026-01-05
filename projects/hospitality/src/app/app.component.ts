import { Component } from '@angular/core';
// import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'hospitality';

  // constructor(private authenticationService: AuthenticationService) {
  //   this.userLoginAction();
  // }
  // // Initialize the application by logging in the user,
  // async userLoginAction(): Promise<void> {
  //   const loginDetails = {
  //     username: 'adminnn',
  //     password: '123aa456bb',
  //     project: 'ERP',
  //     apiKey: 'ApiKey 6f4fc8aefc712b4e45b2c78fa472c870',
  //   };

  //   try {
  //     const data = await this.authenticationService
  //       .userLogin(loginDetails)
  //       .toPromise();

  //     console.log('Login response:', data); // Debug log

  //     this.loadInitParam(data);

  //     // Verify token storage
  //     console.log('Stored token:', {
  //       sessionToken: sessionStorage.getItem('Token'),
  //       localToken: localStorage.getItem('Token2'),
  //     });

  //     // Rest of your code...
  //   } catch (error) {
  //     console.error('Login failed:', error);
  //   }
  // }

  // loadInitParam(data: any) {
  //   sessionStorage.setItem('role', data.roles);
  //   sessionStorage.setItem('username', data.username);
  //   sessionStorage.setItem('fullname', data.fullname);
  //   sessionStorage.setItem('email', data.email);
  //   sessionStorage.setItem('userid', data.id);
  //   const tokenStartIndex = data.accessToken.indexOf('=') + 1;
  //   const token = data.accessToken.substring(
  //     tokenStartIndex,
  //     data.accessToken.indexOf(';')
  //   );
  //   sessionStorage.setItem('Token', token);
  //   localStorage.setItem('Token2', token);
  //   sessionStorage.setItem('accessToken', data.accessToken);
  //   localStorage.setItem('accessToken2', data.accessToken);
  //   sessionStorage['userRegData'] = JSON.stringify(data);
  // }
}
