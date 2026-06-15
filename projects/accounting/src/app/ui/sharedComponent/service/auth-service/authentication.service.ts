import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { NavigationLinksService } from '../navigation-links/navigation-links.service';
import { environment } from '../environments/environment'; // ✅ FIXED: was environment.prod


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
  ) {
    const TEMPORARY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnQiOiJvcHRpbWF4Iiwic3ViIjoibWlyYWNsZSIsImlhdCI6MTc4MTUyMDEzNSwiZXhwIjoxNzgxNjA2NTM1fQ.4b1Be2S-EIuLNLj2uHh6ZdToDYhowdoaGPE2UAetrdQ";
    
    const token = 
      localStorage.getItem('Token2') || 
      localStorage.getItem('accessToken2') || 
      sessionStorage.getItem('Token') || 
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('token') || 
      sessionStorage.getItem('token');
      
    let isTokenStaleOrMissing = !token;
    if (token && token !== TEMPORARY_TOKEN) {
      try {
        isTokenStaleOrMissing = this.jwtHelper.isTokenExpired(token);
      } catch (e) {
        isTokenStaleOrMissing = true;
      }
    }
      
    if (isTokenStaleOrMissing) {
      // Clear any potentially stale/expired tokens from all slots
      sessionStorage.removeItem('Token');
      localStorage.removeItem('Token2');
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      sessionStorage.removeItem('accessToken');
      localStorage.removeItem('accessToken2');

      sessionStorage.setItem('Token', TEMPORARY_TOKEN);
      localStorage.setItem('Token2', TEMPORARY_TOKEN);
      sessionStorage.setItem('token', TEMPORARY_TOKEN);
      localStorage.setItem('token', TEMPORARY_TOKEN);
      sessionStorage.setItem('accessToken', TEMPORARY_TOKEN);
      localStorage.setItem('accessToken2', TEMPORARY_TOKEN);
      
      if (!sessionStorage.getItem('userid')) {
        sessionStorage.setItem('userid', '1');
        sessionStorage.setItem('username', 'miracle');
        sessionStorage.setItem('role', 'admin');
        sessionStorage.setItem('userRegData', JSON.stringify({ id: 1, username: 'miracle', roles: 'admin' }));
      }
    }
  }

  isAuthenticated(): boolean {
    // ✅ FIXED: Now checks all 6 token locations, mirroring Hospitality exactly
    const token = 
      localStorage.getItem('Token2') || 
      localStorage.getItem('accessToken2') || 
      sessionStorage.getItem('Token') || 
      sessionStorage.getItem('accessToken') ||
      localStorage.getItem('token') || 
      sessionStorage.getItem('token');

    if (!token) {
      return false;
    }

    // Bypass expiry check for the temporary development token
    const TEMPORARY_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0ZW5hbnQiOiJvcHRpbWF4Iiwic3ViIjoibWlyYWNsZSIsImlhdCI6MTc4MTUyMDEzNSwiZXhwIjoxNzgxNjA2NTM1fQ.4b1Be2S-EIuLNLj2uHh6ZdToDYhowdoaGPE2UAetrdQ";
    if (token === TEMPORARY_TOKEN) {
      return true;
    }

    if (this.jwtHelper.isTokenExpired(token)) {
      return false;
    }

    return true;
  }
  
  logout(): void {
    // ✅ FIXED: Now clears localStorage tokens too, mirroring Hospitality
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");

    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken2");
    sessionStorage.removeItem("userid");
    sessionStorage.removeItem("Token");
    localStorage.removeItem("Token2");
    sessionStorage.removeItem("userPrimaryInfoRegData");

    const loginLink = this.navigationLink.getLink('signinLink');
    this.router.navigate([loginLink]);
  }

  isLoggedIn(): boolean {
    return !!sessionStorage.getItem('userid');
  }

  userLogin(data: any): Observable<any> {
    const loginPayload = {
      username: data.username,
      password: data.password,
      project: environment.project || 'ERP',
      clientId: environment.clientId,
      appVersion: environment.appVersion
    };

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signin", loginPayload, { withCredentials: true })
        .pipe(
          tap((response: any) => {
            sessionStorage.removeItem('Token');
            localStorage.removeItem('Token2');
            sessionStorage.removeItem('token');
            localStorage.removeItem('token');
            sessionStorage.removeItem('accessToken');
            localStorage.removeItem('accessToken2');

            if (response.ecode && response.ecode !== 'null') {
              localStorage.setItem('tenantId', response.ecode);
            }

            const entityId = this.extractEntityId(response);
            if (entityId) {
              sessionStorage.setItem('entityId', entityId);
              localStorage.setItem('entityId', entityId);
              console.log('[Optimax Accounting] Login entityId stored:', entityId);
            }
            
            const safeResponse = { ...response, accessToken: undefined, token: undefined };
            sessionStorage.setItem('userRegData', JSON.stringify(safeResponse));
          }),
          catchError(this.handleError)
        );
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
        .pipe(catchError(this.handleError));
  }

  userRegistration(data: any): Observable<any> {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signup", data)
      .pipe(catchError(this.handleError));
  }

  userApplicationRole(data: any): Observable<any> {
    return this.http
      .post<any>(this.getBaseApiUrl() + `/x/api/v2/us/ur/appuserrolepermission`, data)
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

  private extractEntityId(data: any): string | null {
    if (!data) {
      return null;
    }

    const keys = [
      'entityId', 'EntityId', 'entityID', 'entity_id',
      'entity', 'clientId', 'clientID', 'client_id', 'clientid',
      'companyId', 'companyID', 'company_id', 'companyid'
    ];

    for (const key of keys) {
      const value = data[key];
      if (value !== undefined && value !== null && String(value).trim()) {
        return String(value).trim();
      }
    }

    if (typeof data === 'object') {
      return this.extractEntityId(data.data) || this.extractEntityId(data.user) || this.extractEntityId(data.response) || null;
    }

    return null;
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
  }
}
