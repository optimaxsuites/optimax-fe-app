import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { LaboratoryTestData, LaboratoryTesttypeData } from '../domain/laboratorytest.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageLaboratoryTestService {
  public selectedLaboratoryTest: LaboratoryTestData;

  constructor(private http: HttpClient) { }

  createLaboratoryTest(data): Observable<any>{
    console.log(data);
    return this.http.post<LaboratoryTestData>(this.getBaseApiUrl()+'postlaboratorytests',data);
  }

  getLaboratoryTests():Observable<any>{
    return this.http.get<LaboratoryTestData[]>(this.getBaseApiUrl()+'listlaboratorytests');
  }


// Laboratorty Test Type Methods
createLaboratoryTesttype(data): Observable<any>{
  console.log(data);
  return this.http.post<LaboratoryTesttypeData>(this.getBaseApiUrl()+'postlaboratorytesttype',data);
}

getLaboratoryTesttypes():Observable<any>{
  return this.http.get<LaboratoryTesttypeData[]>(this.getBaseApiUrl()+'listlaboratorytesttype');
}

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}
