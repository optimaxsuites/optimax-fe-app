import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PharmacyData, DrugDispenseData } from '../domain/pharmacy.data';
import { ClientExtendedInfo } from 'src/app/client/domain/client.portal.data';
import {  PharmacyInfoData, } from 'src/app/administration/domain/consultation.data';



@Injectable({
  providedIn: 'root'
})
export class ManagePharmacyService {
  public pharmarcyInfoService: PharmacyData[]=[];

  public papi: number;
  public selectedClients: PharmacyData;

  constructor(private http: HttpClient) { }

  getPharmacyExtendedInfo(userId: string): Observable<any>{
    return this.http.get<PharmacyData>(this.getBaseApiUrl() + 'listdrugsprescribed?userId=' + userId);
  }

  getPharmarcyInfo(hospital_number: string): Observable<any> {
    return this.http.get<PharmacyData[]>(this.getBaseApiUrl() + 'listclinicaldrugprescription?client_unique_identifier=' + hospital_number);
  }

  postDispenseDrug(data): Observable<any> {
    return this.http.post<DrugDispenseData>(this.getBaseApiUrl() + 'postclinicaldrugdispensing', data);
  }

  getDispenseDrug(drug_id: string): Observable<any> {
    return this.http.get<DrugDispenseData[]>(this.getBaseApiUrl() + 'listclinicaldrugprescription?drugId=' + drug_id);
  }
    private getBaseApiUrl(): string {
      return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
      }

  }



