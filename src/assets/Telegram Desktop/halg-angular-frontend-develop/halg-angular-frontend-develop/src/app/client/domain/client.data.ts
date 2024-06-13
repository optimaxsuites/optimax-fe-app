export interface PersonalData{
  client_code: string;
  dateRegistration: Date;
  dateBirth: Date;
  firstname: string;
  lastname: string;
  otherNames: string;
  maidenname?: string
  marital_status_id: number;
  marital_status_name: string;
  gender_id: number;
  gender_name: string;
  email: string;
  address: string;
  phone_number: number;
  hospitalNum: string;
  alt_phone_number: number;
  occupation_id: number;
  occupation_name: string;
  qualification_id: number;
  qualification_name: string;
  facility_name: string;
  facility_id: number;
  language_id: number;
  language_name: string;
  referred_from: number;
  referred_from_name: string;
  nationality_id: number;
  target_group_id: number;
  target_group_name: string;
 

  reffered_from_id: number;
  nationality: string;
  state_of_origin: string;
  religion_id: number;
  religion_name: string;
  lga: string;
  userId: number;
  implementing_partner_code: string;

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

export interface NextofKinData{

  surname: string;
  firstname: string;
  othername: string;
  gender: string;
  phone_number: number;
  alt_phone_number: number;
  address: string;
  relationship: string;
  occupation: string;
}

