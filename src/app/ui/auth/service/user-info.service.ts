import { Injectable, isDevMode } from '@angular/core';
import { environment } from 'src/environments/environment.prod';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';
import { Router } from '@angular/router';
import { catchError, Observable, throwError } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class UserInfoService {
  constructor(private http: HttpClient, private navigationLink: NavigationLinksService, private router: Router) { }

  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }


    token = sessionStorage.getItem("Token");



  

  saveBasicInfo(data: any){
    console.log(this.token)
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.token}`
    });
    return this.http
    .post<any>(this.getBaseApiUrl() + "/x/api/v2/us/ur/create/user/primary/info", data, {
      headers: headers
    })
    .pipe(catchError(this.handleError));
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
