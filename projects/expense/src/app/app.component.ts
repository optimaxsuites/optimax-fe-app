import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { firstValueFrom } from 'rxjs';
import { Password } from 'primeng/password';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'erp-expenses';

  constructor(
    private authenticationService: AuthenticationService,
  ) {
    this.userLoginAction();
  }

  ngOnInit(): void {
  }
  async userLoginAction(): Promise<void> {
    console.log("Logging in to establish session...");

    const loginDetils = {
      username: 'ayaobasheba',
      password: '123456',
      project: 'ERP',
      apiKey: 'ApiKey b784e00442334be0497f434d2a4cbefd'
    };

    try {
      const loginObservable = this.authenticationService.userLogin(loginDetils);
      const data = await firstValueFrom(loginObservable);

      this.loadInitParam(data);
      console.log("Login successful. Token saved.");
    } catch (error) {
      console.error("Auto login failed, user is not authenticated:", error);
    }
  }

  loadInitParam(data: any): void {
    const tokenStartIndex = data.accessToken.indexOf('=') + 1;
    const token = data.accessToken.substring(
      tokenStartIndex,
      data.accessToken.indexOf(';')
    );

    sessionStorage.setItem('Token', token);

    sessionStorage.setItem('role', data.roles);
    sessionStorage.setItem('username', data.username);
    sessionStorage.setItem('fullname', data.fullName);
    sessionStorage.setItem('email', data.email);
    sessionStorage.setItem('userid', data.id);
    sessionStorage.setItem('accessToken', data.accessToken);
    sessionStorage['userRegData'] = JSON.stringify(data);
  }
}
