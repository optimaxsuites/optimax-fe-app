import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { SalaryDTO, AllowanceDTO, BonusDTO, DeductionsDTO, OvertimeDTO } from '../domain/salary.dto';
import { environment } from '../sharedComponents/service/environments/environment.prod';
import { LevelDTO } from '../domain/level.dto';

@Injectable({
  providedIn: 'root'
})
export class LevelService {

  constructor(private http: HttpClient, ) { }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
  getAllLevels(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/levels?page=1&size=1000")
    .pipe(catchError(this.handleError));
  }

  getLevelById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/levels/${id}`)
    .pipe(catchError(this.handleError));
  }

  addLevel(data: LevelDTO){
    return this.http
    .post<any>(this.getBaseApiUrl() + `/x/api/v2/hr/levels`, data)
    .pipe(catchError(this.handleError));
  }
 
  updateLevelById(id: number|undefined, data: LevelDTO){
    return this.http
    .put<any>(this.getBaseApiUrl() + `/x/api/v2/hr/levels/${id}`, data)
    .pipe(catchError(this.handleError));
  }

  deleteLevel(id: number|undefined){
    return this.http
    .delete<any>(this.getBaseApiUrl() + `/x/api/v2/hr/levels/${id}`)
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
