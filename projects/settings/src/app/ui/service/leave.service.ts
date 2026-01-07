import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { LevelDTO } from '../domain/level.dto';
import { environment } from '../sharedComponents/service/environments/environment.prod';
import { LeaveAllocationDTO, LeaveDTO, LeaveTypeDTO } from '../domain/leave.dto';

@Injectable({
  providedIn: 'root'
})
export class LeaveService {

  constructor(private http: HttpClient, ) { }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  getAllLeave(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/leaves")
    .pipe(catchError(this.handleError));
  }

  getLeaveById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaves/${id}`)
    .pipe(catchError(this.handleError));
  }

  addLeave(data: LeaveDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaves`, data)
    .pipe(catchError(this.handleError));
  }

  deleteLeave(id: number){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaves/${id}`)
    .pipe(catchError(this.handleError));
  }

  getAllLeaveType(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/leaveTypes")
    .pipe(catchError(this.handleError));
  }

  getLeaveTypeById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveTypes/${id}`)
    .pipe(catchError(this.handleError));
  }

  addLeaveType(data: LeaveTypeDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveTypes`, data)
    .pipe(catchError(this.handleError));
  }

  addLeaveAllocation(data: LeaveAllocationDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveAllocations`, data)
    .pipe(catchError(this.handleError));
  }
  updateLeaveAllocation(id:number | undefined, data: LeaveAllocationDTO){
    return this.http
    .put<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveAllocations/${id}`, data)
    .pipe(catchError(this.handleError));
  }

  deleteLeaveAllocation(id:number | undefined, data: LeaveAllocationDTO){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveAllocations/${id}`)
    .pipe(catchError(this.handleError));
  }

  getLeaveAllocationById(id:number | undefined){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveAllocations/${id}`)
    .pipe(catchError(this.handleError));
  }

  deleteLeaveType(id: number|undefined){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveTypes/${id}`)
    .pipe(catchError(this.handleError));
  }


  updateLeaveType(id: number|undefined, data:LeaveTypeDTO){
    return this.http
    .put<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveTypes/${id}`, data)
    .pipe(catchError(this.handleError));
  }


  getLeaveByLevel(id: number | undefined){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveAllocations/getLeaveByLevel/${id}`)
    .pipe(catchError(this.handleError));
  }
  deleteLeavesByLevel(id: number | undefined){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/leaveAllocations/${id}`)
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
