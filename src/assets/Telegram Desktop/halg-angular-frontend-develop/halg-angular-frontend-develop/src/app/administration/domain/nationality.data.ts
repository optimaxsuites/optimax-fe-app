export interface NationalityData{
  nationality_id: number;
    name: string;
    code: string;
    description: string;
    created_by: number;
    created_date: Date;
    state: StatesData[];

}

export interface StatesData{
  nationality_id: number;
  name: string;
  code: string;
  state_id: number;
  description: string;
  created_by: number;
  created_date: number;
  localgovernmentarea: LocalGovernmentAreasData[];

}

export interface LocalGovernmentAreasData{
  state_id: number;
  local_government_area_id: number;
  name: string;
  code: string;
  description: string;
  created_by: number;
  created_date: number;

}
 