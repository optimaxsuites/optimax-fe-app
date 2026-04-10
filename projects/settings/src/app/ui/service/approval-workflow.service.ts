import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../sharedComponents/service/environments/environment.prod';
import { catchError, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApprovalWorkflowService {
 private baseUrl = environment.apiBaseUrl;
  
  constructor(private http: HttpClient) {}

   createWorkflow(payload: any){
      return this.http
      .post<any>(this.baseUrl + `/x/api/v2/workflow/approvals`, payload)
      .pipe(catchError(this.handleError));
    }

    getWorkflows(){
      return this.http
      .get<any>(this.baseUrl + `/x/api/v2/workflow/approvals`)
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
          errorMessage =
            'Server error: ' + error.error.message ||
            'Check form details and try again.';
        } else if (error.status === 404) {
          errorMessage = 'Resource not found. Please try again.';
        } else if (error.status === 0) {
          errorMessage =
            'Unable to connect to the server. Please check your internet connection.';
        } else {
          errorMessage = error.error.message || 'An unexpected error occurred.';
        }
      }
      return throwError(() => errorMessage);
    }
}
