import { Injectable, isDevMode } from "@angular/core";
import { environment } from "../sharedComponent/service/environments/environment";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { catchError, from, map, Observable, throwError } from "rxjs";
import { OrderGET, OrderPOST } from "../models/interfaces/kitchen";

@Injectable({
  providedIn: "root",
})
export class CheckoutService {
  constructor(private http: HttpClient) {}

  processCheckout(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/payments", data)
      .pipe(catchError(this.handleError));
  }

saveOrder(data: OrderPOST): Observable<any> {
   return this.http
      .post<OrderGET>(this.getBaseApiUrl() + "/x/api/v2/pos/orders", data)
      .pipe(catchError(this.handleError));
}



  savePaymentBreakdown(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/paymentBreakdowns", data)
      .pipe(catchError(this.handleError));
  }

  getOrders() {
    return this.http
      .get<OrderGET[]>(this.getBaseApiUrl() + "/x/api/v2/pos/orders")
      .pipe(catchError(this.handleError));
  }

  makePayment(data: any) {
    return this.http
      .post<any>(this.getBaseApiUrl() + "/x/api/v2/pos/payments", data)
      .pipe(catchError(this.handleError));
  }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  // **UPDATED** to throw the full HttpErrorResponse object
  private handleError(error: HttpErrorResponse) {
    console.log(error)
    return throwError(() => error); // <-- Throw the full error object
  }
}