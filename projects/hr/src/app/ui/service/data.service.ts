import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { catchError, Observable, throwError } from 'rxjs';

import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { LevelDTO } from '../domain/employee.dto';
@Injectable({
  providedIn: 'root'
})
export class DataService {

  baseurl = 'https://be.optimaxsuites.com'
  constructor(private http: HttpClient) { }

  getReligion(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/religions`)
        .pipe(catchError(this.handleError));
  }


  getRelationship(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/relationships`)
        .pipe(catchError(this.handleError));
  }


  getMaritalStatus(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/maritalStatuses`)
        .pipe(catchError(this.handleError));
  }


  getLeaveTypes(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/leaveTypes`)
        .pipe(catchError(this.handleError));
  }


  getGender(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/genders`)
        .pipe(catchError(this.handleError));
  }

  getDepartment(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/departments`)
        .pipe(catchError(this.handleError));
  }
  getJobType(): Observable<any>{
    return this.http
        .get<any>(
            this.baseurl +
                `/x/api/v2/hr/jobTypes`)
        .pipe(catchError(this.handleError));
  }

  getAllLevels(){
    return this.http
    .get<any>(this.baseurl + "/x/api/v2/hr/levels")
    .pipe(catchError(this.handleError));
  }

  getLevelById(id: number){
    return this.http
    .get<any>(this.baseurl + `/x/api/v2/hr/levels/${id}`)
    .pipe(catchError(this.handleError));
  }

  addLevel(data: LevelDTO){
    return this.http
    .post<any>(this.baseurl + `/x/api/v2/hr/levels`, data)
    .pipe(catchError(this.handleError));
  }
 
  updateLevelById(id: number|undefined, data: LevelDTO){
    return this.http
    .put<any>(this.baseurl + `/x/api/v2/hr/levels/${id}`, data)
    .pipe(catchError(this.handleError));
  }

  deleteLevel(id: number|undefined){
    return this.http
    .delete<any>(this.baseurl+ `/x/api/v2/hr/levels/${id}`)
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
