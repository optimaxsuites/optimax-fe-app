import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { TargetGroupData, CareEntryPointData, RefferedfromData, DisabilityData } from '../domain/targetgroup.data';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ManageTargetgroupService {

  constructor(private http: HttpClient) { }

createTargetgroup(data): Observable<any>{
    console.log(data);
    return this.http.post<TargetGroupData>(this.getBaseApiUrl()+'posttargetgroups',data);
  }

  getTargetgroups():Observable<any>{
    return this.http.get<TargetGroupData>(this.getBaseApiUrl()+'listtargetgroups');
  }

  // Care Entry Point

  createCareEntryPoint(data): Observable<any>{
    console.log(data);
    return this.http.post<CareEntryPointData>(this.getBaseApiUrl()+'postcareentrypoint',data);
  }

  getCareEntryPoints():Observable<any>{
    return this.http.get<CareEntryPointData>(this.getBaseApiUrl()+'listcareentrypoint');
  }

  //Refferred From

  createRefferedfrom(data): Observable<any>{
    console.log(data);
    return this.http.post<RefferedfromData>(this.getBaseApiUrl()+'postreferredfrom',data);
  }

  getRefferedfroms():Observable<any>{
    return this.http.get<RefferedfromData>(this.getBaseApiUrl()+'listreferredfrom');
  }


  // Disability

  createDisability(data): Observable<any>{
    console.log(data);
    return this.http.post<DisabilityData>(this.getBaseApiUrl()+'postdisabilities',data);
  }

  deleteDisability(data): Observable<any> {
    return this.http.delete<DisabilityData[]>(this.getBaseApiUrl()+'removedisabilities'+data);
   }

   getDisabilitys():Observable<any>{
    return this.http.get<DisabilityData>(this.getBaseApiUrl()+'listdisabilities');
  }

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }

}


