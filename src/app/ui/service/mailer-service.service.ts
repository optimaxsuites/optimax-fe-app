import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../assets/env';
import { catchError, Observable, throwError } from 'rxjs';
import { VendorDto } from '../domain/vendor.dto';

@Injectable({
  providedIn: 'root',
})
export class MailerServiceService {
  private readonly mailEndpoint = environment.optimaxMailEndpoint;

  constructor(private http: HttpClient) {}

  sendVendorLoginEmail(vendor: VendorDto, password: string): Observable<any> {
    const payload = {
      name: vendor.companyProfile.legalName,
      recieverEmail: vendor.companyProfile.companyEmail,
      subject: 'Welcome',
      body: `Hello ${vendor.companyProfile.legalName},

        Your vendor account has been created successfully.

        Login credentials:
        Email: ${vendor.companyProfile.companyEmail}
        Password: ${password}

        Please login to the vendor portal and complete your registration.

        Regards,
        Procurement Team`,
    };

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-api-key': environment.optimaxApiKey,
    });

    return this.http.post(this.mailEndpoint, payload, { headers }).pipe(
      catchError((error) => {
        console.error('Email failed', error);
        return throwError(() => error);
      }),
    );
  }
}
