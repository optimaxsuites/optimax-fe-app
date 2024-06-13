export interface LaboratoryData {
  client_unique_identifier: string;
  userId: string;
  prescription_date: Date;
  //ordered_date:Date;
  //ordered_By:number;
  prescribed_by_id: number;
  total_Ordered: number;
  total_done: number;
  total_pending: number;
  testtype_id: number;
  testtype: {};
  test: [];
  test_id: number;
  client_code: string;
  firstname: string;
  surname: string;
  otherNames: string;
  email: string;
  address: string;
  occupation_id: number;
  phone_number: number;
  alt_phone_number: number;
  laboratory_test_id: number;
}


export interface SpecimenData {
  collected_by: number;
  collected_date: number;
  //verified_date: number;
  //confirm_sample_id: string
  clinical_lab_test_id: number;
  specimen_collection_mode_id: number;
  laboratory_test_id: number;
  specimen_type_id: number;
  specimen_number: number;
  specimen_note: string;
}

export interface LaboratoryResultData {
  laboratory_result_id: number;
  collected_by: number;
  result_date: number;
  verified_date: number;
  laboratory_result: string;
  result_note: string;
}



export interface ResultData {
  clinical_lab_test_id: number;
  clinical_lab_test_result_id: number;
  lab_test_result: string;
  lab_result_note: string;
  reported_by: number;
  created_date: number;
  laboratory_result: string;
  result_note: string;
  test_id: number;
}

export interface ResultVerificationData {
  clinical_lab_test_result_id: number;
  result_verified: boolean;
  verification_note: string;
  verified_by: number;
  verified_date: number;
 // laboratory_test_id: number;
}




