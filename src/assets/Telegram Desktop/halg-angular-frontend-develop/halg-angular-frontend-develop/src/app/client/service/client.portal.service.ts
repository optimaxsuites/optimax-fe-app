import { Inject, Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { ClientExtendedInfo } from '../domain/client.portal.data';
import { PersonalData } from '../domain/client.data';
import {LaboratoryTestData, LaboratoryTesttypeData} from  'src/app/administration/domain/laboratorytest.data'
import { ProgramsData, ProgramStageData } from 'src/app/administration/domain/programs.data';
import { InvestigationData, LaboratoryInfoData, PharmacyInfoData, VitalSignData } from 'src/app/administration/domain/consultation.data';
import { CareEntryPointData } from 'src/app/administration/domain/targetgroup.data';
import { NextofKinData } from '../domain/client.data';
import { AllergensData } from 'src/app/administration/domain/allergies.data';
import { TreeNode } from 'primeng/api';
import {  ResultData } from 'src/app/laboratory/domain/laboratory.data';




@Injectable({
  providedIn: 'root'
})
export class ClientPortalService {
  public selectedClients: ClientExtendedInfo;
  public selectedTest: LaboratoryTestData;
  public selectedClientInformation: ClientExtendedInfo;
  public  selectedPharmacy: PharmacyInfoData;
  public clientExtInfoService: ClientExtendedInfo[]=[];
  public clientUniqueIdentifier: string[]=[];
  public clinicalRegistrationCount: number = 0;
  public clinicalProgramCount: number;
  public clientClinicalPrograms: any[];
  public rootFromService: TreeNode[]
  public selectedTab: any;
  public clientclinicservices: any[] = [];
  public clinicalservices_as_is: any[] = [];
  public selectedClinicClient: any;
  //personaldataservice: PersonalData;
  //nextofkindataservice: NextofKinData;

  //personaldata = {} as PersonalData
  nextofkindata: any[];
  laboratoryData: any[];

  

  constructor(private http: HttpClient) { }

getImportData(url: string): Observable<any>{
  return this.http.get<any>(`${environment.apiLamisBaseUrl}`+url);
}

getClinicalServices():Observable<any>{
  return this.http.get<any>(this.getBaseApiUrl()+'listclinicalservices').pipe(catchError(this.handleError));
}
getClinicalServicesByPeriod(periodInDays: number):Observable<any>{
  return this.http.get<any>(this.getBaseApiUrl()+'listclinicalservicesbyperiod?periodInDays='+periodInDays).pipe(catchError(this.handleError));
}

getClinicalServicesByClient(client_unique_identifier: string): Observable<any> {
  return this.http.get<ClientExtendedInfo>(`${environment.apiBaseUrl}` + 'listclinicalservicesbyclient?client_unique_identifier='+client_unique_identifier).pipe(catchError(this.handleError));
}
  getClientExtendedInfo(periodInDays: number): Observable<any> {
    return this.http.get<ClientExtendedInfo>(`${environment.apiBaseUrl}` + 'listclinicalregistrationsbydays?periodInDays='+periodInDays).pipe(catchError(this.handleError));
  }

  getDistinctClientUniqueIdentifier(): Observable<any> {
    return this.http.get<string>(`${environment.apiBaseUrl}` + 'listdistinctclientuniqueidentifier').pipe(catchError(this.handleError));
  }


  getClientInfoByHospitalNum(hospitalNum: string): Observable<any> {
    return this.http.get<ClientExtendedInfo>(`${environment.apiBaseUrl}` + 'listclinicalregistrationsbyhospitalnum?hospitalNum='+hospitalNum).pipe(catchError(this.handleError));
  }

  getClinicalRegistrationsCount(): Observable<any> {
    return this.http.get<number>(`${environment.apiBaseUrl}` + 'listclinicalregistrationscount').pipe(catchError(this.handleError));
  }

  getClientClinicalPrograms(): Observable<any> {
    return this.http.get<number>(`${environment.apiBaseUrl}` + 'listclinicalclientprograms').pipe(catchError(this.handleError));
  }

  getClientClinicalProgramsByClientId(client_unique_identifier: string): Observable<any> {
    return this.http.get<number>(`${environment.apiBaseUrl}` + 'listclinicalclientprogramsbyclientuniqueidentifier?clientUniqueIdentifier=' +client_unique_identifier).pipe(catchError(this.handleError));
  }

  getHTSActivityTrackerByClientId(client_unique_identifier: string): Observable<any> {
    return this.http.get<number>(`${environment.apiBaseUrl}` + 'listhtsactivitiytrackerclientuniqueidentifier?clientUniqueIdentifier=' +client_unique_identifier).pipe(catchError(this.handleError));
  }

  NextHTSActivity(data): Observable<any> {
    return this.http.post<any[]>(this.getBaseApiUrl() + 'posthtsactivitiytracker', data);
  }

  createInvestigation(data): Observable<any> {
    return this.http.post<InvestigationData[]>(this.getBaseApiUrl() + 'postclinicaldiagnosis', data);
  }
  createAllergies(data): Observable<any> {
    return this.http.post<AllergensData[]>(this.getBaseApiUrl() + 'postclinicalallergies', data);
  }

  getAllergies(client_unique_identifier: string): Observable<any> {
    return this.http.get<AllergensData[]>(this.getBaseApiUrl() + 'listclinicalallergies?client_unique_identifier=' + client_unique_identifier);
  }

  getInvestigation(client_unique_identifier: string): Observable<any> {
    return this.http.get<InvestigationData[]>(this.getBaseApiUrl() + 'listclinicaldiagnosis?client_unique_identifier=' + client_unique_identifier);
  }

  createlabLaboratory(data): Observable<any> {
    return this.http.post<LaboratoryInfoData[]>(this.getBaseApiUrl() + 'postclinicallabtests', data);
  }

  createPrescription(data): Observable<any> {
    return this.http.post<PharmacyInfoData[]>(this.getBaseApiUrl() + 'postclinicaldrugprescription', data);
  }


  getPrescription(hospital_number: string): Observable<any> {
    return this.http.get<PharmacyInfoData[]>(this.getBaseApiUrl() + 'listclinicaldrugprescription?client_unique_identifier=' + hospital_number);
  }

  getLaboratory(hospital_number: string): Observable<any> {
    return this.http.get<LaboratoryInfoData[]>(this.getBaseApiUrl() + 'listclinicallabtests?client_unique_identifier=' + hospital_number);
  }

  getVitalSign(hospital_number: string): Observable<any> {
    return this.http.get<VitalSignData[]>(this.getBaseApiUrl() + 'listclinicalvitalsigns?client_unique_identifier=' + hospital_number);
  }

  createVitalSign(data): Observable<any> {
    return this.http.post<VitalSignData>(this.getBaseApiUrl() + 'postclinicalvitalsigns', data);
  }

  getTests():Observable<any>{
    return this.http.get<LaboratoryTestData[]>(this.getBaseApiUrl()+'listtest');
  }
  // getTests():Observable<any>{
  //   return this.http.get<TestData[]>(this.getBaseApiUrl()+'listlaboratorytests');
  // }

  getProgramStages():Observable<any>{
    return this.http.get<ProgramStageData[]>(this.getBaseApiUrl()+'listprogramstage');
  }

  getLaboratoryResult(laboratory_test_id: number): Observable<any> {
    return this.http.get<ResultData[]>(this.getBaseApiUrl() + 'listclinicallabtestresults?testId=' + laboratory_test_id);
  }


  getClientExtendedInfox(params) {
    return this.http.get<any>(this.getBaseApiUrl() + 'listclinicalregistrations', {params: params})
    .toPromise();
   // .then(res => <ClientExtendedInfo[]> res.data)
   // .then(data => { return data; });;
  }

  getFingerPrintCapture(){
    return this.http.get<any>(this.getBaseApiUrl()+'enroluserbiometric?client_unique_identifier')
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

year: number=0; month: number=0; days: number=0;
getDateIn(fromdate: Date, todate){
 if(todate) todate= new Date(todate);
 else todate= new Date();

 var age= [], fromdate= new Date(fromdate),
 y= [todate.getFullYear(), fromdate.getFullYear()],
 ydiff= y[0]-y[1],
 m= [todate.getMonth(), fromdate.getMonth()],
 mdiff= m[0]-m[1],
 d= [todate.getDate(), fromdate.getDate()],
 ddiff= d[0]-d[1];

 if(mdiff < 0 || (mdiff=== 0 && ddiff<0))--ydiff;
 if(mdiff<0) mdiff+= 12;
 if(ddiff<0){
     fromdate.setMonth(m[1]+1, 0);
     ddiff= fromdate.getDate()-d[1]+d[0];
     --mdiff;
 }
 if(ydiff > 0) this.year=ydiff;
 if(mdiff> 0) this.month=mdiff;
 if(ddiff> 0) this.days=ddiff;

 return {
   "year": this.year,
   "month": this.month,
   "days": this.days
 }

}


}
