export interface ClientExtendedInfo{
  lga_id: number;
  nationality_id: number;
  state_id: number;
  selectedNationality: any;
  selectedState: any;
  dateRegistration: Date;
  dateBirth: Date;
  firstname: string;
  surname: string;
  patientId:  number;
  otherNames: string;
  maidenname?: string
  marital_status_id: string;
  gender_id: string;
  email: string;
  address: string;
  phone_number: number;
  alt_phone_number: number;
  occupation_id: string;
  qualification_id: string;
  facility_name: string;
  facility_id: number;
  language_id: number;
  referred_from: string;
  nationality: string;
  state_of_origin: string;
  lga: string;
  userId: number;
  hospitalNum: string;
 

 next_of_kin_surname: string;
  next_of_kin_firstname: string;
  next_of_kin_othername: string;
  next_of_kin_gender: string;
  next_of_kin_phone_number: number;
  next_of_kin_alt_phone_number: number;
  next_of_kin_address: string;
  next_of_kin_relationship: string;
  next_of_kin_occupation: string;
}

export interface ClientVisit{
  clinical_service_id: number;
  date_of_first_visit: number;
  date_of_last_visit: number;
  client_unique_identifier: string;
  clinical_stages_id: number;
  functional_status_id: number;
  tb_status_id: number;
  weight: number;
  height: number;
  pregnancy_status_id: number;
  systolic: string;
  diastolic: string;
  oppotunistic_infection_id: number;
  adherence_id: number;
  clinical_note: string;
  adversed_reaction_screened: Boolean;
  created_by: number;
  created_date: number;

}


