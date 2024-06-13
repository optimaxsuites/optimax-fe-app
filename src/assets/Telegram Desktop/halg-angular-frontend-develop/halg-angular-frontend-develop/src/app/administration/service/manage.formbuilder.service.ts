import { HttpClient, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { Injectable } from '@angular/core';
import { FormBuilderData } from '../domain/formbuilder.data';
import { environment } from 'src/environments/environment';
import { catchError } from 'rxjs/operators';


@Injectable({
  providedIn: 'root'
})
export class FormBuilderService {

  constructor(private http: HttpClient) { }
  
  saveFormProgramStage(data): Observable<any>{
    return this.http.post<FormBuilderData>(`${environment.apiBaseUrl}`+'postprogramstagesforms',data).pipe(catchError(this.handleError));;
  }

  saveFormAttribute(data): Observable<any>{
    return this.http.post<any>(`${environment.apiBaseUrl}`+'postdynamictables',data).pipe(catchError(this.handleError));;
  }

  listFormProgramAttribute(formName: string): Observable<any>{
    return this.http.get<any>(`${environment.apiBaseUrl}`+'listdynamictablecolumns?formName='+formName).pipe(catchError(this.handleError));;
  }

  dropcreateFormProgramAttribute(data): Observable<any>{
    let deleteReq = new HttpRequest('DELETE', `${environment.apiBaseUrl}`+'removedynamictable?formName='+data);//.clone({body: data})
    return this.http.request(deleteReq).pipe(catchError(this.handleError));
  }



  private handleError(error: HttpErrorResponse) {
    if (error.error instanceof ErrorEvent) {
      console.error('An error occurred:', error.error.message);
    } else {
      console.error(
        `Backend returned code ${error.status}, ` +
        `body was: ${JSON.stringify(error.error)}`);
    }
    return throwError(
      `${error.status}`);
     // 'Something bad happened; please try again later.');
  }
}
