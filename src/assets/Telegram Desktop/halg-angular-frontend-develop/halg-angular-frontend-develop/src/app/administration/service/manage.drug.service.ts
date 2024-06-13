import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { DrugData, DoseFrequencyData, UnitData, MedicationLine, RegimenCombo } from '../domain/drug.data';
import { environment } from '../../../environments/environment';
import { dataBinding } from '@syncfusion/ej2-angular-schedule';


@Injectable({
  providedIn: 'root'
})
export class ManageDrugService {

  constructor(private http: HttpClient) { }
  
  getImportDatac(url: string): Observable<any>{
    return this.http.get<any>(`${environment.apiLamisBaseUrl}`+url,{
      headers: new HttpHeaders({
        'Content-Type':  'application/json',
        'Access-Control-Allow-Origin':'*',
        'Access-Control-Allow-Methods' : 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers' : 'Origin, Content-Type, Accept'
      })
    });
  }

  getImportData(url: string): Observable<any>{
    return this.http.get<any>(`${environment.apiLamisBaseUrl}`+url);
  }
 
  

  createDrug(data): Observable<any>{
    return this.http.post<DrugData>(this.getBaseApiUrl()+'postdrugs',data);
  }

  getDrugs():Observable<any>{
    return this.http.get<DrugData>(this.getBaseApiUrl()+'listdrugs');
  }



  // Dose Frequency Methods
  createDoseFrequency(data): Observable<any>{
    return this.http.post<DoseFrequencyData>(this.getBaseApiUrl()+'postdrugfrequency',data);
  }

  getDoseFrequencys():Observable<any>{
    return this.http.get<DoseFrequencyData>(this.getBaseApiUrl()+'listdrugfrequency');
  }

  // Unit Methods

  createUnit(data): Observable<any>{
    return this.http.post<UnitData>(this.getBaseApiUrl()+'postdrugunits',data);
  }

  getUnits():Observable<any>{
    return this.http.get<UnitData>(this.getBaseApiUrl()+'listdrugunits');
  }

  createMedicationLine(data): Observable<any>{
    return this.http.post<MedicationLine>(this.getBaseApiUrl()+'postmedicationline',data);
  }

  getMedicationLine():Observable<any>{
    return this.http.get<MedicationLine>(this.getBaseApiUrl()+'listmedicationline');
  }

  createRegimenCombo(data): Observable<any>{
    return this.http.post<RegimenCombo>(`${environment.apiBaseUrl}`+'postregimencombo',data);
  }

  getRegimenCombo():Observable<any>{
    return this.http.get<RegimenCombo>(`${environment.apiBaseUrl}`+'listregimencombo');
  }

  createARVDrugDispense(data): Observable<any>{
    return this.http.post<any>(`${environment.apiBaseUrl}`+'postarvdrugdispense',data);
  }

  getARVDrugDispense():Observable<any>{
    return this.http.get<any>(`${environment.apiBaseUrl}`+'listarvdrugdispense');
  }
  getARVDrugDispenseByClient(client_unique_identifier):Observable<any>{
    return this.http.get<any>(`${environment.apiBaseUrl}`+'listarvdrugdispensebyclient?client_unique_identifier='+client_unique_identifier);
  }

protected getBaseApiUrl(): string {
  return isDevMode ? environment.apiBaseUrl : environment.apiBaseUrl;
  }
}


