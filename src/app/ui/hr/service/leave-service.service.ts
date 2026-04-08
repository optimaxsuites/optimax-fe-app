import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';


@Injectable({
  providedIn: 'root'
})
export class LeaveServiceService {

  constructor(private http: HttpClient, ) { }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  getEmployees(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/us/ur/findAllUserPrimaryInformation")
    .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'An unknown error occurred!';
      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = `Error: ${error.error.message}`;
      } else {
        // Server-side error
        if (error.status === 500) {
          errorMessage = 'Server error: ' + error.error.message || 'Check form details and try again.';
        } else if (error.status === 404) {
          errorMessage = 'Resource not found. Please try again.';
        } else if (error.status === 0) {
          errorMessage = 'Unable to connect to the server. Please check your internet connection.';
        } else {
          errorMessage = error.error.message || 'An unexpected error occurred.';
        }
      }
      return throwError(() => errorMessage);
  }
}
