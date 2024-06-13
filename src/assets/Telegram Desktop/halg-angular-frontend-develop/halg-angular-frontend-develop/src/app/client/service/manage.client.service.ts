import { Injectable, isDevMode} from '@angular/core';
import { HttpClient, HttpHeaders, HttpRequest } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { PersonalData } from '../domain/client.data';
import { environment } from '../../../environments/environment';
import { AssessmentResponses } from 'src/app/administration/domain/assessments.data';


@Injectable({
  providedIn: 'root'
})
export class ManageClientService {

  constructor(private http: HttpClient) { }


  createClient(data): Observable<any>{

    return this.http.post<PersonalData>(this.getBaseApiUrl()+'postclinicalregistration',data);
  }

  createNextOfKin(data): Observable<any>{

    return this.http.post<any>(this.getBaseApiUrl()+'postnextofkin',data);
  }
  createclinicvisit(data): Observable<any>{

    return this.http.post<any>(this.getBaseApiUrl()+'postclinicalservices',data);
  }

    getClient():Observable<any>{
      return this.http.get<PersonalData>(this.getBaseApiUrl()+'listclinicalregistration');
    }

   
    updateClient(data){
      return this.http.post<PersonalData>(this.getBaseApiUrl()+'postclinicalregistration',data);
    }
    getClients() {
      return this.http.get<any>(`${environment.apiBaseUrl}`+'listclinicalregistration')
      .toPromise()
      .then(res => res.data as PersonalData)
      .then(data => data);
  }

  createUpdateAssessmentResponses(data): Observable<any>{
    return this.http.post<AssessmentResponses>(`${environment.apiBaseUrl}`+'postassessmentresponses',data);
  }

  getAssessmentResponses(clientID: string):Observable<any>{
      return this.http.get<AssessmentResponses>(this.getBaseApiUrl()+'listassessmentresponses?client_unique_identifier='+clientID);
    }

  createGenericInstance(data): Observable<any>{
    return this.http.post<any>(`${environment.apiBaseUrl}`+'insertdynamictabledata',data).pipe(catchError(this.handleError));
  }

  updateGenericInstance(data): Observable<any>{
    return this.http.post<any>(`${environment.apiBaseUrl}`+'updatedynamictabledata',data);
  }
  removeGenericInstancex(data): Observable<any>{
    return this.http.delete<any>(`${environment.apiBaseUrl}`+'removedynamictabledata',data);
  }

  removeGenericInstance(data): Observable<any>{
    return this.http.request(new HttpRequest('DELETE', `${environment.apiBaseUrl}`+'removedynamictabledata').clone({body: data}));
  }

  getProgramServiceData(hospital_number: string,formName:string):Observable<any>{
    return this.http.get<any[]>(this.getBaseApiUrl()+'listdynamicdata?clientIdentifier='+hospital_number+'&formName='+formName);
  }



  

  private getBaseApiUrl(): string {
    return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
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













