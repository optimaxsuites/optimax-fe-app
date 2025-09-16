import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from 'src/environments/environment.prod';
import { NavigationLinksService } from '../../shared/service/navigation-links/navigation-links.service';

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
 private _apiBaseUrl = (environment as any).apiBaseUrl;

  constructor(
    private http: HttpClient, 
    private navigationLink: NavigationLinksService, 
    private router: Router,
    private jwtHelper: JwtHelperService
  ) {  }
    createOrderRecord(order: any): Observable<any> {
      return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionOrders", order)
        .pipe(catchError(this.handleError));
    }

    getOrderRecord(): Observable<any> {
      return this.http
        .get<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionOrders")
        .pipe(catchError(this.handleError));
    }

    createPaymentRecord(payment: any): Observable<any> {
      return this.http
        .post<any>(this.getBaseApiUrl() + "/x/api/v2/sub/subscriptionPayments", payment)
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
