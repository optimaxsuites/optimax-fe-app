import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { DataTypeData } from '../domain/dataType.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageDataTypeService {

  constructor(private http: HttpClient) { }

  createDataType(data): Observable<any>{
    console.log(data);
    return this.http.post<DataTypeData>(this.getBaseApiUrl()+'postdatatype',data);
  }

  getDataTypes():Observable<any>{
    return this.http.get<DataTypeData>(this.getBaseApiUrl()+'listdatatype');
  }



protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}



