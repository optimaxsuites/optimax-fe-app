import { Injectable, isDevMode } from '@angular/core';
import { environment } from '../../../environments/environment.prod';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private _apiBaseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) { }

  // public RegistrationMultiForm: any = {};

  userLogin(data: any): Observable<any> {
    return this.http
        .post<any>(`${this._apiBaseUrl}/auth/signin`, data)
        .pipe(catchError(this.handleError));
  }
  userRegistration(data: any): Observable<any> {
    return this.http
        .post<any>(`${this._apiBaseUrl}/auth/signup`, data)
        .pipe(catchError(this.handleError));
  }














  // private getBaseApiUrl(): string {
  //   return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  // }

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
