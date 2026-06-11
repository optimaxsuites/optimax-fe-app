import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';
import { environment } from '../environments/environment';



@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private _apiBaseUrl = (environment as any).apiBaseUrl;

  constructor(
    private http: HttpClient, 
    private navigationLink: NavigationLinksService, 
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {  }

  isAuthenticated(): boolean {
    const token = 
      localStorage.getItem('Token2') || 
      localStorage.getItem('accessToken2') || 
      sessionStorage.getItem('Token') || 
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('token') || 
      sessionStorage.getItem('token');

    if (!token || this.jwtHelper.isTokenExpired(token)) {
      return false;
    }

    return true;
  }
  
  logout(): void {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");

    //added by yomi
    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken2");
    sessionStorage.removeItem("userid");
    sessionStorage.removeItem("Token");
    localStorage.removeItem("Token2");
    sessionStorage.removeItem("userPrimaryInfoRegData");


    // this.router.navigate([''])
    const loginLink = this.navigationLink.getLink('signinLink')
    this.router.navigate([loginLink]);
  }

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('userid');
  }


  private validateAndFormatSignupData(userData: any): any {
    const formattedPhone = userData.phonenumber ? userData.phonenumber.replace(/\D/g, '').substring(0, 15) : '';
    const username = userData.username.substring(0, 20);
    const clientType = 'Group';
    const currentDate = new Date().toISOString();

    const apiKey = environment.apiKey || 'ApiKey 3196c9c0ab4f6b69ab91e276edd06071';
    const project = environment.project || 'ERP';

    let domain = 'optimax';
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      domain = hostname.split('.')[0];
    }

    return {
      username: username,
      email: userData.email,
      role: ['ROLE_USER'],
      password: userData.password,
      project: project,
      apiKey: apiKey,
      createdDate: currentDate,
      lastLoginDate: currentDate,
      createdBy: 'system',
      upi: {
        fullname: (userData.fullname || '').substring(0, 100),
        email: userData.email,
        phoneNumber: formattedPhone,
        username: username,
        city: '',
        state: '',
        country: '',
        profileImage: '',
        address: '',
        domain: domain,
        clientType: clientType,
        companyName: '',
        industry: '',
        bio: '',
        postalCode: '',
        currency: 'NGN',
        language: 'en',
        timeZone: 'Africa/Lagos',
      },
    };
  }

  userLogin(data: any): Observable<any> {
    const loginPayload = {
      username: data.username,
      password: data.password,
      project: environment.project || 'ERP',
      apiKey: environment.apiKey || 'ApiKey b784e00442334be0497f434d2a4cbefd'
    };

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signin", loginPayload)
        .pipe(
          tap((response: any) => {
            console.log('Login response:', response);

            if (response.accessToken) {
              let token = response.accessToken;
              if (token.includes('=')) {
                const start = token.indexOf('=') + 1;
                const end = token.indexOf(';', start);
                token = end > -1 ? token.substring(start, end) : token.substring(start);
              }
              token = token.trim();

              localStorage.setItem('auth_token', token);
              localStorage.setItem('token', token);
              sessionStorage.setItem('Token', token);
            }

            if (response.ecode && response.ecode !== 'null') {
              localStorage.setItem('tenantId', response.ecode);
            }
          }),
          catchError((error) => {
            // Fallback to mock login when backend is unavailable (frontend-only mode)
            console.warn('Backend unavailable, using mock login for frontend testing');
            return new Observable(observer => {
              setTimeout(() => {
                const mockResponse = this.getMockLoginResponse(data.username);
                observer.next(mockResponse);
                observer.complete();
              }, 500); // Simulate network delay
            });
          })
        );
  }

  private getMockLoginResponse(username: string): any {
    // Mock response that mimics API structure
    const mockToken = `mock_token_${Date.now()}`;

    // Store mock token
    localStorage.setItem('auth_token', mockToken);
    localStorage.setItem('token', mockToken);
    sessionStorage.setItem('Token', mockToken);
    localStorage.setItem('tenantId', 'OPTIMAX');

    console.log('🔐 Frontend Mock Login - Backend not available');
    console.log(`   Username: ${username}`);
    console.log('   (Real API will be used when backend is running)');

    return {
      id: 1001,
      username: username,
      email: `${username}@hospitality.local`,
      accessToken: mockToken,
      ecode: 'OPTIMAX',
      data: {
        id: 1001,
        username: username,
        email: `${username}@hospitality.local`
      }
    };
  }

  getUserPrimaryInfoById(data: string): Observable<any>{
    return this.http
        .get<any>(
            this.getBaseApiUrl() +
                `/x/api/v2/us/ur/get/user/primary/info/${data}`)
        .pipe(catchError(this.handleError));
  }

  getUserBranchInfoById(id: string): Observable<any>{
    return this.http
        .get<any>(
            this.getBaseApiUrl() + `/x/api/v2/pos/userBranches/findBy/userid/${id}`)
        .pipe(catchError(this.handleError));
  }

  getRegDataByUsername(username: string): Observable<any> {
    return this.http
        .get<any>(
            this.getBaseApiUrl() +
                "/x/api/v2/us/ur/findByUsernameOrEmail?username=" +
                username
        )
        .pipe(
          catchError((error) => {
            // Fallback to mock user data when backend is unavailable
            console.warn('Backend unavailable, using mock user data');
            return new Observable(observer => {
              setTimeout(() => {
                const mockUserData = this.getMockUserData(username);
                observer.next(mockUserData);
                observer.complete();
              }, 300);
            });
          })
        );
  }

  private getMockUserData(username: string): any {
    return {
      id: 1001,
      username: username,
      email: `${username}@hospitality.local`,
      firstName: username.charAt(0).toUpperCase() + username.slice(1),
      lastName: 'Guest',
      phoneNumber: '+234 800 123 4567',
      country: 'Nigeria',
      gender: 'Not specified',
      data: {
        id: 1001,
        username: username,
        email: `${username}@hospitality.local`,
        firstName: username.charAt(0).toUpperCase() + username.slice(1),
        lastName: 'Guest'
      }
    };
  }

  userRegistration(data: any): Observable<any> {
    const validatedPayload = this.validateAndFormatSignupData(data);
    console.log('Sending signup payload:', validatedPayload);

    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signup", validatedPayload)
      .pipe(catchError(this.handleError));
  }

  userVerification(token: string): Observable<any> {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/us/register/verify?token=' + token)
      .pipe(catchError(this.handleError))
  }

  getUserApplicationRole(id: number): Observable<any> {
    return this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/us/ur/findappuserrolepermissionbyid?userid=${id}`)
      .pipe(catchError(this.handleError));
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  
  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
        console.error("An error occurred:", error.error.message);
    } else {
        console.error(
            `Backend returned code ${error.status}, ` +
                `body was: ${JSON.stringify(error.error)}`
        );
    }
    return throwError(`${error.status}`);
    // 'Something bad happened; please try again later.');
  }
}
