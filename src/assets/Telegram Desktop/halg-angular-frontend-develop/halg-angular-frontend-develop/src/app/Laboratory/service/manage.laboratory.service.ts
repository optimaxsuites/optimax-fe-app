import { Inject, Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { LaboratoryData, ResultData, ResultVerificationData, SpecimenData } from '../domain/laboratory.data';


@Injectable({
  providedIn: 'root'
})
export class ManageLaboratoryService {

  public laboratoryInfoService: LaboratoryData[]=[];
  public papi: number;
  public selectedClients: LaboratoryData;

  constructor(private http: HttpClient) { }

  getLaboratoryExtendedInfo(userId: string): Observable<any> {
    return this.http.get<LaboratoryData>(this.getBaseApiUrl() + 'listtestsordered?userId=' + userId).pipe(catchError(this.handleError));
  }

  getLaboratoryTestInfo(hospital_number: string): Observable<any> {
    return this.http.get<LaboratoryData[]>(this.getBaseApiUrl() + 'listclinicallabtests?client_unique_identifier=' + hospital_number);
  }

  //Specimen Method
  postSpecimen(data): Observable<any> {
    return this.http.post<SpecimenData>(this.getBaseApiUrl() + 'postspecimencollections', data);
  }

  getSpecimen(): Observable<any> {
    return this.http.get<SpecimenData[]>(this.getBaseApiUrl() + 'listspecimencollections');
  }



  postLaboratoryResult(data): Observable<any> {
    return this.http.post<ResultData>(this.getBaseApiUrl() + 'postclinicallabtestresults', data);
  }

  postResultVerification(data): Observable<any> {
    return this.http.post<ResultVerificationData>(this.getBaseApiUrl() + 'postclinicalverifiedlabresult', data);
  }

  getLaboratoryResult(laboratory_test_id: number): Observable<any> {
    return this.http.get<ResultData[]>(this.getBaseApiUrl() + 'listclinicallabtestresults?testId=' + laboratory_test_id);
  }


  getClientExtendedInfox(userId: string) {
    return this.http.get<any>(this.getBaseApiUrl() + 'listtestsordered?userId=' + userId)
    .toPromise();
   // .then(res => <ClientExtendedInfo[]> res.data)
   // .then(data => { return data; });;
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

  private getBaseApiUrl(): string {
    return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
