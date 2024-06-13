import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ClientExtendedInfo } from 'src/app/client/domain/client.portal.data';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KPDatavisualization {
  public clinicalRegistrationPVTData: any[] = [];

  constructor(private http: HttpClient) { }


  getClientExtendedInfo(periodInDays: number): Observable<any> {
    return this.http.get<ClientExtendedInfo>(`${environment.apiBaseUrl}` + 
    'listclinicalregistrationsbydays?periodInDays='+periodInDays).pipe(catchError(this.handleError));
  }
  getProgramServiceDataDVT(formName:string):Observable<any>{
    return this.http.get<any[]>(`${environment.apiBaseUrl}`+'listdynamicdatapvt?formName='+formName).pipe(catchError(this.handleError));
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
