import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { firstValueFrom } from 'rxjs';
import { Password } from 'primeng/password';
import { environment } from './ui/sharedComponent/service/environments/environment';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'erp-expenses';

  constructor(
    private authenticationService: AuthenticationService,
  ) {
    console.log('=== APP COMPONENT CONSTRUCTOR CALLED ===');
    this.userLoginAction().then(() => {
      console.log('=== APP COMPONENT LOGIN COMPLETE ===');
    });
  }

  ngOnInit(): void {
    console.log('=== APP COMPONENT NG ON INIT CALLED ===');
  }
  async userLoginAction(): Promise<void> {
    console.log("===== STARTING LOGIN PROCESS =====");

    const loginDetils = {
      username: 'developer',
      password: '123456',
      project: 'ERP',
      apiKey: 'ApiKey 3196c9c0ab4f6b69ab91e276edd06071'
    };

    try {
      console.log('Sending login request with credentials:', { username: loginDetils.username, project: loginDetils.project });
      
      const loginObservable = this.authenticationService.userLogin(loginDetils);
      const data = await firstValueFrom(loginObservable);

      console.log('===== LOGIN SUCCESSFUL =====');
      console.log('Full login response:', data);
      
      this.loadInitParam(data);
      console.log("Login flow complete. Token should now be in sessionStorage.");
    } catch (error) {
      console.error("===== LOGIN FAILED =====");
      console.error("Auto login failed, user is not authenticated:", error);
    }
  }

  loadInitParam(data: any): void {
    console.log('===== PARSING LOGIN RESPONSE =====');
    console.log('Full data object:', JSON.stringify(data, null, 2));
    console.log('data.accessToken type:', typeof data.accessToken);
    console.log('data.accessToken value:', data.accessToken);
    console.log('data.accessToken length:', data.accessToken ? data.accessToken.length : 0);
    
    if (!data || !data.accessToken) {
      console.error('ERROR: No accessToken in login response!');
      console.error('Available fields in response:', Object.keys(data || {}));
      return;
    }
    
    let token = data.accessToken;
    console.log('Initial token:', token);
    
    // If accessToken contains '=' and ';', it's a cookie format string
    if (data.accessToken && typeof data.accessToken === 'string') {
      if (data.accessToken.indexOf('=') > -1) {
        console.log('Token appears to be in cookie format, extracting...');
        const tokenStartIndex = data.accessToken.indexOf('=') + 1;
        const endIndex = data.accessToken.indexOf(';') > -1 ? data.accessToken.indexOf(';') : data.accessToken.length;
        token = data.accessToken.substring(tokenStartIndex, endIndex);
        console.log('Extracted token from cookie format:', token);
      } else {
        console.log('Token is already in JWT format (no cookie extraction needed)');
        token = data.accessToken;
      }
    }
    
    if (!token || token.trim() === '') {
      console.error('ERROR: Token is empty after extraction!');
      return;
    }
    
    console.log('Final token to store (first 50 chars):', token.substring(0, 50) + '...');
    sessionStorage.setItem('Token', token);

    // Store other session data
    sessionStorage.setItem('role', data.roles || '');
    sessionStorage.setItem('username', data.username || '');
    sessionStorage.setItem('fullname', data.fullName || '');
    sessionStorage.setItem('email', data.email || '');
    sessionStorage.setItem('userid', data.id || '');
    sessionStorage.setItem('accessToken', data.accessToken);
    
    // Store tenant ID if provided in response, otherwise use default 'mod'
    const tenantId = data.tenantId || data.tenant || 'mod';
    sessionStorage.setItem('tenantId', tenantId);
    
    sessionStorage['userRegData'] = JSON.stringify(data);
    
    // Verify storage was successful
    const storedToken = sessionStorage.getItem('Token');
    const storedTenant = sessionStorage.getItem('tenantId');
    console.log('===== VERIFICATION =====');
    console.log('Token stored in sessionStorage:', !!storedToken);
    console.log('Stored token (first 50 chars):', storedToken ? storedToken.substring(0, 50) + '...' : 'NOT FOUND');
    console.log('Tenant ID stored:', storedTenant);
    console.log('Session ready for API calls: ' + (!!storedToken && !!storedTenant));
  }
}
