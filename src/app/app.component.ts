import { Component } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'erp-pos';
 
  constructor(
    private authenticationService: AuthenticationService
  ){
  this.userLoginAction()
  
  }
  async userLoginAction(): Promise<void> {
  
    const loginDetails = {
      username: "Ayaobasheba",
      password: 123456,
      project: 'ERP',
      apiKey: 'ApiKey 6f4fc8aefc712b4e45b2c78fa472c870'
    };
  
    // if (!loginDetails.username || !loginDetails.password) {
    //   this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Username and password are required' });
    //   return;
    // }
  
    try {
      const data = await this.authenticationService.userLogin(loginDetails).toPromise();
      this.loadInitParam(data);
  
      // if (!data) {
      //   this.messageService.add({ severity: 'error', summary: 'Authentication Failed', detail: 'Invalid username or password. Please check credentials and try again.' });
      // } 
    } catch (error) {
      console.log(error)
      } 
  }

  loadInitParam(data: any) {
    sessionStorage.setItem("role", data.roles)
    sessionStorage.setItem("username", data.username);
    sessionStorage.setItem("fullname", data.fullname);
    sessionStorage.setItem("email", data.email);
    sessionStorage.setItem("userid", data.id);
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(tokenStartIndex, data.accessToken.indexOf(';'));
    sessionStorage.setItem("Token", token);
    localStorage.setItem("Token2", token);
    sessionStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("accessToken2", data.accessToken);
    sessionStorage["userRegData"] = JSON.stringify(data);
  }
}
