import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { VendorDto } from '../domain/vendor.dto';
import { environment } from '../sharedComponent/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class MailerServiceService {
  private readonly mailEndpoint = environment.optimaxMailEndpoint;

  constructor(private http: HttpClient) {}

  sendMail(body: {
    name: string;
    recieverEmail: string;
    subject: string;
    body: string;
  }): Observable<any> {
    return this.http
      .post<any>(this.mailEndpoint, body, {
        headers: new HttpHeaders({
          'Content-Type': 'application/json',
          'x-api-key': environment.optimaxApiKey,
        }),
      })
      .pipe(
        catchError((error) => {
          console.error('Email failed', error);
          return throwError(() => error);
        }),
      );
  }
}
