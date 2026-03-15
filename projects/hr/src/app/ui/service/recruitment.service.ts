import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { environment } from '../shared-component/service/environments/environment.prod';
import { catchError, Observable, throwError } from 'rxjs';
import { JobPostingCustomFieldDTO, JobPostingDTO } from '../domain/job.dto';

@Injectable({
  providedIn: 'root'
})
export class RecruitmentService {

  constructor(private http: HttpClient ) { }
  private getBaseApiUrl(): string {
    return isDevMode() ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

  getJobCategories(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/jobCategories")
    .pipe(catchError(this.handleError));
  }

  addJobCategory(data: { name: string; code: string; description: string }): Observable<any>{
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobCategories`, data)
        .pipe(catchError(this.handleError));
  }

  getJobTypes(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/jobTypes")
    .pipe(catchError(this.handleError));
  }

  addJobType(data: { name: string; code: string; description: string }): Observable<any>{
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobTypes`, data)
        .pipe(catchError(this.handleError));
  }

  getJobVacancyExperiences(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/jobVacancyExperiences")
    .pipe(catchError(this.handleError));
  }

  addJobVacancyExperience(data: { name: string; code: string; description: string }): Observable<any>{
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobVacancyExperiences`, data)
        .pipe(catchError(this.handleError));
  }

  getJobVacancyQualifications(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/jobVacancyQualifications")
    .pipe(catchError(this.handleError));
  }

  addJobVacancyQualification(data: { name: string; code: string; description: string }): Observable<any>{
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobVacancyQualifications`, data)
        .pipe(catchError(this.handleError));
  } 

  getJobVacancySpecifications(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/jobVacancySpecifications")
    .pipe(catchError(this.handleError));
  }

  addJobVacancySpecification(data: { name: string; code: string; description: string }): Observable<any>{
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobVacancySpecifications`, data)
        .pipe(catchError(this.handleError));
  }

  addJobVacncyCustomFieldss(data: JobPostingCustomFieldDTO): Observable<any>{
    console.log("service", data)
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobVacancyCustomFieldss`, data)
        .pipe(catchError(this.handleError));
  }
  
  getCustomFieldById(id: number){
    return this.http
    .get<any>(this.getBaseApiUrl() + `/x/api/v2/hr/jobVacancyCustomFieldss/${id}`)
    .pipe(catchError(this.handleError));
  }

  addJobVacancy(data: JobPostingDTO): Observable<any>{
    console.log("saving jobVacancies", data)
    return this.http
        .post<any>(
          this.getBaseApiUrl() +
                `/x/api/v2/hr/jobVacancies`, data)
        .pipe(catchError(this.handleError));
  }
  getJobVacancies(){
    return this.http
    .get<any>(this.getBaseApiUrl() + "/x/api/v2/hr/jobVacancies")
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
