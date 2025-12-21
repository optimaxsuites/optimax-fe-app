import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';



@Injectable({
  providedIn: 'root'
})
export class MarketplaceService {
  private _apiBaseUrl = (environment as any).apiBaseUrl;

  constructor(
    private http: HttpClient, 
    private navigationLink: NavigationLinksService, 
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {  }



  registerApp(data: any): Observable<any> {
    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/us/modules", data)
        .pipe(catchError(this.handleError));
  }

  getRegisteredApp(): Observable<any> {
    return this.http
        .get<any>(this.getBaseApiUrl() + "/x/api/v2/us/modules")
        .pipe(catchError(this.handleError));
  }

  registerSubApp(data: any): Observable<any> {
    return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/us/ur/appregister", data)
        .pipe(catchError(this.handleError));
  }

  getApps(): Observable<any> {
    return this.http
        .get<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionModules")
        .pipe(catchError(this.handleError));
  }

  getAppById(id: any): Observable<any> {
    return this.http
        .get<any>(this.getBaseApiUrl() + `/x/api/v2/sub/subscriptionModules/${id}`)
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

  createModule(body: any) {
  return this.http.post(
   this.getBaseApiUrl() + '/x/api/v2/sub/subscriptionModules',
    body,
  );
}

createLimit(body: any) {
  return this.http.post(
   this.getBaseApiUrl() +  '/x/api/v2/sub/subscriptionLimit',
    body,
  );
}

}
