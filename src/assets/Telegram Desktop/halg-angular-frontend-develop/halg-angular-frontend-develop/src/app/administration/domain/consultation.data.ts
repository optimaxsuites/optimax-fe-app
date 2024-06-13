import { Time } from '@angular/common';
import {LaboratoryTestData, LaboratoryTesttypeData} from  'src/app/administration/domain/laboratorytest.data'

export interface InvestigationData{
    onset_date: number;
    severity_id: number;
    severity_name: string;
    diagnosed_condition_id: number;
    diagnosisconditions_name: string;
    clinical_note: string;
    diagnosed_by_id: number;
    diagnosed_date: number;
    client_unique_identifier: string;

}

export interface PharmacyInfoData{
  userId: string;
    drug_id: number;
    clinical_drug_prescription_id: number;
    drug_name: string;
    dose: number;
    
    drug_frequency_id: number;
    drug_unit_id:   number;
    prescription_note: string;
    prescription_date: Date;
    prescribed_by_id: number;
    client_unique_identifier: string;
    //pharmarcyInfo: PharmaciesData[];

}
export interface ARVDisenseInfoData{
      created_by: string;
      created_date: number;
      arv_pick_up_date: number;
      dispensed_regimen: string;
      dosage: string;
      next_arv_pick_up_date: number;
      
  
  }

export interface LaboratoryInfoData{
    laboratory_test_id: number;
    laboratory_test_type_id: number;
    clinical_lab_test_id: number;
    test_name: number;
    test_type: number;
    laboratory_ordered_number:string;
    laboratory_test_note: string;
    laboratory_test_status: string;
    ordered_date: number;
    ordered_by_id: number;
    client_unique_identifier:string;
    laboratorytest: LaboratoryTestData[];
    laboratorytesttype:LaboratoryTesttypeData[];
    verified_date: number;
    confirm_sample_id: number;
    clinical_lab_test_result_id: number;
}

export interface VitalSignData{
    height:number;
    respiratory_rate:number;
    clinical_vital_signs_id: number;
    pulse:number;
    temperature:number;
    weight:number;
    systolic:number;
    diastolic:number;
    client_unique_identifier:string;
    created_date:Date;
    created_by: number;
}


export interface AllergysData{
    clinical_allergies_id: number;
    allergy_id: number;
    client_unique_identifier: string;
    allergen_id: number;
    observation: string;
    severity_id: number;
    created_date: number;
    created_by: number;
    symptoms: string;

}





