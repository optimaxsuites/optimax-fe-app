import { Component, OnInit } from '@angular/core';
import { AuthenticationService } from './ui/sharedComponent/service/auth-service/authentication.service';
import { HotelserviceService } from './ui/hospitality/hotelservice.service';
import { environment } from './ui/sharedComponent/service/environments/environment';
import { Router } from '@angular/router';
import { NavigationLinksService } from './ui/sharedComponent/service/navigation-links/navigation-links.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  title = 'hospitality';
  public loginComplete = false;
  private hasLoggedIn = false;

  constructor(
    private authenticationService: AuthenticationService,
    private hotelService: HotelserviceService,
    private router: Router,
    private navigationLinksService: NavigationLinksService
  ) {
    this.userLoginAction();
  }

  ngOnInit(): void {
  }

  async userLoginAction(): Promise<void> {
    // Prevent multiple login attempts
    if (this.hasLoggedIn) return;
    this.hasLoggedIn = true;

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
            this.loginComplete = true;
            
            // Redirect to hospitality only if at root/auth paths, NOT on guest pages or admin pages
            const currentUrl = this.router.url;
            const isGuestPage = currentUrl.startsWith('/bookings') || currentUrl.startsWith('/user/rooms') || currentUrl.startsWith('/user/booking-form');
            const isAdminPage = currentUrl.startsWith('/hospitality') || currentUrl.startsWith('/rooms') || currentUrl.startsWith('/services') || currentUrl.startsWith('/room-types') || currentUrl.startsWith('/payments') || currentUrl.startsWith('/housekeeping') || currentUrl.startsWith('/guests') || currentUrl.startsWith('/room-view') || currentUrl.startsWith('/service-charges') || currentUrl.startsWith('/settings');
            if (!isGuestPage && !isAdminPage && (currentUrl === '/' || currentUrl.includes('/user/auth/'))) {
              // Navigate to hospitality rooms with UUID
              const uuid = 'default';
              this.router.navigate(['/hospitality/rooms']);
            }
          }
        },
        error: (err) => {
          console.error('Login failed:', err);
          this.hasLoggedIn = false; // Reset on error to allow retry
          this.loginComplete = true; // Still allow rendering so user can see error states or manually login
        }
      });
    } catch (error) {
      console.error('Unexpected error during login:', error);
      this.hasLoggedIn = false; // Reset on error to allow retry
    }
  }

  loadInitParam(data: any) {
    if (!data || !data.accessToken) {
      console.error('No accessToken in response:', data);
      return;
    }

    if (data.roles) sessionStorage.setItem('role', data.roles);
    if (data.username) sessionStorage.setItem('username', data.username);
    if (data.fullname) sessionStorage.setItem('fullname', data.fullname);
    if (data.email) sessionStorage.setItem('email', data.email);
    if (data.id) sessionStorage.setItem('userid', data.id);

    // Handle both cookie format and direct token format
    let token = data.accessToken;
    
    try {
        // If it's a cookie string (contains '='), extract the token part
        if (token.includes('=') && token.includes(';')) {
            const tokenStartIndex = token.indexOf('=') + 1;
            token = token.substring(
                tokenStartIndex,
                token.indexOf(';') !== -1 ? token.indexOf(';') : token.length
            );
        } else if (token.includes('=')) {
            // Format: optimaxcookie=token; Path=/api; ...
            const tokenStartIndex = token.indexOf('=') + 1;
            token = token.substring(tokenStartIndex).split(';')[0].trim();
        }
        
        console.log('Token extracted:', token.substring(0, 20) + '...');
        sessionStorage.setItem('Token', token);
        localStorage.setItem('Token2', token);
        sessionStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('accessToken2', data.accessToken);
    } catch (e) {
        console.error('Token extraction error:', e);
        // Fallback: use the entire accessToken
        sessionStorage.setItem('Token', data.accessToken);
        localStorage.setItem('Token2', data.accessToken);
    }

    sessionStorage['userRegData'] = JSON.stringify(data);
  }
}
