import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';   


// damilola worked on this: normalized token handling to stabilize login and dashboard redirects.
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
    return !!sessionStorage.getItem('userid') || !!localStorage.getItem('userid');
  }
  
  logout(): void {

    sessionStorage.removeItem("username");
    sessionStorage.removeItem("token");

    //added by yomi
    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userid");
    sessionStorage.removeItem("Token");
    sessionStorage.removeItem("userPrimaryInfoRegData");
    localStorage.removeItem("Token");
    localStorage.removeItem("Token2");
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("accessToken2");
    localStorage.removeItem("tenantId");
    localStorage.removeItem("postLoginRedirect");
        const storedRole = sessionStorage.getItem("userApplicationRole");
          if (storedRole) {
            console.log("Removing invalid userApplicationRole from sessionStorage");
            sessionStorage.removeItem("userApplicationRole");
          } 
    sessionStorage.removeItem("tenantId");
    sessionStorage.removeItem("postLoginRedirect");

    // this.router.navigate([''])
    const loginLink = this.navigationLink.getLink('signinLink')
    this.router.navigate([loginLink]);
  }

  isLoggedIn(): boolean {
  return this.isAuthenticated();
  }


  userLogin(data: any): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/auth/sigin"+"---"+JSON.stringify(data)))

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signin", data, { withCredentials: true })
        .pipe(catchError(this.handleError));
  }

  userWithLogin(data: any): Observable<any> {
    return this.http
        .post<any>(this.getBaseApiUrl() + `/x/api/v2/auth/esignin`, {
          eCode: data.eCode,
          clientId: data.clientId,
          appVersion: data.appVersion,
        }, { withCredentials: true })
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

  getUserBranchInfoById(id: string): Observable<any>{
    return this.http
        .get<any>(
            this.getBaseApiUrl() + `/x/api/v2/pos/userBranches/findBy/userid/${id}`)
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

  getUserApplicationRole(id: number): Observable<any> {

    return this.http
      .get<any>(this.getBaseApiUrl() + `/x/api/v2/us/ur/findappuserrolepermissionbyid?userid=${id}`)
      .pipe(catchError(this.handleError));
  }
  
  userRegistration(data: any): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/auth/signup"+"---"+JSON.stringify(data)))

    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signup", data)
      .pipe(catchError(this.handleError));
  }

  userVerification(token: string): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/us/register/verify?token="+"---"+JSON.stringify(token)))

    return this.http
      .get<any>(this.getBaseApiUrl() + '/x/api/v2/us/register/verify?token=' + token)
      .pipe(catchError(this.handleError))
  }

  changePassword(username: string, oldPassword: string, newPassword: string): Observable<any> {
    const payload = JSON.stringify({ username, oldPassword, newPassword });
    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/us/ur/changepassword', payload, {
        headers: { 'Content-Type': 'application/json' },
        withCredentials: true,
      })
      .pipe(catchError(this.handleError));
  }

  requestPasswordReset(email: string): Observable<any> {
    const payload = {
      email,
      project: environment.project || 'ERP',
    };

    return this.http
      .post<any>(this.getBaseApiUrl() + '/x/api/v2/us/register/resetpasswordlink', payload)
      .pipe(catchError(this.handleError));
  }


  checkIfDomainExists(domain: string): Observable<any> {
     const url = this.getBaseApiUrl() + `/x/api/v2/us/ur/get/tenant/domain/${domain}`;

     if (domain && domain.trim() === 'optimax') {
       return of(true);
     }

    return this.http.get<any>(url).pipe(
      map(res => {
        return res && res.id === null ? false : true;
      }),
      catchError(() => of(true))
    );
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
