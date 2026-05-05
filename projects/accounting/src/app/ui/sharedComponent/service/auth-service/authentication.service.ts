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
  ) {  }

  isAuthenticated(): boolean {
    // ✅ FIXED: Now checks all 6 token locations, mirroring Hospitality exactly
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
      apiKey: environment.apiKey || 'ApiKey b784e00442334be0497f434d2a4cbefd'
    };

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signin", loginPayload)
        .pipe(
          tap((response: any) => {
            console.warn('[Optimax Accounting] Login response received:', response);
            
            if (response.accessToken) {
              let token = response.accessToken;
              if (token.includes('=')) {
                const start = token.indexOf('=') + 1;
                const end = token.indexOf(';', start);
                token = end > -1 ? token.substring(start, end) : token.substring(start);
              }
              token = token.trim();

              sessionStorage.setItem('Token', token);
              localStorage.setItem('Token2', token);
              sessionStorage.setItem('token', token);
              localStorage.setItem('token', token);
              sessionStorage.setItem('accessToken', response.accessToken);
              localStorage.setItem('accessToken2', response.accessToken);
            }

            if (response.ecode && response.ecode !== 'null') {
              localStorage.setItem('tenantId', response.ecode);
            }

            const entityId = this.extractEntityId(response);
            if (entityId) {
              sessionStorage.setItem('entityId', entityId);
              localStorage.setItem('entityId', entityId);
              console.log('[Optimax Accounting] Login entityId stored:', entityId);
            }
            
            sessionStorage.setItem('userRegData', JSON.stringify(response));
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