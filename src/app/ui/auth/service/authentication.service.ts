import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { Router } from '@angular/router';



@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private _apiBaseUrl = (environment as any).apiBaseUrl;

  constructor(private http: HttpClient, private navigationLink: NavigationLinksService, private router: Router) {  }
  
  logout(): void {
    sessionStorage.removeItem("username");
    sessionStorage.removeItem("token");

    //added by yomi
    sessionStorage.removeItem("userInfoRegData");
    sessionStorage.removeItem("userRegData");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userid");
    // this.router.navigate([''])
    const loginLink = this.navigationLink.getLink('signinLink')
    this.router.navigate([loginLink]);
}

isLoggedIn(): boolean {
  return !!sessionStorage.getItem('userid');
}


  userLogin(data: any): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/auth/sigin"+"---"+JSON.stringify(data)))

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signin", data)
        .pipe(catchError(this.handleError));
  }

  getRegDataByUsername(username: string): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/us/ur/findByUsernameOrEmail?username="+"---"+JSON.stringify(username)))

    return this.http
        .get<any>(
            this.getBaseApiUrl() +
                "/x/api/v2/us/ur/findByUsernameOrEmail?username=" +
                username
        )
        .pipe(catchError(this.handleError));
  }

  
  userRegistration(data: any): Observable<any> {
    // console.log((this.getBaseApiUrl() + "/x/api/v2/auth/signup"+"---"+JSON.stringify(data)))

    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/auth/signup", data)
        .pipe(catchError(this.handleError));
  }

  userVerification(token: string): Observable<any> {
    console.log((this.getBaseApiUrl() + "/x/api/v2/us/register/verify?token="+"---"+JSON.stringify(token)))

    return this.http
    .get<any>(this.getBaseApiUrl() + '/x/api/v2/us/register/verify?token=' + token)
    .pipe(catchError(this.handleError))
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
