export interface DrugData{
  drug_id: number;
  name: string;
  code: string;
  description: string;
  createdBy: number;
  created_date: number;

}


export interface DoseFrequencyData{
  drug_frequency_id: number;
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;

}


export interface UnitData{
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;

}

export interface MedicationLine{
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;

}

export interface RegimenCombo{
  regimencombo_id: number;
  name: string;
  dosage: string;
  medicationline_id: number;
  drug_frequency_id: number;
  created_by: number;
  created_date: Date;

}

export interface MedicationLineRegimen{
  medicationline_id: number;
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: Date;
  regimen: RegimenCombo[];

}

export interface ARVDosage{
  tablet_no: number;
  drugdispensepattern_id: number;
  name: string;
  
}
