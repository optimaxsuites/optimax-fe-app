import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError, of } from 'rxjs';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';
import { environment } from '../environments/environment.prod';

// Development mock token (expires in 2030)
const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwibmFtZSI6IkVzZW9zZSIsImlhdCI6MTcyMjYwMDAwMCwiZXhwIjoxODg4MzcwMzEwfQ.mock_token_for_development';



@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private _apiBaseUrl = (environment as any).apiBaseUrl;
  private readonly tokenStorageKeys = ['Token', 'token', 'accessToken', 'Token2', 'accessToken2'];

  constructor(
    private http: HttpClient, 
    private navigationLink: NavigationLinksService, 
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {  }

  isAuthenticated(): boolean {
    const token = this.getStoredAccessToken();

    if (!token) {
      return false;
    }

    // In development mode, skip JWT validation
    if (environment.env === 'development') {
      console.log('🔧 [Development Mode] Skipping JWT validation');
      return true;
    }

    try {
      if (this.jwtHelper.isTokenExpired(token)) {
        return false;
      }
    } catch {
      return false;
    }

    return true;
  }
  
  logout(): void {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("role");
    sessionStorage.removeItem("fullname");
    sessionStorage.removeItem("email");
    sessionStorage.removeItem("userid");
    localStorage.removeItem("username");
    localStorage.removeItem("role");
    localStorage.removeItem("fullname");
    localStorage.removeItem("email");
    localStorage.removeItem("userid");

    for (const key of this.tokenStorageKeys) {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    }

    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("userPrimaryInfoRegData");
    localStorage.removeItem("userInfoRegData");
    localStorage.removeItem("userRegData");
    localStorage.removeItem("userPrimaryInfoRegData");

    // Employee records cached for the HR screens hold personal data (bank details, NIN, BVN), so
    // they mustn't outlive the session on a shared computer.
    ['employeeInView', 'currentEmployee', 'currentEmployeeUserId'].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });
    Object.keys(localStorage)
      .filter((key) => key.startsWith('offboarding_data_v1') || key.startsWith('employee_offboarded_'))
      .forEach((key) => localStorage.removeItem(key));


    // this.router.navigate([''])
    const loginLink = this.navigationLink.getLink('signinLink')
    this.router.navigate([loginLink]);
  }

  isLoggedIn(): boolean {
    return !!(sessionStorage.getItem('userid') || localStorage.getItem('userid') || this.getStoredAccessToken());
  }


  userLogin(data: any): Observable<any> {
    // Development mode: return mock login response
    if (environment.env === 'development') {
      console.log('🔧 [Development Mode] Using mock login');
      // Store token in storage
      sessionStorage.setItem('Token', MOCK_TOKEN);
      localStorage.setItem('Token', MOCK_TOKEN);

      const mockResponse = {
        id: 1,
        userId: 1,
        username: data.username || 'Eseose',
        email: 'eseose@optimax.com',
        fullName: 'Eseose Developer',
        roles: 'ADMIN',
        token: MOCK_TOKEN
      };

      return of(mockResponse);
    }

    // Production: call real API
    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signin", data)
        .pipe(catchError(this.handleError));
  }

  getUserPrimaryInfoById(data: string): Observable<any>{
    // console.log((this.getBaseApiUrl() + `/x/api/v2/us/ur/get/user/primary/info/${data}`+"---"+JSON.stringify(data)))
    // const url = `${this.getBaseApiUrl()}/x/api/v2/us/ur/get/user/primary/info/${data}`;

    return this.http
        .get<any>(
            this.getBaseApiUrl() +
                `/x/api/v2/us/ur/get/user/primary/info/${data}`)
        .pipe(catchError(this.handleError));
  }

  getRegDataByUsername(username: string): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/us/ur/findByUsernameOrEmail?username="+"---"+JSON.stringify(username)))

    return this.http
        .get<any>(
            this.getBaseApiUrl() +
                "/x/api/v2/us/ur/findByUsernameOrEmail?username=" +
                username
        )
        .pipe(catchError(this.handleError));
  }

  getUsers(): Observable<any> {
    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/us/ur/findAll')
      .pipe(catchError(this.handleError));
  }

  
  userRegistration(data: any): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/auth/signup"+"---"+JSON.stringify(data)))

    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signup", data)
      .pipe(catchError(this.handleError));
  }

  userRegistrationByAdmin(data: any): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/auth/signup"+"---"+JSON.stringify(data)))

    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/us/ur/signup/by/admin", data)
      .pipe(catchError(this.handleError));
  }

  userApplicationRole(data: any): Observable<any> {
    return this.http
      .post<any>(this.getBaseApiUrl() + `/x/api/v2/us/ur/appuserrolepermission`, data)
      .pipe(catchError(this.handleError));
  }

  resetPasswordByAdmin(email: string, newPassword: string): Observable<any> {
    return this.http
      .post(this.getBaseApiUrl() + '/x/api/v2/us/register/resetpassword', { email, password: newPassword }, { responseType: 'text' })
      .pipe(catchError(this.handleError));
  }

  userVerification(token: string): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/us/register/verify?token="+"---"+JSON.stringify(token)))

    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/us/register/verify?token=' + token)
      .pipe(catchError(this.handleError))
  }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  private getStoredAccessToken(): string | null {
    for (const key of this.tokenStorageKeys) {
      const sessionToken = this.normalizeToken(sessionStorage.getItem(key));
      if (sessionToken) {
        return sessionToken;
      }

      const localToken = this.normalizeToken(localStorage.getItem(key));
      if (localToken) {
        return localToken;
      }
    }

    return null;
  }

  private normalizeToken(value: string | null): string | null {
    const rawToken = String(value || '').trim();

    if (!rawToken || rawToken === 'undefined' || rawToken === 'null') {
      return null;
    }

    const cookieMatch = rawToken.match(/=(.*?)(;|$)/);
    if (cookieMatch?.[1]) {
      return cookieMatch[1].trim();
    }

    const bearerMatch = rawToken.match(/^Bearer\s+(.+)$/i);
    if (bearerMatch?.[1]) {
      return bearerMatch[1].trim();
    }

    return rawToken;
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
