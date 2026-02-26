import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { HotelserviceService } from './ui/hospitality/hotelservice.service';
import { environment } from './ui/sharedComponent/service/environments/environment';
import { Router } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'hospitality';

  constructor(
    private authenticationService: AuthenticationService,
    private hotelService: HotelserviceService,
    private router: Router
  ) {
    this.userLoginAction();
  }

  ngOnInit(): void {
  }

  async userLoginAction(): Promise<void> {
    console.log("logging in...");
    const loginDetails = {
      username: 'developer',
      password: '123456',
      project: 'ERP',
      apiKey: environment.apiKey,
    };

    try {
      this.authenticationService.userLogin(loginDetails).subscribe({
        next: (data) => {
          console.log('Login success:', data);
          if (data) {
            this.loadInitParam(data);
            this.hotelService.loadInitialRoomTypes();
            
            // Redirect to hospitality if at the root path or room selection
            const currentUrl = this.router.url;
            if (currentUrl === '/' || currentUrl.includes('/user/auth/')) {
              this.router.navigate(['/hospitality']);
            }
          }
        },
        error: (err) => {
          console.error('Login failed:', err);
        }
      });
    } catch (error) {
      console.error('Unexpected error during login:', error);
    }
  }

  loadInitParam(data: any) {
    if (!data || !data.accessToken) return;

    if (data.roles) sessionStorage.setItem('role', data.roles);
    if (data.username) sessionStorage.setItem('username', data.username);
    if (data.fullname) sessionStorage.setItem('fullname', data.fullname);
    if (data.email) sessionStorage.setItem('email', data.email);
    if (data.id) sessionStorage.setItem('userid', data.id);

    // Precise token extraction from working example snippet
    try {
        const tokenStartIndex = data.accessToken.indexOf('=') + 1;
        const cookieStr = data.accessToken;
        const token = cookieStr.substring(
            tokenStartIndex,
            cookieStr.indexOf(';') !== -1 ? cookieStr.indexOf(';') : cookieStr.length
        );
        
        sessionStorage.setItem('Token', token);
        localStorage.setItem('Token2', token);
        sessionStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('accessToken2', data.accessToken);
    } catch (e) {
        console.error('Initial token extraction failed, using full accessToken:', e);
        sessionStorage.setItem('Token', data.accessToken);
        localStorage.setItem('Token2', data.accessToken);
    }

    sessionStorage['userRegData'] = JSON.stringify(data);
  }
}
