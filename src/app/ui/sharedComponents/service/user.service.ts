import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { catchError, Observable, throwError } from 'rxjs';
import { environment } from './environments/environment.prod';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(
     private http: HttpClient, 
   
   ) {  }

   getUsers(): Observable<any> {
       return this.http
         .get<any>(this.getBaseApiUrl() + '/x/api/v2/us/ur/findAll')
         .pipe(catchError(this.handleError))
     }

    deleteUsers(id: number): Observable<any> {
       return this.http
         .delete<any>(this.getBaseApiUrl() + `/x/api/v2/us/ur/deleteuser?id=${id}`)
         .pipe(catchError(this.handleError))
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
