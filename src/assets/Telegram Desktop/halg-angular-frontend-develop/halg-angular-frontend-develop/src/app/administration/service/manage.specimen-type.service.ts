import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { SpecimenTypeData, SpecimenCollectionModeData } from '../domain/specimentype.data';
import { environment } from '../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ManageSpecimenTypeService {

  constructor(private http: HttpClient) { }

  createSpecimenType(data): Observable<any>{
    console.log(data);
    return this.http.post<SpecimenTypeData>(this.getBaseApiUrl()+'postspecimentypes',data);
  }

  getSpecimenTypes():Observable<any>{
    return this.http.get<SpecimenTypeData>(this.getBaseApiUrl()+'listspecimentypes');
  }


// Specimen Collection Mode

createSpecimenCollectionMode(data): Observable<any>{
  console.log(data);
  return this.http.post<SpecimenCollectionModeData>(this.getBaseApiUrl()+'postspecimencollectionmodes',data);
}

getSpecimenCollectionModes():Observable<any>{
  return this.http.get<SpecimenCollectionModeData>(this.getBaseApiUrl()+'listspecimencollectionmodes');
}

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


