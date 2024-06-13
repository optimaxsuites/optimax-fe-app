import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { LaboratoryTestData, LaboratoryTesttypeData } from '../domain/laboratorytest.data';
import { environment } from '../../../environments/environment';
import { GenderData, RelationshipData, ReligionData } from '../../administration/domain/gender.data';
import { MaritalStatusData } from '../domain/gender.data';
import { OccupationData } from '../domain/occupation.data';
import { QualificationData } from '../domain/occupation.data';
import { HeirarchyUnitsData } from '../domain/heirarchyunits.data';
import { AssessmentQuestions, AssessmentType } from '../domain/assessments.data';
import { SeverityData } from 'src/app/administration/domain/allergies.data';
import { StatusTypeData } from '../domain/status.data';
import { DiagnosisConditionsData } from 'src/app/administration/domain/diagnosisconditions.data';
import { LanguageData } from 'src/app/administration/domain/gender.data';
import { RefferedfromData } from 'src/app/administration/domain/targetgroup.data';
import { TargetGroupData } from '../domain/targetgroup.data';
import { CareEntryPointData } from '../domain/targetgroup.data';
import { HeirarchyData } from '../domain/heirarchy.data';
import { ProgramsData, ProgramStageData } from '../domain/programs.data';
import { DrugData, DoseFrequencyData, UnitData } from 'src/app/administration/domain/drug.data';
import { LaboratoryInfoData } from '../domain/consultation.data';
import { SpecimenTypeData, SpecimenCollectionModeData } from 'src/app/administration/domain/specimentype.data';
import { UserRoleData } from '../domain/user.role.data';
import { ImplementingPartnersData } from '../domain/implementing-partners.data';
import { NationalityData, StatesData, LocalGovernmentAreasData} from '../domain/nationality.data';




@Injectable({
  providedIn: 'root'
})
export class MetadataConfigService {

  constructor(private http: HttpClient) { }

  getGenderList(): Observable<any>{
     return this.http.get<GenderData[]>(`${environment.apiBaseUrl}`+'listgenders');

  }
  getRelationshipList(): Observable<any>{
    return this.http.get<RelationshipData[]>(`${environment.apiBaseUrl}`+'listrelationships');

 }


  getHeirarchyList(): Observable<any>{
    return this.http.get<HeirarchyData[]>(`${environment.apiBaseUrl}`+'listheirarchies');

 }

  getLanguageList(): Observable<any>{
    return this.http.get<LanguageData[]>(`${environment.apiBaseUrl}`+'listlanguages');

 }
 getPriorArtList(): Observable<any>{
  return this.http.get<LanguageData[]>(`${environment.apiBaseUrl}`+'listpriorart');

}

 getRefferedfromList(): Observable<any>{
  return this.http.get<RefferedfromData[]>(`${environment.apiBaseUrl}`+'listreferredfrom');

}

  getReligionList(): Observable<any>{
    return this.http.get<ReligionData[]>(`${environment.apiBaseUrl}`+'listreligions');

 }
  getStatusTypeList(): Observable<any>{
    return this.http.get<StatusTypeData[]>(`${environment.apiBaseUrl}`+'liststatustype');

 }

  getMaritalStatusList(): Observable<any>{
    return this.http.get<MaritalStatusData[]>(`${environment.apiBaseUrl}`+'listmaritalstatus');

 }

 getLaboratoryTestType(): Observable<any>{
  return this.http.get<LaboratoryTesttypeData[]>(`${environment.apiBaseUrl}`+'listlaboratorytesttype');

}

getLaboratoryTest(): Observable<any>{
  return this.http.get<LaboratoryTestData[]>(`${environment.apiBaseUrl}`+'listlaboratorytests');

}

 getOccupationList(): Observable<any>{
  return this.http.get<OccupationData[]>(`${environment.apiBaseUrl}`+'listoccupations');

}


getProgramsList(): Observable<any>{
  return this.http.get<ProgramsData[]>(`${environment.apiBaseUrl}`+'listprograms');

}

getProgramstageList(): Observable<any>{
  return this.http.get<ProgramStageData[]>(`${environment.apiBaseUrl}`+'listprogramstages');

}

getQualificationList(): Observable<any>{
  return this.http.get<QualificationData[]>(`${environment.apiBaseUrl}`+'listqualifications');

}

getTargetGroupList(): Observable<any>{
  return this.http.get<TargetGroupData[]>(`${environment.apiBaseUrl}`+'listtargetgroups');

}

getCareEntryPointList(): Observable<any>{
  return this.http.get<CareEntryPointData[]>(`${environment.apiBaseUrl}`+'listcareentrypoint');

}

getHeirarchyUnitsList(): Observable<any>{
  return this.http.get<HeirarchyUnitsData[]>(`${environment.apiBaseUrl}`+'listheirarchyunits');

}
getHeirarchyUnitsListById(id: number): Observable<any>{

  return this.http.get<HeirarchyUnitsData[]>(`${environment.apiBaseUrl}`+'listheirarchyunitsbyparentid?parentid='+id);

}

getSeverityList(): Observable<any>{
  return this.http.get<SeverityData[]>(`${environment.apiBaseUrl}`+'listseverity');

}

getDrugList(): Observable<any>{
  return this.http.get<DrugData[]>(`${environment.apiBaseUrl}`+'listdrugs');

}
getStatesList(): Observable<any>{
  return this.http.get<StatesData[]>(`${environment.apiBaseUrl}`+'liststates');

}

getLocalGovernmentList(): Observable<any>{
  return this.http.get<LocalGovernmentAreasData[]>(`${environment.apiBaseUrl}`+'listlga');

}

getNationalityList(): Observable<any>{
  return this.http.get<NationalityData[]>(`${environment.apiBaseUrl}`+'listnationalities');

}

getUserRoleList(): Observable<any>{
  return this.http.get<UserRoleData[]>(`${environment.apiBaseUrl}`+'listuserroles');

}

getImplementingPartnersList(): Observable<any>{
  return this.http.get<ImplementingPartnersData[]>(`${environment.apiBaseUrl}`+'listimplementingpartners');

}

getFrequencyList(): Observable<any>{
  return this.http.get<DoseFrequencyData[]>(`${environment.apiBaseUrl}`+'listdrugfrequency');

}

getUnitList(): Observable<any>{
  return this.http.get<UnitData[]>(`${environment.apiBaseUrl}`+'listdrugunits');

}

getDiagnosisConditionsList(): Observable<any>{
  return this.http.get<DiagnosisConditionsData[]>(`${environment.apiBaseUrl}`+'listdiagnosisconditions');

}

getAssessmentTypeList(): Observable<any>{
  return this.http.get<AssessmentType[]>(`${environment.apiBaseUrl}`+'listassessmenttype');
}

getSpecimenTypeList(): Observable<any>{
  return this.http.get<SpecimenTypeData>(`${environment.apiBaseUrl}`+'listspecimentypes');
}

getSpecimenCollectionModeList(): Observable<any>{
  return this.http.get<SpecimenCollectionModeData[]>(`${environment.apiBaseUrl}`+'listspecimencollectionmodes');
}

getAssessmentQuestionList(): Observable<any>{
  return this.http.get<AssessmentQuestions[]>(`${environment.apiBaseUrl}`+'listassessmentquestions');

}

getLocalGovernmentAreasList(): Observable<any>{
  return this.http.get<LocalGovernmentAreasData[]>(`${environment.apiBaseUrl}`+'listLocalGovernmentAreas');

}


  }
