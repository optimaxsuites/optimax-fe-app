import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from './environments/environment.prod';


@Injectable({
  providedIn: 'root'
})
export class AppRegisterServiceService {



  private _apiBaseUrl = (environment as any).apiBaseUrl;

  constructor(
    private http: HttpClient, 
  
  ) {  }



  getRegisteredApp(): Observable<any> {
    return this.http
        .get<any>(this.getBaseApiUrl() + "/x/api/v2/us/modules")
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
