import { Injectable } from '@angular/core';
import { environment } from '../shared-component/environments/environment';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MailNotificationService {
    private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error("An error occurred:", error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, body was: ${JSON.stringify(error.error)}`
      );
    }
    return throwError(() => error);
  }

   sendMail(body: any): Observable<any> {
    return this.http.post(`https://automation.optimaxsuites.com/webhook/735f4d81-3f63-4390-9b03-098be2a31469`, body)
      .pipe(catchError(this.handleError));
  }

}