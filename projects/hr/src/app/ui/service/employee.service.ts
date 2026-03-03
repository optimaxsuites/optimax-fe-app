import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpContext } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

import { SUPPRESS_ERROR_TOAST } from '../shared-component/service/error-message/error-toast.interceptor';
@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
 baseurl = 'https://be.optimaxsuites.com'
 vettingWebhookUrl = 'https://automation.optimaxsuites.com/webhook/a6eb636c-407e-49e1-9810-ee852b4a2a22'
  constructor(private http: HttpClient) { }

  addEmployee(data: any): Observable<any>{
    return this.http
        .post<any>(
            this.baseurl +
                `/x/api/v2/hr/employees`, data)
        .pipe(catchError(this.handleError));
  }

  updateEmployee(data: any, id: number): Observable<any>{
    return this.http
        .put<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/${id}`, data)
        .pipe(catchError(this.handleError));
  }

  addBulkEmployee(data: {}[]): Observable<any>{
    return this.http
        .post<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/createBatchEmployee`, data)
        .pipe(catchError(this.handleError));
  }

   sendWelcomeEmail(data: any): Observable<any>{
    return this.http
        .post<any>(
             "https://n8n.royalvilletechnologies.com/webhook/6d585766-d7f8-442f-89f0-64d9502d05ac", data)
        .pipe(catchError(this.handleError));
  }


  getAllEmployee(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/employees?page=1&size=1200`)
        .pipe(catchError(this.handleError));
  }


  getEmployeeById(id: number): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/${id}`)
        .pipe(catchError(this.handleError));
  }

  deleteEmployee(id: number | string): Observable<any> {
    return this.http
      .delete<any>(
        this.baseurl +
          `/x/api/v2/hr/employees/${id}`)
      .pipe(catchError(this.handleError));
  }

  
  getSalaryById(id: number): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/salaries/getSalaryByLevel/${id}`)
        .pipe(catchError(this.handleError));
  }

  getAllowanceTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/allowanceTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getBonusTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/bonusTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getDeductionTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/deductionsType/${id}`)
    .pipe(catchError(this.handleError));
  }

  getOverTimeTypeById(id: number){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/overtimeTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  getEmployeeImage(fileName: string){
    return this.http
    .get<any>(
        this.baseurl +
            `/x/api/v2/hr/employees/images/${fileName}`, { responseType: 'blob' as 'json' })
    .pipe(catchError(this.handleError));
  }

  addNOK(data: any) {
    return this.http
    .post<any>(
        this.baseurl +
            `/x/api/v2/hr/nextOfKins`, data)
    .pipe(catchError(this.handleError));
  }


  addGuarantor(data: any) {
    return this.http
    .post<any>(
        this.baseurl +
            `/x/api/v2/hr/guarantors`, data)
    .pipe(catchError(this.handleError));
  }

  sendOnboardingVetting(payload: any): Observable<any> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http
      .post<any>(this.vettingWebhookUrl, payload, { context })
      .pipe(catchError(this.handleError));
  }

  submitGuarantorConfirmation(data: FormData): Observable<any> {
    const context = new HttpContext().set(SUPPRESS_ERROR_TOAST, true);
    return this.http
      .post<any>(this.vettingWebhookUrl, data, { context })
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
    return throwError(() => error);
    // 'Something bad happened; please try again later.');
  }
}
