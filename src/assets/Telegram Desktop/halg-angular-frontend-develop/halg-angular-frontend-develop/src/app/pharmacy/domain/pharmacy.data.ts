

export interface PharmacyData{
     client_unique_identifier: string;
     clinical_drug_prescription_id: number;
     userId: string;
    client_code: string;
    firstname: string;
    surname: string;
    otherNames: string;
    presciption_date: Date;
    total_prescribed: number;
    total_dispensed: number;
    email: string;
    address: string;
    phone_number: number;
    alt_phone_number: number;
    occupation_id: number;
    clinicalregistration
    
}

export interface PharmacyDataExt{
    order_date: Date;
    next_refill_date: Date;

}

export interface DrugFillDuration{
    name: string;
    value: number;

}

export interface DrugDispenseData{
    clinical_drug_prescription_id: number;
    drug_id: number;
    drug_dispensed: boolean;
    dispensed_note: string;
  
  dispensed_by: number;
  dispensed_date: number

}
