import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { employeeDTO, LevelDTO } from '../domain/employee.dto';
@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
 baseurl = 'https://be.optimaxsuites.com'
  constructor(private http: HttpClient) { }

  addEmployee(data: employeeDTO): Observable<any>{
    return this.http
        .post<any>(
            this.baseurl +
                `/x/api/v2/hr/employees`, data)
        .pipe(catchError(this.handleError));
  }

  getAllEmployee(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/employees`)
        .pipe(catchError(this.handleError));
  }


  getEmployeeById(id: number): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/employees/${id}`)
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
